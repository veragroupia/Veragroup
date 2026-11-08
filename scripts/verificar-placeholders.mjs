// Falha o build se o HTML gerado tiver texto provisório ou campo vazio à mostra.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PROIBIDOS = [/PREENCHER/i, /\[\s*\.\.\.\s*\]/, /\bem breve\b/i, /lorem ipsum/i, /\blorem\b/i, /\bTODO\b/, /\bXXX\b/, /\bplaceholder\b/i, /undefined/, /\bnull\b/, /NaN/];

export function textoVisivel(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
}

export function problemas(html) {
  const texto = textoVisivel(html);
  const achados = PROIBIDOS.filter((r) => r.test(texto)).map((r) => r.source);
  // links vazios ou de mentira
  if (/href=""|href="#"(?![\w/-])|wa\.me\/\?/.test(html)) achados.push('link vazio');
  return achados;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pasta = process.argv[2] ?? 'dist';
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.html'));
  let falhou = false;
  for (const f of arquivos) {
    const p = problemas(readFileSync(join(pasta, f), 'utf8'));
    if (p.length) {
      falhou = true;
      console.error(`✗ ${f}: ${p.join(', ')}`);
    } else console.log(`✓ ${f}: sem texto provisório`);
  }
  if (falhou) process.exit(1);
}
