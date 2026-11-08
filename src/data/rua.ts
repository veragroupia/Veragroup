/**
 * A rua é dados. Cada lote abaixo vira uma loja na cena 3D.
 *
 * Para adicionar um cliente novo: copie um lote, ajuste `x` (centro ao longo da rua, em metros),
 * `largura`, `segmento`, `status` e, se houver case publicado, `caseId`. A cena não precisa ser mexida.
 *
 * Eixos: a rua corre ao longo de X. O lado "norte" fica em +Z (fachadas viradas para -Z),
 * o lado "sul" em -Z (fachadas viradas para +Z). A câmera abre olhando para o lado norte.
 */

export type Status = 'presente' | 'perdendo' | 'construcao';

export type Segmento =
  | 'joalheria'
  | 'confeitaria'
  | 'oficina'
  | 'academia'
  | 'petshop'
  | 'odonto'
  | 'roupa'
  | 'terreno';

export type Vitrine = 'joias' | 'doces' | 'roupas' | 'clinica' | 'academia' | 'pet' | 'oficina';

export interface Letreiro {
  texto: string;
  /** caixa = caixa luminosa; letras = letras soltas sobre painel; logo = imagem do cliente */
  estilo: 'caixa' | 'letras' | 'logo';
  fundo: string;
  tinta: string;
  /** sinal = fonte de letreiro (OFL); marca = fonte próxima da marca do cliente */
  fonte?: 'sinal' | 'marca' | 'syne';
  sub?: string;
  imagem?: string;
}

export interface Lote {
  id: string;
  segmento: Segmento;
  /** Nome que aparece no marcador. Só os cases usam nome real. */
  nome: string;
  lado: 'norte' | 'sul';
  x: number;
  largura: number;
  /** 0 = terreno vazio */
  andares: 0 | 1 | 2 | 3;
  status: Status;
  caseId?: 'erk' | 'voneis';
  /** profundidade do prédio (padrão PROFUNDIDADE_LOTE) */
  profundidade?: number;
  fachada: { parede: string; detalhe: string; esquadria: string; barrado?: string };
  toldo?: { cor: string; sanefa?: string };
  marquise?: boolean;
  letreiro?: Letreiro;
  vitrine?: Vitrine;
}

export const LARGURA_RUA = 9;
export const LARGURA_CALCADA = 3;
export const ALTURA_GUIA = 0.15;
/** Distância do eixo da rua até a fachada. */
export const RECUO_FACHADA = LARGURA_RUA / 2 + LARGURA_CALCADA;
export const PROFUNDIDADE_LOTE = 11;

export const lotes: Lote[] = [
  // ——— lado norte (de -X para +X) ———
  {
    id: 'roupa',
    segmento: 'roupa',
    nome: 'Loja de roupa',
    lado: 'norte',
    x: -12.25,
    largura: 6.5,
    andares: 3,
    status: 'perdendo',
    fachada: { parede: '#cfa66a', detalhe: '#b88f55', esquadria: '#1b1c1e' },
    marquise: true,
    letreiro: { texto: 'ROUPAS', estilo: 'letras', fundo: '#1b1c1e', tinta: '#f3efe6', fonte: 'sinal' },
    vitrine: 'roupas',
  },
  {
    id: 'erk',
    segmento: 'joalheria',
    nome: 'ERK Pratas',
    lado: 'norte',
    x: -6.25,
    largura: 5.5,
    andares: 2,
    status: 'presente',
    caseId: 'erk',
    fachada: { parede: '#34373c', detalhe: '#4a4e55', esquadria: '#9a9ea6', barrado: '#26282c' },
    letreiro: {
      texto: 'ERK PRATAS',
      sub: 'PRATA 925 · SALTO SP',
      estilo: 'letras',
      fundo: '#16171a',
      tinta: '#eef0f3',
      fonte: 'marca',
    },
    vitrine: 'joias',
  },
  {
    id: 'terreno',
    segmento: 'terreno',
    nome: 'E a sua loja?',
    lado: 'norte',
    x: 0,
    largura: 7,
    andares: 0,
    status: 'construcao',
    fachada: { parede: '#6b6455', detalhe: '#857c69', esquadria: '#2b2b2b' },
  },
  {
    id: 'voneis',
    segmento: 'confeitaria',
    nome: 'Vó Neis',
    lado: 'norte',
    x: 6.75,
    largura: 6.5,
    andares: 2,
    status: 'presente',
    caseId: 'voneis',
    fachada: { parede: '#e2b6a6', detalhe: '#cf9d8c', esquadria: '#5a3a33', barrado: '#a9766f' },
    toldo: { cor: '#b9566a', sanefa: '#f1e3da' },
    letreiro: {
      texto: 'Vó Neis',
      estilo: 'logo',
      fundo: '#f6e4e4',
      tinta: '#5a3a33',
      imagem: '/trabalhos/voneis-logo.webp',
    },
    vitrine: 'doces',
  },
  {
    id: 'odonto',
    segmento: 'odonto',
    nome: 'Consultório odontológico',
    lado: 'norte',
    x: 12.75,
    largura: 6.5,
    andares: 2,
    status: 'perdendo',
    fachada: { parede: '#c9ddd5', detalhe: '#adc3ba', esquadria: '#4d5f5c' },
    marquise: true,
    letreiro: { texto: 'ODONTO', estilo: 'caixa', fundo: '#2f6f73', tinta: '#f2fbfa', fonte: 'sinal' },
    vitrine: 'clinica',
  },

  // ——— lado sul (de -X para +X) ———
  {
    id: 'academia',
    profundidade: 6.5,
    segmento: 'academia',
    nome: 'Academia',
    lado: 'sul',
    x: -9,
    largura: 7.5,
    andares: 1,
    status: 'perdendo',
    fachada: { parede: '#3b3e43', detalhe: '#2c2e32', esquadria: '#121314' },
    letreiro: { texto: 'ACADEMIA', estilo: 'caixa', fundo: '#171819', tinta: '#e9c64a', fonte: 'sinal' },
    vitrine: 'academia',
  },
  {
    id: 'pet',
    profundidade: 6.5,
    segmento: 'petshop',
    nome: 'Pet shop',
    lado: 'sul',
    x: -2.25,
    largura: 6,
    andares: 1,
    status: 'perdendo',
    fachada: { parede: '#3d7479', detalhe: '#336267', esquadria: '#1e2a2b' },
    toldo: { cor: '#d07a3a', sanefa: '#d07a3a' },
    letreiro: { texto: 'PET SHOP', estilo: 'caixa', fundo: '#f2ece0', tinta: '#2b5c61', fonte: 'sinal' },
    vitrine: 'pet',
  },
  {
    id: 'oficina',
    profundidade: 6.5,
    segmento: 'oficina',
    nome: 'Oficina',
    lado: 'sul',
    x: 5,
    largura: 8.5,
    andares: 1,
    status: 'perdendo',
    fachada: { parede: '#4f5d6b', detalhe: '#43505c', esquadria: '#23282d' },
    letreiro: { texto: 'OFICINA', estilo: 'caixa', fundo: '#d8b23c', tinta: '#1d2226', fonte: 'sinal' },
    vitrine: 'oficina',
  },
];

export const loteDoCase = (caseId: Lote['caseId']) => lotes.find((l) => l.caseId === caseId);

/** Segmento (da calculadora) de cada tipo de lote. */
export const SEGMENTO_DO_LOTE = {
  joalheria: 'joalheria',
  confeitaria: 'confeitaria',
  oficina: 'oficina',
  academia: 'academia',
  petshop: 'petshop',
  odonto: 'odonto',
  roupa: 'roupa',
  terreno: 'outro',
} as const;
