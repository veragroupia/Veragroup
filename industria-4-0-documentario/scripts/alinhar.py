#!/usr/bin/env python3
"""
Alinha o roteiro (texto real falado) com as gravações dos integrantes e grava src/data/tempos.json.

Para cada capítulo com public/audio/vozes/0N-nome.wav:
  1. transcreve a gravação localmente com faster-whisper (gratuito, roda no computador),
     obtendo o momento de cada palavra reconhecida;
  2. compara palavra por palavra com o texto do roteiro (o roteiro é a referência das legendas);
  3. calcula início e fim de cada frase e de cada palavra do roteiro;
  4. marca como NÃO CONFIÁVEL toda frase em que poucas palavras foram reconhecidas,
     para revisão manual (src/data/ajustes-manuais.json).

Depois disso, o Remotion recalcula sozinho a duração das cenas e o momento de cada animação.

Instalação (uma vez):  pip install faster-whisper
Uso:                   python3 scripts/alinhar.py [--modelo small|medium|large-v3]
Teste da lógica:       python3 scripts/alinhar.py --teste
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ROTEIRO = RAIZ / "src/data/roteiro.json"
TEMPOS = RAIZ / "src/data/tempos.json"
AJUSTES = RAIZ / "src/data/ajustes-manuais.json"
RELATORIO = RAIZ / "out/relatorio-alinhamento.txt"
LIMIAR_CONFIANCA = 0.7


def normalizar(s: str) -> str:
    """Mesma normalização de src/data/linhaDoTempo.ts."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def alinhar_capitulo(frases: list[str], reconhecidas: list[dict]) -> list[dict]:
    """
    frases: textos do roteiro. reconhecidas: [{'t': palavra, 'inicio': s, 'fim': s}, ...] (ordem temporal).
    Retorna, para cada frase, {'inicio','fim','confiavel','palavras':[{'t','inicio','fim'}]} com UMA entrada
    por palavra do texto (separada por espaço), na mesma ordem — formato usado pelo Remotion.
    """
    # subtokens do roteiro (ex.: "4.0" vira "4","0") ligados à palavra de origem
    script_sub, script_dono = [], []
    palavras_script = []  # (frase, texto)
    for fi, frase in enumerate(frases):
        for w in frase.split(" "):
            idx = len(palavras_script)
            palavras_script.append((fi, w))
            for sub in normalizar(w).split(" "):
                if sub:
                    script_sub.append(sub)
                    script_dono.append(idx)
    rec_sub, rec_t = [], []
    for r in reconhecidas:
        subs = [x for x in normalizar(r["t"]).split(" ") if x]
        if not subs:
            continue
        passo = (r["fim"] - r["inicio"]) / len(subs)
        for k, sub in enumerate(subs):
            rec_sub.append(sub)
            rec_t.append((r["inicio"] + k * passo, r["inicio"] + (k + 1) * passo))

    tempos = [None] * len(palavras_script)
    casadas = [False] * len(palavras_script)
    sm = difflib.SequenceMatcher(None, script_sub, rec_sub, autojunk=False)
    for bloco in sm.get_matching_blocks():
        for k in range(bloco.size):
            dono = script_dono[bloco.a + k]
            a, b = rec_t[bloco.b + k]
            if tempos[dono] is None:
                tempos[dono] = [a, b]
            else:
                tempos[dono][0] = min(tempos[dono][0], a)
                tempos[dono][1] = max(tempos[dono][1], b)
            casadas[dono] = True

    # palavras não reconhecidas: interpolação pelo tamanho, entre as vizinhas reconhecidas
    n = len(palavras_script)
    fim_audio = rec_t[-1][1] if rec_t else 0.0
    i = 0
    while i < n:
        if tempos[i] is not None:
            i += 1
            continue
        j = i
        while j < n and tempos[j] is None:
            j += 1
        t0 = tempos[i - 1][1] if i > 0 else (rec_t[0][0] if rec_t else 0.0)
        t1 = tempos[j][0] if j < n else fim_audio
        tamanhos = [max(1, len(palavras_script[k][1])) for k in range(i, j)]
        total = sum(tamanhos)
        acc = 0
        for k, tam in zip(range(i, j), tamanhos):
            a = t0 + (t1 - t0) * acc / total
            acc += tam
            tempos[k] = [a, t0 + (t1 - t0) * acc / total]
        i = j

    saida = []
    for fi, frase in enumerate(frases):
        ids = [k for k, (f, _) in enumerate(palavras_script) if f == fi]
        pal = [{"t": palavras_script[k][1], "inicio": round(tempos[k][0], 3), "fim": round(tempos[k][1], 3)} for k in ids]
        taxa = sum(casadas[k] for k in ids) / max(1, len(ids))
        saida.append({
            "inicio": pal[0]["inicio"],
            "fim": pal[-1]["fim"],
            "confiavel": taxa >= LIMIAR_CONFIANCA,
            "reconhecimento": round(taxa, 2),
            "palavras": pal,
        })
    return saida


def duracao_audio(arq: Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(arq)])
    return float(out.decode().strip())


def transcrever(arq: Path, modelo, texto_referencia: str) -> list[dict]:
    segmentos, _ = modelo.transcribe(
        str(arq), language="pt", word_timestamps=True, vad_filter=False,
        initial_prompt=texto_referencia[:800], condition_on_previous_text=True, beam_size=5,
    )
    palavras = []
    for seg in segmentos:
        for w in seg.words or []:
            palavras.append({"t": w.word.strip(), "inicio": float(w.start), "fim": float(w.end)})
    return palavras


def aplicar_ajustes(capitulos: dict) -> list[str]:
    if not AJUSTES.exists():
        return []
    ajustes = json.loads(AJUSTES.read_text(encoding="utf-8"))
    log = []
    for cap_id, por_frase in ajustes.items():
        if cap_id.startswith("_") or cap_id not in capitulos:
            continue
        for idx, v in por_frase.items():
            fr = capitulos[cap_id]["frases"][int(idx)]
            if "inicio" in v:
                fr["inicio"] = v["inicio"]
            if "fim" in v:
                fr["fim"] = v["fim"]
            fr["confiavel"] = True
            fr["ajusteManual"] = True
            fr.pop("palavras", None)  # tempos de palavra deixam de valer após ajuste manual
            log.append(f"capítulo {cap_id}, frase {idx}: ajuste manual aplicado")
    return log


def teste() -> None:
    frases = ["Esse é um exemplo da Indústria 4.0, a chamada quarta revolução industrial.", "Parece ficção científica."]
    rec, t = [], 0.5
    for w in "esse é um exemplo da indústria quatro ponto zero a chamada quarta revolução industrial parece ficção científica".split():
        rec.append({"t": w, "inicio": t, "fim": t + 0.3})
        t += 0.35
    r = alinhar_capitulo(frases, rec)
    assert len(r[0]["palavras"]) == len(frases[0].split(" ")), "uma entrada por palavra do texto"
    assert r[0]["inicio"] == 0.5 and r[1]["inicio"] > r[0]["fim"] - 1e-6, r
    assert all(a["inicio"] <= b["inicio"] for a, b in zip(r[0]["palavras"], r[0]["palavras"][1:])), "tempos crescentes"
    pos = frases[0].split(" ").index("4.0,")
    assert r[0]["palavras"][pos - 1]["fim"] <= r[0]["palavras"][pos]["inicio"] + 1e-6
    print("teste ok:", json.dumps(r[0]["palavras"][4:8], ensure_ascii=False))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--teste", action="store_true")
    args = ap.parse_args()
    if args.teste:
        teste()
        return

    roteiro = json.loads(ROTEIRO.read_text(encoding="utf-8"))
    tempos = json.loads(TEMPOS.read_text(encoding="utf-8")) if TEMPOS.exists() else {"capitulos": {}}
    pendentes = [c for c in roteiro["capitulos"] if (RAIZ / "public" / c["audio"]).exists()]
    if not pendentes:
        print("Nenhuma voz preparada em public/audio/vozes/. Rode antes: node scripts/preparar-vozes.mjs")
        return
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("Instale o reconhecimento de fala local:  pip install faster-whisper")
    modelo = WhisperModel(args.modelo, device="auto", compute_type="int8")

    linhas = []
    for cap in pendentes:
        arq = RAIZ / "public" / cap["audio"]
        frases = [f for p in cap["paragrafos"] for f in p]
        print(f"capítulo {cap['id']}: transcrevendo {arq.name} …")
        rec = transcrever(arq, modelo, " ".join(frases))
        res = alinhar_capitulo(frases, rec)
        dur = duracao_audio(arq)
        tempos["capitulos"][cap["id"]] = {"temAudio": True, "origem": f"whisper:{args.modelo}", "duracao": round(dur, 3), "frases": res}
        linhas.append(f"\nCAPÍTULO {cap['id']} — {cap['narrador']} — {dur:.2f} s")
        for i, (texto, r) in enumerate(zip(frases, res)):
            marca = "ok     " if r["confiavel"] else "REVISAR"
            linhas.append(f"  [{marca}] {i:2d}  {r['inicio']:7.2f} → {r['fim']:7.2f}  ({int(r['reconhecimento'] * 100):3d}%)  {texto}")
    linhas += aplicar_ajustes(tempos["capitulos"])
    TEMPOS.write_text(json.dumps(tempos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    RELATORIO.parent.mkdir(exist_ok=True)
    RELATORIO.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print("\n".join(linhas))
    print(f"\nTempos gravados em {TEMPOS.relative_to(RAIZ)}; relatório em {RELATORIO.relative_to(RAIZ)}")
    print("Frases marcadas REVISAR: confira no Remotion Studio e corrija em src/data/ajustes-manuais.json")


if __name__ == "__main__":
    main()
