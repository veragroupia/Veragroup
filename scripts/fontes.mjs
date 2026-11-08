// Baixa do Fontshare os WOFF2 oficiais de Cabinet Grotesk e Satoshi e os coloca em public/fontes/.
//
// Por que no build e não no git: a ITF Free Font License permite hospedar a fonte no próprio site,
// mas proíbe alterar o arquivo (subset, conversão) e distribuí-lo por repositório público.
// Este repositório é público, então os arquivos ficam fora dele (.gitignore) e chegam aqui sem alteração.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(raiz, '.cache', 'fontshare');
const destino = join(raiz, 'public', 'fontes');

const familias = [
  { slug: 'cabinet-grotesk', arquivos: ['CabinetGrotesk-Extrabold.woff2', 'CabinetGrotesk-Medium.woff2'] },
  { slug: 'satoshi', arquivos: ['Satoshi-Regular.woff2', 'Satoshi-Medium.woff2', 'Satoshi-Bold.woff2'] },
];

mkdirSync(cache, { recursive: true });
mkdirSync(destino, { recursive: true });

for (const { slug, arquivos } of familias) {
  if (arquivos.every((a) => existsSync(join(destino, a)))) continue;

  const zipPath = join(cache, `${slug}.zip`);
  if (!existsSync(zipPath)) {
    const url = `https://api.fontshare.com/v2/fonts/download/${slug}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Fontshare respondeu ${resp.status} para ${url}`);
    writeFileSync(zipPath, Buffer.from(await resp.arrayBuffer()));
  }

  const conteudo = unzipSync(new Uint8Array(readFileSync(zipPath)), {
    filter: (f) => f.name.includes('/Fonts/WEB/fonts/') && arquivos.some((a) => f.name.endsWith('/' + a)),
  });
  for (const a of arquivos) {
    const nome = Object.keys(conteudo).find((n) => n.endsWith('/' + a));
    if (!nome) throw new Error(`${a} não está no pacote oficial de ${slug}`);
    writeFileSync(join(destino, a), conteudo[nome]);
  }
  console.log(`fontes: ${slug} pronto`);
}
