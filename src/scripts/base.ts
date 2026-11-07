/* Comportamento comum a todas as páginas. Pequeno de propósito. */
import { medir } from '../lib/medir';

const $$ = <T extends Element = HTMLElement>(sel: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<T>(sel)] as T[];
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- entrada em camadas ao rolar ---------- */
(function revelar() {
  const alvos = $$('[data-revela], [data-fio]');
  if (semMovimento || !('IntersectionObserver' in window)) {
    alvos.forEach((a) => a.classList.add('visto'));
    return;
  }
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('visto');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  alvos.forEach((a) => io.observe(a));
})();

/* ---------- cliques no WhatsApp ---------- */
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLElement>('[data-whats]');
  if (a) medir('whatsapp_clique', { origem: a.dataset.whats || 'sem-origem' });
});

/* ---------- selo de carregamento, medido de verdade ---------- */
(function carga() {
  const selos = $$('[data-carga]');
  if (!selos.length || !('performance' in window)) return;
  const mostrar = () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const ms = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : 0;
    if (!ms) return; // sem medida confiável, o selo continua escondido
    const s = (ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    selos.forEach((el) => {
      const v = el.querySelector('[data-carga-valor]');
      if (v) v.textContent = s;
      el.classList.add('medido');
    });
  };
  if (document.readyState === 'complete') setTimeout(mostrar, 0);
  else addEventListener('load', () => setTimeout(mostrar, 0), { once: true });
})();

/* ---------- topo: menu do celular e estado rolado ---------- */
(function topo() {
  const cab = document.querySelector<HTMLElement>('[data-topo]');
  if (!cab) return;
  const marcar = () => cab.classList.toggle('rolado', scrollY > 8);
  marcar();
  addEventListener('scroll', marcar, { passive: true });

  const botao = cab.querySelector<HTMLButtonElement>('[data-menu-botao]');
  const menu = document.getElementById('menu');
  if (!botao || !menu) return;
  const abrir = (sim: boolean) => {
    botao.setAttribute('aria-expanded', String(sim));
    menu.hidden = !sim;
    document.documentElement.classList.toggle('menu-aberto', sim);
    if (sim) menu.querySelector<HTMLElement>('a')?.focus();
  };
  botao.addEventListener('click', () => abrir(botao.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) abrir(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
      abrir(false);
      botao.focus();
    }
  });
})();

/* ---------- cookies (LGPD): recusar é tão fácil quanto aceitar ---------- */
(function cookies() {
  const caixa = document.querySelector<HTMLElement>('[data-cookies]');
  if (!caixa) return;
  const ga4 = caixa.dataset.ga4 || '';
  const gtm = caixa.dataset.gtm || '';
  if (!ga4 && !gtm) return; // sem ferramenta de medição, não existe cookie para pedir

  const CHAVE = 'vera-cookies';
  const ler = () => {
    try {
      return localStorage.getItem(CHAVE);
    } catch {
      return null;
    }
  };
  const gravar = (v: string) => {
    try {
      localStorage.setItem(CHAVE, v);
    } catch {
      /* navegação privada: a escolha vale só nesta página */
    }
  };

  let carregado = false;
  const ligar = () => {
    if (carregado) return;
    carregado = true;
    window.dataLayer = window.dataLayer || [];
    const s = document.createElement('script');
    s.async = true;
    if (gtm) {
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtm)}`;
    } else {
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', ga4, { anonymize_ip: true });
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`;
    }
    document.head.append(s);
  };

  const mostrar = (sim: boolean) => {
    caixa.hidden = !sim;
  };
  const escolha = ler();
  if (escolha === 'aceito') ligar();
  else if (escolha !== 'recusado' && !document.documentElement.dataset.demo) mostrar(true);

  caixa.querySelector('[data-cookies-aceitar]')?.addEventListener('click', () => {
    gravar('aceito');
    mostrar(false);
    ligar();
  });
  caixa.querySelector('[data-cookies-recusar]')?.addEventListener('click', () => {
    gravar('recusado');
    mostrar(false);
  });
  $$('[data-cookies-abrir]').forEach((b) => {
    b.hidden = false;
    b.addEventListener('click', () => mostrar(true));
  });
})();

/* ---------- modo demonstração: barra de etapas ---------- */
(function demo() {
  if (!document.documentElement.dataset.demo) return;
  const links = $$<HTMLAnchorElement>('[data-demo-etapa]');
  const secoes = links.map((l) => document.querySelector<HTMLElement>(l.getAttribute('href') || '')).filter(Boolean) as HTMLElement[];
  if (!secoes.length) return;
  const io = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        links.forEach((l) => l.setAttribute('aria-current', String(l.getAttribute('href') === `#${e.target.id}`)));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  secoes.forEach((s) => io.observe(s));
})();
