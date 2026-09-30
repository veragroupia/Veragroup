/** Anima um número de `de` até `para` (400 ms). Sem animação com movimento reduzido. */
const semMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const quadros = new WeakMap<HTMLElement, number>();

export function animarNumero(el: HTMLElement, de: number, para: number, formatar: (v: number) => string, duracao = 400) {
  const pendente = quadros.get(el);
  if (pendente) cancelAnimationFrame(pendente);
  if (semMovimento() || de === para) {
    el.textContent = formatar(para);
    return;
  }
  const inicio = performance.now();
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / duracao);
    const suave = 1 - Math.pow(1 - t, 3);
    el.textContent = formatar(Math.round(de + (para - de) * suave));
    if (t < 1) quadros.set(el, requestAnimationFrame(passo));
  };
  quadros.set(el, requestAnimationFrame(passo));
}
