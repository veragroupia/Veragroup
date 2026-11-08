import type { IdSegmento } from '../data/segmentos';

/**
 * Registro das lojas que existem agora no mundo (as dos quarteirões visíveis).
 * Pinos, pedestres e reflexos leem daqui a cada quadro; o painel da loja apagada também.
 * Sem React: é um Map simples, atualizado quando quarteirões entram e saem.
 */
export type TipoLoja = 'case' | 'generica' | 'terreno' | 'visitante';

export interface LojaMundo {
  id: string;
  nome: string;
  segmento: IdSegmento;
  tipo: TipoLoja;
  lado: 1 | -1;
  /** centro da fachada, em x do mundo */
  x: number;
  largura: number;
  altura: number;
  /** x da porta no mundo (para onde os pedestres andam) */
  xPorta: number;
  /** acesa por natureza (cases e as poucas genéricas acesas) */
  acesaBase: boolean;
  caseId?: 'erk' | 'voneis';
  /** nível de luz atual (0…~1,1), escrito pelo dono da loja a cada quadro */
  luz: number;
  /** atrai pedestres? (se ausente, vale "luz > 0,5") */
  atrai?: boolean;
}

const lojas = new Map<string, LojaMundo>();
let versao = 0;

export function registrar(lista: LojaMundo[]) {
  for (const l of lista) lojas.set(l.id, l);
  versao++;
}

export function remover(ids: string[]) {
  for (const id of ids) lojas.delete(id);
  versao++;
}

export const lojaDoRegistro = (id: string) => lojas.get(id);
export const todasAsLojas = () => lojas.values();
export const versaoDoRegistro = () => versao;
