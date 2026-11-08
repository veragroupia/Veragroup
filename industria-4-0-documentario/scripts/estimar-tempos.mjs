// Gera src/data/tempos.json com tempos ESTIMADOS (sem áudio), a partir do tamanho de cada frase.
// Usado na prévia sem narração. Quando as vozes chegarem, use scripts/alinhar.py.
// Uso: node scripts/estimar-tempos.mjs [--forcar]   (não sobrescreve capítulos que já têm áudio alinhado)
//      node scripts/estimar-tempos.mjs --proporcional
//        Alternativa SEM reconhecimento de fala: usa a duração real de cada gravação e distribui as frases
//        proporcionalmente. É aproximado: todas as frases ficam marcadas para revisão manual.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../', import.meta.url);
const roteiro = JSON.parse(readFileSync(new URL('src/data/roteiro.json', raiz)));
const destino = new URL('src/data/tempos.json', raiz);
const proporcional = process.argv.includes('--proporcional');
const forcar = process.argv.includes('--forcar') || proporcional;
const atual = existsSync(destino) && !forcar ? JSON.parse(readFileSync(destino)) : { capitulos: {} };

const CARACTERES_POR_SEGUNDO = 14.5; // ritmo médio de leitura em voz alta (pt-BR)
const PAUSA_FRASE = 0.35;
const PAUSA_PARAGRAFO = 0.75;
const r = (n) => Math.round(n * 1000) / 1000;

const capitulos = {};
for (const cap of roteiro.capitulos) {
  if (atual.capitulos?.[cap.id]?.temAudio) {
    capitulos[cap.id] = atual.capitulos[cap.id];
    console.log(`capítulo ${cap.id}: mantido (áudio alinhado)`);
    continue;
  }
  let t = 0.15;
  const frases = [];
  cap.paragrafos.forEach((par, p) => {
    if (p > 0) t += PAUSA_PARAGRAFO - PAUSA_FRASE;
    par.forEach((texto) => {
      const dur = Math.max(1.2, texto.length / CARACTERES_POR_SEGUNDO);
      frases.push({ inicio: r(t), fim: r(t + dur), confiavel: false });
      t += dur + PAUSA_FRASE;
    });
  });
  const wav = fileURLToPath(new URL(`public/${cap.audio}`, raiz));
  if (proporcional && existsSync(wav)) {
    const real = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', wav]).toString());
    const k = (real - 0.5) / (t - 0.15); // as margens de silêncio deixadas pelo preparar-vozes ficam de fora
    const escaladas = frases.map((f) => ({ inicio: r(0.35 + (f.inicio - 0.15) * k), fim: r(0.35 + (f.fim - 0.15) * k), confiavel: false }));
    capitulos[cap.id] = { temAudio: true, origem: 'proporcional (revisar)', duracao: r(real), frases: escaladas };
    console.log(`capítulo ${cap.id}: ${real.toFixed(1)} s (gravação real, frases distribuídas proporcionalmente — REVISAR)`);
    continue;
  }
  capitulos[cap.id] = { temAudio: false, origem: 'estimativa', duracao: r(t + 0.2), frases };
  console.log(`capítulo ${cap.id}: ${capitulos[cap.id].duracao.toFixed(1)} s (estimado)`);
}
writeFileSync(destino, JSON.stringify({ geradoEm: new Date().toISOString(), capitulos }, null, 1) + '\n');
