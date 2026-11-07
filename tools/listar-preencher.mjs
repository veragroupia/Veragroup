// Lista todos os [[PREENCHER: ...]] do site, com arquivo e linha.
// Uso: npm run check:preencher
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arquivos = [];
const varrer = (d) =>
  readdirSync(d).forEach((f) => {
    const c = path.join(d, f);
    if (statSync(c).isDirectory()) varrer(c);
    else if (/\.(ts|astro|md)$/.test(f)) arquivos.push(c);
  });
varrer(path.join(raiz, 'src'));

let total = 0;
for (const arq of arquivos) {
  readFileSync(arq, 'utf8')
    .split('\n')
    .forEach((linha, i) => {
      for (const m of linha.matchAll(/\[\[PREENCHER:\s*([^\]]*)\]\]/g)) {
        if (m[1].trim() === '...' || m[1].includes('${')) continue; // exemplo em comentário ou código
        total++;
        console.log(`${path.relative(raiz, arq)}:${i + 1}  ${m[1].trim()}`);
      }
    });
}
console.log(`\n${total} marcador(es) [[PREENCHER]].`);

const portfolio = readFileSync(path.join(raiz, 'src/data/portfolio.ts'), 'utf8');
const fora = [...portfolio.matchAll(/autorizado:\s*false,\s*nome:\s*'([^']+)'/g)].map((m) => m[1]);
console.log(`Projetos fora do site (autorizado: false): ${fora.length ? fora.join(', ') : 'nenhum'}.`);
