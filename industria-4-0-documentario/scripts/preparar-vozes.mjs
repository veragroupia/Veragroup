// Prepara as gravações dos integrantes para o vídeo.
//
// Coloque os arquivos recebidos (M4A, MP3, WAV, AAC, OGG, OPUS ou MP4 de celular) em
// public/audio/vozes/originais/ com o número do capítulo ou o nome no começo, por exemplo:
//   01-davi.m4a   02-alaf.mp3   03 Otavio.wav   pedro.m4a   joao.ogg
//
// Para cada capítulo o script:
//   1. verifica a integridade (decodifica o arquivo inteiro) e mede a duração;
//   2. remove SOMENTE o silêncio excessivo do começo e do fim (mantém uma margem, não corta palavras);
//   3. aplica tratamento leve: filtro de graves, redução de ruído suave, leve presença e normalização de volume;
//   4. grava public/audio/vozes/0N-nome.wav (48 kHz, mono, 16 bits).
// A velocidade e o tom da voz NÃO são alterados.
//
// Opções:
//   --sem-tratamento   só apara os silêncios das pontas (sem filtros nem normalização)
//   --so-nivelar       apara e nivela o volume (loudnorm), sem filtro de ruído nem equalização.
//                      Use quando as gravações JÁ chegaram tratadas.
// Recortes manuais (opcional): public/audio/vozes/originais/recortes.json, em segundos do arquivo original:
//   { "02": { "inicio": 2.8 }, "05": { "fim": 56.3 } }
// Serve para tirar falas que não fazem parte do roteiro (título falado, repetição, "gravando…").
//
// Uso:  node scripts/preparar-vozes.mjs [--sem-tratamento | --so-nivelar]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../public/audio/vozes/', import.meta.url));
const pastaOriginais = join(raiz, 'originais');
const semTratamento = process.argv.includes('--sem-tratamento');
const soNivelar = process.argv.includes('--so-nivelar');
const arqRecortes = join(pastaOriginais, 'recortes.json');
const recortes = existsSync(arqRecortes) ? JSON.parse(readFileSync(arqRecortes, 'utf8')) : {};
const CAPITULOS = [
	{ id: '01', nome: 'davi' },
	{ id: '02', nome: 'alaf' },
	{ id: '03', nome: 'otavio' },
	{ id: '04', nome: 'pedro' },
	{ id: '05', nome: 'joao' },
];
const EXT = /\.(m4a|mp3|wav|aac|ogg|opus|mp4|3gp|amr|flac)$/i;
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const duracao = (arq) =>
	Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', arq]).toString().trim());

const arquivos = existsSync(pastaOriginais) ? readdirSync(pastaOriginais).filter((a) => EXT.test(a)) : [];
if (!arquivos.length) {
	console.log(`Nenhuma gravação encontrada em ${pastaOriginais}`);
	process.exit(0);
}

// Filtros: silenceremove nas duas pontas (via areverse), mantendo 0,35 s no começo e 0,5 s no fim.
// Limiar baixo (-50 dB) para não confundir palavras faladas baixinho com silêncio.
const aparar =
	'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.35:detection=rms,' +
	'areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.5:detection=rms,areverse';
const nivelar = 'loudnorm=I=-16:LRA=11:TP=-1.5';
const tratamento = 'highpass=f=70,afftdn=nr=10:nf=-45,equalizer=f=3200:t=q:w=1.2:g=1.5,loudnorm=I=-16:LRA=11:TP=-1.5';

let ok = 0;
for (const cap of CAPITULOS) {
	const original = arquivos.find((a) => {
		const n = semAcento(a);
		return n.startsWith(cap.id) || n.startsWith(cap.nome) || n.includes(`-${cap.nome}`) || n.includes(` ${cap.nome}`);
	});
	if (!original) {
		console.log(`capítulo ${cap.id} (${cap.nome}): aguardando gravação`);
		continue;
	}
	const entrada = join(pastaOriginais, original);
	const saida = join(raiz, `${cap.id}-${cap.nome}.wav`);
	try {
		execFileSync('ffmpeg', ['-v', 'error', '-i', entrada, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
	} catch (e) {
		console.error(`capítulo ${cap.id}: ARQUIVO CORROMPIDO OU ILEGÍVEL (${original})\n${e.stderr?.toString() ?? e}`);
		continue;
	}
	const antes = duracao(entrada);
	const filtros = semTratamento ? aparar : soNivelar ? `${aparar},${nivelar}` : `${aparar},${tratamento}`;
	const rc = recortes[cap.id] ?? {};
	const janela = [...(rc.inicio != null ? ['-ss', String(rc.inicio)] : []), ...(rc.fim != null ? ['-to', String(rc.fim)] : [])];
	execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', entrada, ...janela, '-vn', '-af', filtros, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', saida]);
	const depois = duracao(saida);
	console.log(`capítulo ${cap.id} (${cap.nome}): ${original} → ${cap.id}-${cap.nome}.wav · ${antes.toFixed(2)} s → ${depois.toFixed(2)} s (removido nas pontas: ${(antes - depois).toFixed(2)} s${janela.length ? `; recorte manual ${JSON.stringify(rc)}` : ''})`);
	if (antes - depois > 6 && !janela.length) console.log(`  atenção: muito silêncio removido; ouça o começo e o fim de ${cap.id}-${cap.nome}.wav`);
	ok++;
}
console.log(`\n${ok} gravação(ões) preparada(s).`);
if (ok) console.log('Próximo passo: python3 scripts/alinhar.py   (sincroniza frases, legendas e cenas com a voz)');
