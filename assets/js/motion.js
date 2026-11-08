/* Vera Group · movimento cinematográfico
   GSAP + ScrollTrigger sobre a rolagem nativa: sem smooth scroll artificial e sem
   prender a pessoa em seção nenhuma. Só transform, opacity e um clip-path por vez.
   Carregado por site.js depois do load, e nunca com movimento reduzido.

   Regras:
   - quem já está na tela quando o movimento chega não é escondido de novo;
   - gsap.matchMedia separa computador e celular e desfaz tudo ao trocar;
   - aparelho fraco (leve) fica só com as entradas, sem efeitos amarrados à rolagem. */

const EASE = 'expo.out';

function jaVisivel(el) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight * 0.92;
}

/* divide um título em palavras mascaradas, preservando elementos internos */
function dividir(el) {
  if (el.dataset.dividido) return $$i(el);
  el.dataset.dividido = '';
  const embrulhar = (conteudo) => {
    const w = document.createElement('span');
    w.className = 'w';
    const i = document.createElement('span');
    i.className = 'w__i';
    i.append(conteudo);
    w.append(i);
    return w;
  };
  [...el.childNodes].forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((parte) => {
        if (!parte) return;
        frag.append(/^\s+$/.test(parte) ? document.createTextNode(' ') : embrulhar(parte));
      });
      n.replaceWith(frag);
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const marcador = document.createComment('');
      n.replaceWith(marcador);
      marcador.replaceWith(embrulhar(n));
    }
  });
  return $$i(el);
}
function $$i(el) { return [...el.querySelectorAll('.w__i')]; }

export function iniciarMovimento({ leve = false } = {}) {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: EASE, duration: 1.1 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  document.documentElement.classList.add('com-movimento');

  /* ---------- títulos: palavras sobem da máscara ---------- */
  document.querySelectorAll('[data-revela-titulo]').forEach((titulo) => {
    if (jaVisivel(titulo)) return;
    const palavras = dividir(titulo);
    gsap.from(palavras, {
      yPercent: 110,
      duration: 1.2,
      stagger: 0.045,
      scrollTrigger: { trigger: titulo, start: 'top 86%', once: true },
    });
  });

  /* ---------- entradas em lote: um observador para muitos elementos ---------- */
  const seletor = [
    '.projetos__indice li', '.projeto__titulos > *', '.projeto__resumo > *',
    '.servico', '.etapa', '.conferir li', '.numeros li', '.vitrine > *',
    '.casa__lista li', '.sanfona details', '.modulos__lista > div',
    '.formulario > *', '.contato__texto > p', '.giro__texto', '.giro__palco',
  ].join(',');
  const alvos = gsap.utils.toArray(seletor).filter((el) => !jaVisivel(el));
  // só opacity: visibility hidden tiraria o conteúdo do leitor de tela até a entrada
  gsap.set(alvos, { opacity: 0, y: 42 });
  ScrollTrigger.batch(alvos, {
    start: 'top 90%',
    once: true,
    onEnter: (lote) => gsap.to(lote, { opacity: 1, y: 0, duration: 1, stagger: 0.07, overwrite: true }),
  });

  /* ---------- números do que foi construído ---------- */
  document.querySelectorAll('[data-contar]').forEach((el) => {
    const fim = Number(el.dataset.contar) || 0;
    if (jaVisivel(el) || fim < 2) return;
    const estado = { v: 0 };
    el.textContent = '0';
    gsap.to(estado, {
      v: fim,
      duration: 1.6,
      ease: 'power3.out',
      onUpdate: () => { el.textContent = String(Math.round(estado.v)); },
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* ---------- processo: a linha avança com a rolagem ---------- */
  const etapas = document.querySelector('[data-etapas]');
  if (etapas) {
    etapas.setAttribute('data-progressivo', '');
    gsap.fromTo(etapas, { '--progresso': 0 }, {
      '--progresso': 1,
      ease: 'none',
      scrollTrigger: { trigger: etapas, start: 'top 62%', end: 'bottom 62%', scrub: 0.6 },
    });
    etapas.querySelectorAll('.etapa').forEach((etapa) => {
      ScrollTrigger.create({ trigger: etapa, start: 'top 62%', toggleClass: 'ativa' , end: 'max' });
    });
  }

  if (leve) { aoCarregarFontes(ScrollTrigger); return; }

  /* ---------- efeitos amarrados à rolagem, por tamanho de tela ---------- */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 900px)', () => {
    // Hero: a obra sobe mais rápido que o texto, que se afasta
    const hero = document.querySelector('.hero');
    if (hero) {
      gsap.to('.obra', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__texto', { yPercent: -10, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'center center', end: 'bottom top', scrub: true } });
    }

    // Capa de cada projeto: a janela abre da máscara e cresce até o tamanho real
    document.querySelectorAll('[data-capa]').forEach((capa) => {
      const janela = capa.querySelector('[data-capa-janela]');
      const img = capa.querySelector('[data-capa-tela] img');
      const celular = capa.querySelector('[data-capa-celular]');
      const nome = capa.querySelectorAll('.capa__nome span');
      const linha = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: capa, start: 'top 92%', end: 'center 52%', scrub: 0.8 },
      });
      linha
        .fromTo(janela, { clipPath: 'inset(12% 9% 12% 9% round 28px)', scale: 0.94 }, { clipPath: 'inset(0% 0% 0% 0% round 12px)', scale: 1 }, 0)
        .fromTo(img, { scale: 1.16 }, { scale: 1 }, 0)
        .fromTo(celular, { yPercent: 38 }, { yPercent: 0 }, 0);
      if (nome.length === 2) {
        linha.fromTo(nome[0], { xPercent: -10 }, { xPercent: 0 }, 0).fromTo(nome[1], { xPercent: 10 }, { xPercent: 0 }, 0);
      }
    });

    // Rodapé: a marca assenta enquanto a página termina
    gsap.from('.rodape__marca', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.rodape', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  });

  mm.add('(max-width: 899px)', () => {
    // Celular: só a abertura da máscara, curta, sem escala
    document.querySelectorAll('[data-capa]').forEach((capa) => {
      const janela = capa.querySelector('[data-capa-janela]');
      const celular = capa.querySelector('[data-capa-celular]');
      if (jaVisivel(capa)) return;
      gsap.timeline({ scrollTrigger: { trigger: capa, start: 'top 85%', once: true } })
        .from(janela, { clipPath: 'inset(8% 6% 8% 6% round 20px)', duration: 1.3 })
        .from(celular, { yPercent: 30, opacity: 0, duration: 1.1 }, 0.25);
    });
  });

  aoCarregarFontes(ScrollTrigger);
}

function aoCarregarFontes(ScrollTrigger) {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
