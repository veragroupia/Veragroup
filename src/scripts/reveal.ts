/**
 * Revela elementos [data-reveal] ao entrarem na tela (fade + 16 px).
 * Irmãos marcados ganham um atraso curto em sequência (--i).
 * Também dispara os contadores [data-counter].
 */
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function revelar() {
  const alvos = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!('IntersectionObserver' in window) || semMovimento) {
    alvos.forEach((a) => a.classList.add('is-in'));
    return;
  }
  // Stagger: posição entre irmãos também marcados, no máximo 5 passos.
  alvos.forEach((a) => {
    if (a.style.getPropertyValue('--i')) return;
    const irmaos = a.parentElement ? [...a.parentElement.children].filter((c) => c.hasAttribute('data-reveal')) : [];
    a.style.setProperty('--i', String(Math.min(Math.max(0, irmaos.indexOf(a)), 5)));
  });
  const io = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  alvos.forEach((a) => io.observe(a));
  // Rede de segurança: nada fica invisível se o observer falhar.
  window.addEventListener('beforeprint', () => alvos.forEach((a) => a.classList.add('is-in')));
}

function contar(el: HTMLElement) {
  const final = Number(el.dataset.counter);
  if (!Number.isFinite(final) || semMovimento) return;
  const inicio = performance.now();
  const duracao = 900;
  const passo = (agora: number) => {
    const t = Math.min(1, (agora - inicio) / duracao);
    const suave = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(final * suave).toLocaleString('pt-BR');
    if (t < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

function contadores() {
  const alvos = document.querySelectorAll<HTMLElement>('[data-counter]');
  if (!alvos.length || semMovimento) return;
  const io = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        contar(e.target as HTMLElement);
        io.unobserve(e.target);
      });
    },
    { threshold: 0.6 },
  );
  alvos.forEach((a) => io.observe(a));
}

revelar();
contadores();
