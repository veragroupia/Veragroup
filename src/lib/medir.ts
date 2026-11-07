/* Eventos de conversão.
   Sempre vão para window.dataLayer, que fica só no navegador. Só saem do
   aparelho se o visitante aceitou os cookies E existe GA4/GTM configurado em
   src/data/empresa.ts. Nunca enviamos o que a pessoa digitou (nome do negócio,
   valores da calculadora, telefone). */

type Dados = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function medir(evento: string, dados: Dados = {}) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === 'function') window.gtag('event', evento, dados);
  else window.dataLayer.push({ event: evento, ...dados });
}

const jaMedido = new Set<string>();
/** Mede só a primeira vez na visita (ex.: "usou a calculadora"). */
export function medirUmaVez(evento: string, dados: Dados = {}) {
  if (jaMedido.has(evento)) return;
  jaMedido.add(evento);
  medir(evento, dados);
}
