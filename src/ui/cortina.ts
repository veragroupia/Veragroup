/**
 * Cortina: um preto curto entre dois lugares distantes do mundo (rua ↔ mapa), em vez de um voo longo.
 * Vive fora do React; o elemento está no App.
 */
let el: HTMLElement | null = null;
const pegar = () => (el ??= document.getElementById('cortina'));

export function fecharCortina(ms = 220): Promise<void> {
  const c = pegar();
  if (!c) return Promise.resolve();
  c.style.transition = `opacity ${ms}ms ease`;
  c.style.opacity = '1';
  return new Promise((ok) => setTimeout(ok, ms));
}

export function abrirCortina(ms = 420) {
  const c = pegar();
  if (!c) return;
  c.style.transition = `opacity ${ms}ms ease`;
  c.style.opacity = '0';
}
