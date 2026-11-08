import roteiroJson from './roteiro.json';
import temposJson from './tempos.json';
import midiasJson from './midias.generated.json';
import { CENAS } from './cenas.ts';
import { FPS, montarLinha, type Roteiro, type Tempos } from './linhaDoTempo.ts';

export const roteiro = roteiroJson as Roteiro;
export const tempos = temposJson as Tempos;
export const linha = montarLinha(roteiro, tempos, CENAS);
export const DURACAO_FRAMES = Math.ceil(linha.total * FPS);
export const temNarracao = linha.capitulos.some((c) => c.temAudio);

/** Arquivos encontrados em public/media (gerado por scripts/indexar-midias.mjs). */
export const midias = midiasJson as Record<string, string>;
