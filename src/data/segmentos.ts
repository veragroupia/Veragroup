/**
 * Segmentos de negócio: aparência da fachada e valores de partida da calculadora.
 *
 * Os números da calculadora são ESTIMATIVAS nossas, conservadoras, para começar a conversa.
 * A tela sempre mostra a conta e deixa o visitante mexer em tudo.
 */
export type IdSegmento =
  | 'confeitaria'
  | 'restaurante'
  | 'joalheria'
  | 'roupa'
  | 'oficina'
  | 'academia'
  | 'petshop'
  | 'odonto'
  | 'salao'
  | 'outro';

export interface Segmento {
  id: IdSegmento;
  nome: string;
  /** texto curto do letreiro quando não há nome */
  letreiro: string;
  /** cor sugerida para a fachada */
  cor: string;
  calc: {
    /** quantas pessoas procuram esse tipo de negócio por mês na cidade */
    procuras: number;
    /** ticket médio (R$) */
    ticket: number;
    /** % que desiste por não achar ou não ter resposta */
    desistem: number;
    /** de cada 100 que achariam o negócio, quantos fecham (fixo, mostrado na conta) */
    fechamento: number;
  };
}

export const segmentos: Segmento[] = [
  { id: 'confeitaria', nome: 'Confeitaria', letreiro: 'CONFEITARIA', cor: '#d9a99a', calc: { procuras: 600, ticket: 45, desistem: 25, fechamento: 25 } },
  { id: 'restaurante', nome: 'Restaurante', letreiro: 'RESTAURANTE', cor: '#b5643f', calc: { procuras: 900, ticket: 60, desistem: 25, fechamento: 30 } },
  { id: 'joalheria', nome: 'Joalheria', letreiro: 'JOALHERIA', cor: '#3a3d43', calc: { procuras: 250, ticket: 220, desistem: 30, fechamento: 12 } },
  { id: 'roupa', nome: 'Loja de roupa', letreiro: 'MODA', cor: '#cfa66a', calc: { procuras: 500, ticket: 150, desistem: 25, fechamento: 15 } },
  { id: 'oficina', nome: 'Oficina', letreiro: 'OFICINA', cor: '#4f5d6b', calc: { procuras: 350, ticket: 380, desistem: 30, fechamento: 15 } },
  { id: 'academia', nome: 'Academia', letreiro: 'ACADEMIA', cor: '#3b3e43', calc: { procuras: 400, ticket: 120, desistem: 25, fechamento: 10 } },
  { id: 'petshop', nome: 'Pet shop', letreiro: 'PET SHOP', cor: '#3d7479', calc: { procuras: 450, ticket: 90, desistem: 25, fechamento: 20 } },
  { id: 'odonto', nome: 'Consultório odontológico', letreiro: 'ODONTO', cor: '#c9ddd5', calc: { procuras: 300, ticket: 350, desistem: 30, fechamento: 12 } },
  { id: 'salao', nome: 'Salão de beleza', letreiro: 'SALÃO', cor: '#b98a8f', calc: { procuras: 400, ticket: 80, desistem: 25, fechamento: 20 } },
  { id: 'outro', nome: 'Outro', letreiro: 'LOJA', cor: '#8a8478', calc: { procuras: 300, ticket: 120, desistem: 25, fechamento: 15 } },
];

export const segmentoPorId = (id: IdSegmento) => segmentos.find((s) => s.id === id) ?? segmentos[segmentos.length - 1];

/** Converte a categoria do Google (primaryType) no nosso segmento, quando der. */
export function segmentoDoGoogle(tipo?: string): IdSegmento {
  if (!tipo) return 'outro';
  const t = tipo.toLowerCase();
  if (/bakery|confectionery|dessert|cake|padaria|confeitaria/.test(t)) return 'confeitaria';
  if (/restaurant|pizza|food|cafe|bar|lanchonete|restaurante/.test(t)) return 'restaurante';
  if (/jewel|joalheria/.test(t)) return 'joalheria';
  if (/clothing|apparel|roupa|moda/.test(t)) return 'roupa';
  if (/car_repair|auto|mechanic|oficina/.test(t)) return 'oficina';
  if (/gym|fitness|academia/.test(t)) return 'academia';
  if (/pet|veterin/.test(t)) return 'petshop';
  if (/dentist|dental|odonto/.test(t)) return 'odonto';
  if (/beauty|hair|salon|barber|salão|cabele/.test(t)) return 'salao';
  return 'outro';
}
