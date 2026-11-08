import { lotes, type Lote } from '../data/rua';

/**
 * Linha do tempo da entrada (segundos desde que a cena aparece).
 * A rua começa só com os postes; as lojas dos cases acendem uma a uma.
 */
export const ENTRADA = {
  primeiraLoja: 1.0,
  intervalo: 0.8,
  /** depois disso a entrada acabou (≤ 3,5 s pedido) */
  fim: 3.2,
};

/** Ordem em que as lojas acendem na entrada: as que já têm presença, na ordem do arquivo de dados. */
export const ordemEntrada = lotes.filter((l) => l.status === 'presente').map((l) => l.id);

export function instanteDeAcender(lote: Pick<Lote, 'id'>): number | null {
  const i = ordemEntrada.indexOf(lote.id);
  return i < 0 ? null : ENTRADA.primeiraLoja + i * ENTRADA.intervalo;
}

/**
 * Resposta de uma mola subamortecida a um degrau: sobe rápido, passa um pouco do alvo (~9%)
 * e assenta. É o "clique" de quando a luz acende, sem piscar.
 * Analítica de propósito: o mesmo tempo dá sempre o mesmo quadro (prints e pôster reproduzíveis).
 */
export function degrau(tau: number, zeta = 0.6, omega = 15): number {
  if (tau <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const env = Math.exp(-zeta * omega * tau);
  return 1 - env * (Math.cos(wd * tau) + ((zeta * omega) / wd) * Math.sin(wd * tau));
}

/** Nível de luz (0…~1,1) de uma loja no instante `t` do relógio da cena. */
export function nivelDeLuz(lote: Pick<Lote, 'id' | 'status'>, t: number, acesaEm?: number): number {
  if (acesaEm !== undefined) return degrau(t - acesaEm);
  if (lote.status !== 'presente') return 0;
  const t0 = instanteDeAcender(lote);
  return t0 === null ? 0 : degrau(t - t0);
}
