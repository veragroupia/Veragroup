// Gera out/industria-4-0.srt a partir do roteiro (texto real falado) e de src/data/tempos.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { montarLinha } from '../src/data/linhaDoTempo.ts';
import { blocosDeLegenda, gerarSrt } from '../src/data/legendas.ts';
import { CENAS } from '../src/data/cenas.ts';

const ler = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const roteiro = ler('../src/data/roteiro.json');
const tempos = ler('../src/data/tempos.json');
const linha = montarLinha(roteiro, tempos, CENAS);
const blocos = blocosDeLegenda(linha.frases);
const destino = process.argv[2] ?? new URL('../out/industria-4-0.srt', import.meta.url);
writeFileSync(destino, gerarSrt(blocos));
const semAudio = linha.capitulos.filter((c) => !c.temAudio).map((c) => c.id);
const revisar = blocos.filter((b) => !b.confiavel).length;
console.log(`${blocos.length} legendas gravadas em ${destino}`);
if (semAudio.length) console.log(`ATENÇÃO: capítulos ${semAudio.join(', ')} ainda usam tempos ESTIMADOS (sem gravação).`);
if (revisar) console.log(`${revisar} bloco(s) marcados para revisão manual (alinhamento não confiável ou estimado).`);
