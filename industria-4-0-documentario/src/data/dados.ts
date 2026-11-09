import roteiroJson from './roteiro.json';
import temposJson from './tempos.json';
import midiasJson from './midias.generated.json';
import vozesJson from './vozes.generated.json';
import { CENAS } from './cenas.ts';
import { FPS, montarLinha, type Roteiro, type Tempos } from './linhaDoTempo.ts';

export const roteiro = roteiroJson as Roteiro;
// A narração só entra se o WAV do capítulo existir em public/audio/vozes (as gravações não vão para o Git).
// Sem o arquivo, os tempos continuam valendo, mas o vídeo sai sem voz em vez de falhar.
const vozes = new Set(vozesJson as string[]);
export const tempos: Tempos = {
	capitulos: Object.fromEntries(
		Object.entries((temposJson as Tempos).capitulos).map(([id, c]) => {
			const arq = roteiro.capitulos.find((x) => x.id === id)?.audio.split('/').pop() ?? '';
			return [id, { ...c, temAudio: c.temAudio && vozes.has(arq) }];
		}),
	),
};
export const linha = montarLinha(roteiro, tempos, CENAS);
export const DURACAO_FRAMES = Math.ceil(linha.total * FPS);
export const temNarracao = linha.capitulos.some((c) => c.temAudio);

/** Arquivos encontrados em public/media (gerado por scripts/indexar-midias.mjs). */
export const midias = midiasJson as Record<string, string>;
