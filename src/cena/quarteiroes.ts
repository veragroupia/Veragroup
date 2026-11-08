import { LARGURA_RUA, lotes, type Lote, type Vitrine } from '../data/rua';
import { segmentoPorId, type IdSegmento } from '../data/segmentos';
import { semente } from './kit';

/**
 * A rua que não acaba: quarteirões de 45 m separados por ruas transversais de 9 m.
 * O quarteirão 0 é o curado (ERK, Vó Neis, terreno). Os outros são genéricos, gerados de forma
 * determinística: o mesmo índice gera sempre o mesmo quarteirão (o visitante pode voltar).
 * Para não montar geometria nova a cada passo, existem poucas VARIANTES, recicladas pelo índice.
 */
export const COMPRIMENTO_QUADRA = 45;
export const LARGURA_TRANSVERSAL = 9;
export const PERIODO = COMPRIMENTO_QUADRA + LARGURA_TRANSVERSAL;
export const MEIA_QUADRA = COMPRIMENTO_QUADRA / 2;
export const N_VARIANTES = 3;

export const centroDoQuarteirao = (k: number) => k * PERIODO;
export const quarteiraoDoX = (x: number) => Math.round(x / PERIODO);
export const varianteDo = (k: number) => ((k % N_VARIANTES) + N_VARIANTES) % N_VARIANTES;

/** Postes de cada quarteirão (x local, lado): alternando calçadas a cada 9 m. */
export const POSTES_QUADRA: { x: number; lado: 1 | -1 }[] = [
  { x: -18, lado: 1 },
  { x: -9, lado: -1 },
  { x: 0, lado: 1 },
  { x: 9, lado: -1 },
  { x: 18, lado: 1 },
];
export const ALTURA_POSTE = 7.4;
export const BRACO_POSTE = 1.7;
export const cabecaDoPoste = (p: { x: number; lado: 1 | -1 }) =>
  ({ x: p.x, y: ALTURA_POSTE - 0.3, z: p.lado * (LARGURA_RUA / 2 + 0.35 - BRACO_POSTE) }) as const;

const SEGMENTOS_GENERICOS: IdSegmento[] = ['roupa', 'odonto', 'oficina', 'academia', 'petshop', 'confeitaria', 'joalheria', 'salao', 'restaurante'];

const VITRINE_DO_SEGMENTO: Record<IdSegmento, Vitrine> = {
  confeitaria: 'doces',
  restaurante: 'doces',
  joalheria: 'joias',
  roupa: 'roupas',
  oficina: 'oficina',
  academia: 'academia',
  petshop: 'pet',
  odonto: 'clinica',
  salao: 'clinica',
  outro: 'roupas',
};

const PALETA = ['#cfa66a', '#c9ddd5', '#e2b6a6', '#8fa7b3', '#d8d1c3', '#b5643f', '#6f7f6a', '#e6dccb', '#a9b7c6', '#c2a389', '#7d8a91', '#d9c48f'];
const FUNDO_LETREIRO = ['#1b1c1e', '#f2ece0', '#2f6f73', '#171819', '#3b2a22', '#e9e2d0'];

export interface LoteGerado extends Lote {
  segmentoId: IdSegmento;
  /** índice da loja dentro do quarteirão (para o atributo `loja`) */
  indice: number;
}

function preencherFileira(r: () => number, lado: 'norte' | 'sul', de: number, ate: number, prefixo: string, inicio: number): LoteGerado[] {
  const out: LoteGerado[] = [];
  let x = de;
  let i = inicio;
  while (ate - x > 4.4) {
    let w = 5.5 + r() * 3;
    if (ate - (x + w) < 4.6) w = ate - x;
    const seg = SEGMENTOS_GENERICOS[Math.floor(r() * SEGMENTOS_GENERICOS.length)];
    const s = segmentoPorId(seg);
    const andares = (lado === 'norte' ? (r() < 0.25 ? 3 : r() < 0.75 ? 2 : 1) : r() < 0.6 ? 1 : 2) as 1 | 2 | 3;
    const parede = PALETA[Math.floor(r() * PALETA.length)];
    const fundo = FUNDO_LETREIRO[Math.floor(r() * FUNDO_LETREIRO.length)];
    const claro = ['#f2ece0', '#e9e2d0'].includes(fundo);
    const sorteio = r();
    out.push({
      id: `${prefixo}${i}`,
      indice: i,
      segmento: 'roupa',
      segmentoId: seg,
      nome: s.nome,
      lado,
      x: x + w / 2,
      largura: w,
      andares,
      status: 'perdendo',
      profundidade: lado === 'sul' ? 6.5 : undefined,
      fachada: { parede, detalhe: parede, esquadria: r() < 0.5 ? '#1d2024' : '#4a4e52' },
      toldo: sorteio < 0.35 ? { cor: ['#7a2f2a', '#2e4a3f', '#3b4a5c', '#8a6a3a'][Math.floor(r() * 4)] } : undefined,
      marquise: sorteio >= 0.35 && sorteio < 0.6,
      letreiro: { texto: s.letreiro, estilo: r() < 0.55 ? 'caixa' : 'letras', fundo, tinta: claro ? '#1d2226' : '#f2ece0', fonte: 'sinal' },
      vitrine: VITRINE_DO_SEGMENTO[seg],
    });
    x += w;
    i++;
  }
  return out;
}

/** Lotes de uma variante genérica (coordenadas locais do quarteirão). */
export function lotesDaVariante(v: number): LoteGerado[] {
  const r = semente(1000 + v * 7919);
  const norte = preencherFileira(r, 'norte', -MEIA_QUADRA, MEIA_QUADRA, 'v', 0);
  const sul = preencherFileira(r, 'sul', -MEIA_QUADRA, MEIA_QUADRA, 'v', norte.length);
  // escurece levemente o detalhe para dar leitura de pilar/testeira
  for (const l of [...norte, ...sul]) l.fachada.detalhe = l.fachada.parede;
  return [...norte, ...sul];
}

/** Quais lojas de um quarteirão genérico estão acesas (poucas: ~1 em 7, pelo menos uma). */
export function acesasDoQuarteirao(k: number, total: number): Set<number> {
  const r = semente(5000 + k * 104729);
  const s = new Set<number>();
  for (let i = 0; i < total; i++) if (r() < 0.14) s.add(i);
  if (!s.size) s.add(Math.floor(r() * total));
  return s;
}

/** Lotes extras do quarteirão 0 (completam a quadra em volta dos lotes curados). */
export function lotesComplementaresCentrais(): LoteGerado[] {
  const r = semente(77);
  const ocupado = (lado: 'norte' | 'sul') => lotes.filter((l) => l.lado === lado);
  const out: LoteGerado[] = [];
  let i = 0;
  for (const lado of ['norte', 'sul'] as const) {
    const ls = ocupado(lado);
    const min = Math.min(...ls.map((l) => l.x - l.largura / 2));
    const max = Math.max(...ls.map((l) => l.x + l.largura / 2));
    const a = preencherFileira(r, lado, -MEIA_QUADRA, min, 'c', i);
    i += a.length;
    const b = preencherFileira(r, lado, max, MEIA_QUADRA, 'c', i);
    i += b.length;
    out.push(...a, ...b);
  }
  return out;
}

/** Id global de uma loja genérica: quarteirão + índice. */
export const idGenerico = (k: number, indice: number) => `q${k}-${indice}`;
