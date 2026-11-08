import { create } from 'zustand';
import type { IdCase } from './data/cases';
import type { Cidade } from './data/empresa';
import { segmentoPorId, type IdSegmento } from './data/segmentos';
import type { Lugar } from './lib/places';

export type Qualidade = 'alta' | 'media' | 'baixa';
export type Momento = 'cidade' | 'trabalhos' | 'sua-loja' | 'perto' | 'contato';
export type IdServicoLoja = 'site' | 'google' | 'cardapio' | 'nfc' | 'whatsapp';

export interface SuaLoja {
  nome: string;
  cidade: Cidade;
  segmento: IdSegmento;
  cor: string;
  /** de onde vieram os dados do diagnóstico */
  fonte: 'google' | 'simulacao';
  lugar?: Lugar;
  /** respostas do próprio visitante quando não há dado do Google */
  respostas: { google?: boolean; site?: boolean; horario?: boolean; whatsapp?: boolean };
  servicos: Record<IdServicoLoja, boolean>;
  construida: boolean;
  /** instante (relógio da cena) em que o prédio começou a subir */
  construidaEm?: number;
}

const lojaVazia = (): SuaLoja => ({
  nome: '',
  cidade: 'Salto',
  segmento: 'confeitaria',
  cor: segmentoPorId('confeitaria').cor,
  fonte: 'simulacao',
  respostas: {},
  servicos: { site: false, google: false, cardapio: false, nfc: false, whatsapp: false },
  construida: false,
});

interface Estado {
  momento: Momento;
  caso: IdCase | null;
  /** loja genérica aberta no painel (perda potencial) */
  lojaFoco: string | null;
  sobre: string | null;
  acesasPeloVisitante: Record<string, number>;
  suaLoja: SuaLoja;
  /** escolhas do montador da ERK, refletidas na corrente 3D */
  montador: { peca: string; modelo: string; tamanho: number };
  qualidade: Qualidade;
  cenaPronta: boolean;
  introFeita: boolean;
  entradaFeita: boolean;
  modo2d: boolean;
  /** cidade destacada no mapa */
  cidadeFoco: string | null;
  irPara: (m: Momento, caso?: IdCase | null) => void;
  abrirLoja: (id: string | null) => void;
  acender: (id: string, t: number) => void;
  setSobre: (id: string | null) => void;
  setSuaLoja: (p: Partial<SuaLoja>) => void;
  alternarServico: (s: IdServicoLoja) => void;
  reiniciarSuaLoja: () => void;
  setMontador: (p: Partial<Estado['montador']>) => void;
  setQualidade: (q: Qualidade) => void;
  setCenaPronta: () => void;
  setIntroFeita: () => void;
  setEntradaFeita: () => void;
  setModo2d: (v: boolean) => void;
  setCidadeFoco: (c: string | null) => void;
}

export const useEstado = create<Estado>((set) => ({
  momento: 'cidade',
  caso: null,
  lojaFoco: null,
  sobre: null,
  acesasPeloVisitante: {},
  suaLoja: lojaVazia(),
  montador: { peca: 'corrente', modelo: 'cubana', tamanho: 60 },
  qualidade: 'alta',
  cenaPronta: false,
  introFeita: false,
  entradaFeita: false,
  modo2d: false,
  cidadeFoco: null,
  irPara: (momento, caso = null) => set({ momento, caso: momento === 'trabalhos' ? caso : null, lojaFoco: null }),
  abrirLoja: (id) => set({ lojaFoco: id, caso: null, momento: 'cidade' }),
  acender: (id, t) => set((s) => ({ acesasPeloVisitante: { ...s.acesasPeloVisitante, [id]: t } })),
  setSobre: (id) => set({ sobre: id }),
  setSuaLoja: (p) => set((s) => ({ suaLoja: { ...s.suaLoja, ...p } })),
  alternarServico: (k) =>
    set((s) => ({ suaLoja: { ...s.suaLoja, servicos: { ...s.suaLoja.servicos, [k]: !s.suaLoja.servicos[k] } } })),
  reiniciarSuaLoja: () => set({ suaLoja: lojaVazia() }),
  setMontador: (p) => set((s) => ({ montador: { ...s.montador, ...p } })),
  setQualidade: (qualidade) => set({ qualidade }),
  setCenaPronta: () => set({ cenaPronta: true }),
  setIntroFeita: () => set({ introFeita: true }),
  setEntradaFeita: () => set({ entradaFeita: true }),
  setModo2d: (modo2d) => set({ modo2d }),
  setCidadeFoco: (cidadeFoco) => set({ cidadeFoco }),
}));

/**
 * Relógio da cena, fora do React para não re-renderizar a cada quadro.
 * `?t=1.6` na URL congela a entrada nesse instante (prints e pôster).
 */
export const relogio = {
  t: 0,
  congelado: null as number | null,
  semMovimento: false,
};
