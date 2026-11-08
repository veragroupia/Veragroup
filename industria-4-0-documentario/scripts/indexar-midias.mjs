// Indexa as mídias reais colocadas em public/media/** e grava src/data/midias.generated.json.
// Chave = caminho sem extensão (ex.: "fabricas/abertura"); valor = caminho do arquivo dentro de public/.
// Se uma cena encontra a sua chave aqui, ela usa a mídia real; senão usa a ilustração original.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../public/', import.meta.url));
const ok = new Set(['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp']);
const saida = {};
const andar = (dir) => {
	for (const nome of readdirSync(dir)) {
		const p = join(dir, nome);
		if (statSync(p).isDirectory()) andar(p);
		else if (ok.has(extname(nome).toLowerCase())) {
			const rel = relative(raiz, p).split('\\').join('/');
			saida[rel.replace(/^media\//, '').replace(/\.[^.]+$/, '')] = rel;
		}
	}
};
andar(join(raiz, 'media'));
writeFileSync(fileURLToPath(new URL('../src/data/midias.generated.json', import.meta.url)), JSON.stringify(saida, null, 1) + '\n');
console.log(`${Object.keys(saida).length} mídia(s) indexada(s)`, Object.keys(saida));
