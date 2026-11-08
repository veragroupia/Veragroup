/**
 * Calculadora de perda (ESTIMATIVA).
 *
 * perda por mês = procuras × (% que desiste) × (chance de fechar) × ticket
 *
 * "chance de fechar" existe porque nem todo mundo que procura compraria: sem ela a conta exagera.
 */
export interface Premissas {
  procuras: number;
  ticket: number;
  /** 0–100 */
  desistem: number;
  /** 0–100: de cada 100 que achariam o negócio, quantos fecham */
  fechamento: number;
}

export function clientesPerdidos(p: Premissas): number {
  return p.procuras * (p.desistem / 100) * (p.fechamento / 100);
}

export function perdaMensal(p: Premissas): number {
  return Math.round(clientesPerdidos(p) * p.ticket);
}

/** Arredonda para não fingir precisão: dezenas até 1 mil, centenas acima. */
export function arredondarEstimativa(valor: number): number {
  if (valor < 1000) return Math.round(valor / 10) * 10;
  return Math.round(valor / 100) * 100;
}
