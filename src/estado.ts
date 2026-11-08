import { create } from 'zustand';

export type Qualidade = 'alta' | 'media' | 'baixa';

interface Estado {
  /** loja sob o ponteiro (ou foco do teclado) */
  sobre: string | null;
  /** lojas acesas pelo visitante: id → instante do relógio da cena */
  acesasPeloVisitante: Record<string, number>;
  qualidade: Qualidade;
  /** a cena 3D já desenhou o primeiro quadro (pode esconder o pôster) */
  cenaPronta: boolean;
  /** a animação de entrada terminou */
  entradaFeita: boolean;
  /** o visitante pediu para escolher uma loja (botão de abertura) */
  convite: number;
  setSobre: (id: string | null) => void;
  setQualidade: (q: Qualidade) => void;
  setCenaPronta: () => void;
  setEntradaFeita: () => void;
  convidar: () => void;
}

export const useEstado = create<Estado>((set) => ({
  sobre: null,
  acesasPeloVisitante: {},
  qualidade: 'alta',
  cenaPronta: false,
  entradaFeita: false,
  convite: 0,
  setSobre: (id) => set({ sobre: id }),
  setQualidade: (qualidade) => set({ qualidade }),
  setCenaPronta: () => set({ cenaPronta: true }),
  setEntradaFeita: () => set({ entradaFeita: true }),
  convidar: () => set((s) => ({ convite: s.convite + 1 })),
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
