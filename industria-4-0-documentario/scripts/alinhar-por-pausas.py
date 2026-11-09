#!/usr/bin/env python3
"""
Alinha o roteiro com as gravações usando as PAUSAS da fala. Alternativa ao alinhar.py quando o
faster-whisper não está disponível. Grava src/data/tempos.json (apenas capítulos com WAV em public/audio/vozes/).

Como funciona
  1. mede o nível do áudio e acha as pausas (silêncios de 0,06 s ou mais, relativos ao volume da fala);
  2. escolhe, entre as pausas, as N-1 que melhor separam as N frases do roteiro: as durações observadas
     devem ser proporcionais ao tamanho de cada frase, e pausas longas são preferidas (programação dinâmica);
  3. VERIFICAÇÃO (opcional, recomendada): reconhece a fala de cada trecho com sherpa-onnx + Whisper e compara
     com o texto da frase e, se houver palavras que caíram do lado errado de uma fronteira (o fim de uma frase
     começando a próxima, ou o contrário), procura a micro-pausa que as separa. Só marca "confiavel" quando pelo menos 60% das palavras da frase aparecem.
     Sem a verificação, nenhuma frase é marcada como confiável.

Limite: o resultado é por FRASE. Não há tempo de palavra; dentro de uma frase, os momentos de destaque são
proporcionais ao texto. Quem tiver o faster-whisper deve preferir scripts/alinhar.py.

Uso:
  python3 scripts/alinhar-por-pausas.py                       # só pausas
  MODELO_SHERPA=/caminho/sherpa-onnx-whisper-small python3 scripts/alinhar-por-pausas.py --verificar
  (modelo: https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models  e  pip install sherpa-onnx)
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import unicodedata
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
ROTEIRO = RAIZ / "src/data/roteiro.json"
TEMPOS = RAIZ / "src/data/tempos.json"
RELATORIO = RAIZ / "out/relatorio-alinhamento.txt"
SR = 16000
MIN_PAUSA = 0.06  # micro-pausas só entram no refinamento; o ponto de partida usa pausas de 0,2 s ou mais
PAUSA_FORTE = 0.2
LIMIAR_CONFIANCA = 0.6


def normalizar(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()


def carregar(arq):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(arq), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def pausas(x):
    h = SR // 100
    n = len(x) // h
    db = 20 * np.log10(np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1)) + 1e-6)
    silencio = db < np.percentile(db, 90) - 14
    lista, i = [], 0
    while i < n:
        if silencio[i]:
            j = i
            while j < n and silencio[j]:
                j += 1
            if (j - i) / 100 >= MIN_PAUSA:
                lista.append((i / 100, j / 100))
            i = j
        else:
            i += 1
    return lista, n / 100


def escolher(textos, cand, ini, fim, mu=0.6):
    """Escolhe len(textos)-1 pausas (de cand) que separam as frases. Retorna lista de índices em cand."""
    N, M = len(textos), len(cand)
    w = np.array([len(t) for t in textos], float)
    r = (fim - ini - (N - 1) * 0.55) / w.sum()  # segundos por caractere, descontadas as pausas de separação

    def custo(a, b, i):  # frase i de a até b
        return (max(b - a, 0.05) - r * w[i]) ** 2

    INF = 1e18
    dp = np.full((N - 1, M), INF)
    ant = np.zeros((N - 1, M), int)
    for j in range(M):
        if cand[j][1] - cand[j][0] < PAUSA_FORTE:
            continue
        dp[0, j] = custo(ini, cand[j][0], 0) - mu * min(cand[j][1] - cand[j][0], 0.9)
    for k in range(1, N - 1):
        for j in range(M):
            if cand[j][1] - cand[j][0] < PAUSA_FORTE:
                continue
            for p in range(j):
                v = dp[k - 1, p] + custo(cand[p][1], cand[j][0], k) - mu * min(cand[j][1] - cand[j][0], 0.9)
                if v < dp[k, j]:
                    dp[k, j], ant[k, j] = v, p
    total = [dp[N - 2, j] + custo(cand[j][1], fim, N - 1) if j < M else INF for j in range(M)]
    j = int(np.argmin(total))
    idx = [j]
    for k in range(N - 2, 0, -1):
        j = ant[k, j]
        idx.append(int(j))
    return idx[::-1]


def reconhecedor():
    import sherpa_onnx

    m = Path(os.environ["MODELO_SHERPA"])
    nome = m.name.replace("sherpa-onnx-whisper-", "")
    return sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(m / f"{nome}-encoder.int8.onnx"), decoder=str(m / f"{nome}-decoder.int8.onnx"),
        tokens=str(m / f"{nome}-tokens.txt"), language="pt", task="transcribe", num_threads=4)


def reconhecer(rec, x):
    s = rec.create_stream()
    s.accept_waveform(SR, x)
    rec.decode_stream(s)
    return s.result.text.strip()


def cobertura(esperado, ouvido):
    a, b = normalizar(esperado).split(), normalizar(ouvido).split()
    if not a:
        return 1.0
    casadas = sum(bl.size for bl in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks())
    return casadas / len(a)


def f1(esperado, ouvido):
    a, b = normalizar(esperado).split(), normalizar(ouvido).split()
    if not a or not b:
        return 0.0
    m = sum(bl.size for bl in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks())
    return 2 * m / (len(a) + len(b))


def parecidas(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.75


def vazamento(ouvido_a, ouvido_b, script_a, script_b):
    """Detecta palavras que caíram do lado errado da fronteira entre duas frases.
    Retorna ('cedo', j) se o trecho da frase A termina com as j primeiras palavras da frase B (fronteira tarde demais),
    ('tarde', j) se o trecho da frase B começa com as j últimas palavras da frase A (fronteira cedo demais) ou None."""
    ha, hb = normalizar(ouvido_a).split(), normalizar(ouvido_b).split()
    sa, sb = normalizar(script_a).split(), normalizar(script_b).split()
    melhor = None
    for j in range(min(8, len(sb) - 1), 0, -1):
        casadas = sum(parecidas(h, w) for h, w in zip(ha[-j:], sb[:j])) if len(ha) >= j else 0
        if casadas >= max(2, -(-j * 7 // 10)) and any(len(w) >= 4 for w in sb[:j]):
            melhor = ("cedo", j)
            break
    for j in range(min(8, len(sa) - 1), 0, -1):
        casadas = sum(parecidas(h, w) for h, w in zip(hb[:j], sa[-j:])) if len(hb) >= j else 0
        if casadas >= max(2, -(-j * 6 // 10)) and any(len(w) >= 4 for w in sa[-j:]):
            if melhor is None or j > melhor[1]:
                melhor = ("tarde", j)
            break
    return melhor


def refinar(rec, x, dur, textos, cand, idx, ini, fim):
    """Ponto de partida: pausas fortes. Só mexe numa fronteira se o reconhecimento mostrar vazamento de palavras
    entre as duas frases; então procura, no sentido certo, a micro-pausa que melhor separa as duas."""
    cache = {}

    def ouvir(a, b):
        k = (round(a, 2), round(b, 2))
        if k not in cache:
            cache[k] = reconhecer(rec, x[int(max(0, a - 0.15) * SR): int(min(dur, b + 0.15) * SR)])
        return cache[k]

    def lim(i, idx):
        a = ini if i == 0 else cand[idx[i - 1]][1]
        b = fim if i == len(textos) - 1 else cand[idx[i]][0]
        return a, b

    def pont(i, idx):
        return f1(textos[i], ouvir(*lim(i, idx)))

    for _ in range(2):
        mudou = False
        for k in range(len(idx)):
            v = vazamento(ouvir(*lim(k, idx)), ouvir(*lim(k + 1, idx)), textos[k], textos[k + 1])
            if not v:
                continue
            sentido, j = v
            lo = idx[k - 1] + 1 if k else 0
            hi = idx[k + 1] - 1 if k + 1 < len(idx) else len(cand) - 1
            centro = sum(cand[idx[k]]) / 2
            base = pont(k, idx) + pont(k + 1, idx)
            melhor = idx[k]
            for c in range(lo, hi + 1):
                d = sum(cand[c]) / 2 - centro
                if c == idx[k] or abs(d) > 3.0 or (sentido == "cedo" and d >= 0) or (sentido == "tarde" and d <= 0):
                    continue
                t = idx[:k] + [c] + idx[k + 1:]
                val = pont(k, t) + pont(k + 1, t)
                if val > base + 0.02:
                    melhor, base = c, val
            if melhor != idx[k]:
                idx[k] = melhor
                mudou = True
        if not mudou:
            break
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--verificar", action="store_true")
    args = ap.parse_args()
    rec = reconhecedor() if args.verificar else None
    roteiro = json.loads(ROTEIRO.read_text(encoding="utf-8"))
    tempos = json.loads(TEMPOS.read_text(encoding="utf-8")) if TEMPOS.exists() else {"capitulos": {}}
    rel = []
    for cap in roteiro["capitulos"]:
        arq = RAIZ / "public" / cap["audio"]
        if not arq.exists():
            continue
        textos = [f for p in cap["paragrafos"] for f in p]
        x = carregar(arq)
        ps, dur = pausas(x)
        ini = ps[0][1] if ps and ps[0][0] < 0.05 else 0.0
        fim = ps[-1][0] if ps and ps[-1][1] > dur - 0.05 else dur
        cand = [p for p in ps if p[0] > ini + 0.1 and p[1] < fim - 0.1]
        idx = escolher(textos, cand, ini, fim)
        if rec:
            idx = refinar(rec, x, dur, textos, cand, idx, ini, fim)
        cortes = [cand[j] for j in idx]
        lim = [(ini, cortes[0][0])] + [(cortes[k][1], cortes[k + 1][0]) for k in range(len(cortes) - 1)] + [(cortes[-1][1], fim)]
        frases = []
        rel.append(f"\nCAPÍTULO {cap['id']} — {cap['narrador']} — {dur:.2f} s ({len(cand)} pausas candidatas)")
        for i, ((a, b), t) in enumerate(zip(lim, textos)):
            cob, ouvido = None, ""
            if rec:
                ouvido = reconhecer(rec, x[int(max(0, a - 0.15) * SR): int(min(dur, b + 0.15) * SR)])
                cob = cobertura(t, ouvido)
            ok = cob is not None and cob >= LIMIAR_CONFIANCA
            frases.append({"inicio": round(a, 3), "fim": round(b, 3), "confiavel": ok, **({"reconhecimento": round(cob, 2)} if cob is not None else {})})
            rel.append(f"  [{'ok     ' if ok else 'REVISAR'}] {i:2d} {a:7.2f} → {b:7.2f}" + (f" ({int(cob * 100):3d}%)" if cob is not None else "") + f"  {t}" + (f"\n{'':32}ouvido: {ouvido}" if rec else ""))
        tempos["capitulos"][cap["id"]] = {"temAudio": True, "origem": "pausas" + ("+verificacao-asr" if rec else ""), "duracao": round(dur, 3), "frases": frases}
    TEMPOS.write_text(json.dumps(tempos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    RELATORIO.parent.mkdir(exist_ok=True)
    RELATORIO.write_text("\n".join(rel) + "\n", encoding="utf-8")
    print("\n".join(rel))


if __name__ == "__main__":
    main()
