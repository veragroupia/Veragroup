/* Vera Group · comportamento do site.
   Sem framework: personalizacao pelo link, o teste da pesquisa, a previa dos
   trabalhos, o 3D da ERK, os videos e o formulario que abre o WhatsApp. */

const cfg = window.VERA || {};
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CIDADES = ['Itu', 'Salto', 'Sorocaba', 'Indaiatuba', 'Porto Feliz', 'Tietê'];

/* ---------- personalizacao pelo link ----------
   ?empresa=Clínica Sorriso&nicho=dentista&cidade=Itu  */
function limpar(valor, max = 60) {
  if (!valor) return '';
  return valor.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
const params = new URLSearchParams(location.search);
const empresa = limpar(params.get('empresa'));
const nicho = limpar(params.get('nicho'), 40).toLowerCase();
const cidadeBruta = limpar(params.get('cidade'), 40);
const cidade = CIDADES.find((c) => c.toLowerCase() === cidadeBruta.toLowerCase()) || cidadeBruta;
const personalizado = Boolean(nicho || cidade);

const numeroWhats = String(cfg.whatsapp || '').replace(/\D/g, '');

function linkWhats(texto) {
  const base = numeroWhats ? `https://wa.me/${numeroWhats}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(texto)}`;
}

function mensagemPadrao(assunto) {
  const partes = ['Olá, Vera Group! Vi o portfólio de vocês.'];
  if (empresa) partes.push(`Sou da ${empresa}${cidade ? `, de ${cidade}` : ''}.`);
  partes.push(assunto ? `${assunto}.` : 'Quero conversar sobre o meu negócio.');
  return partes.join(' ');
}

/* cabecalho do documento: para quem, onde e quando */
(function cabecalho() {
  const alvo = $('[data-preparado]');
  if (alvo && empresa) {
    alvo.textContent = 'Preparado para ';
    const forte = document.createElement('strong');
    forte.textContent = empresa;
    alvo.append(forte);
  }
  const data = $('[data-data]');
  if (data) {
    const hoje = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const lugar = cidade ? (CIDADES.includes(cidade) ? `${cidade}, SP` : cidade) : 'Salto, SP';
    data.textContent = `${lugar} · ${hoje}`;
  }
  const ano = $('[data-ano]');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();

/* ---------- a pesquisa do topo ---------- */
(function pesquisa() {
  const texto = $('[data-busca]');
  const espelho = $('[data-busca-espelho]');
  const rotulo = $('[data-busca-rotulo]');
  if (!texto) return;

  const escrever = (valor) => {
    texto.textContent = valor;
    if (espelho) espelho.textContent = valor;
  };

  if (personalizado) {
    const consulta = `${nicho || 'o que você faz'} em ${cidade || 'sua cidade'}`;
    escrever(consulta);
    if (rotulo) rotulo.setAttribute('aria-label', `Pesquisa: ${consulta}`);
    return;
  }

  const lista = (cfg.pesquisas && cfg.pesquisas.length ? cfg.pesquisas : ['dentista em Itu']).slice();
  escrever(lista[0]);
  if (rotulo) rotulo.setAttribute('aria-label', `Pesquisa de exemplo: ${lista[0]}`);
  if (semMovimento || lista.length < 2) return;

  let i = 0;
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  (async function ciclo() {
    await esperar(3400);
    for (;;) {
      if (document.hidden) { await esperar(800); continue; }
      const atual = lista[i];
      for (let n = atual.length; n >= 0; n--) {
        texto.textContent = atual.slice(0, n);
        await esperar(24);
      }
      i = (i + 1) % lista.length;
      const prox = lista[i];
      await esperar(260);
      for (let n = 1; n <= prox.length; n++) {
        texto.textContent = prox.slice(0, n);
        await esperar(52 + Math.random() * 46);
      }
      if (espelho) espelho.textContent = prox;
      await esperar(3000);
    }
  })();
})();

/* ---------- 01 o teste ---------- */
(function teste() {
  const caixa = $('[data-teste]');
  if (!caixa) return;
  const nome = $('[data-empresa]', caixa);
  if (nome && empresa) nome.textContent = empresa;

  const voce = $('[data-voce]', caixa);
  const selos = $$('[data-selo]', caixa);
  const efeito = $('[data-efeito]', caixa);
  const botoes = $$('[data-modo]', caixa);
  let tocou = false;
  let timers = [];

  function aplicar(modo) {
    timers.forEach(clearTimeout);
    timers = [];
    botoes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
    const comVera = modo === 'vera';
    selos.forEach((s, n) => {
      timers.push(setTimeout(() => s.classList.toggle('selo--nao', !comVera), semMovimento ? 0 : n * 140));
    });
    timers.push(setTimeout(() => {
      voce.classList.toggle('pronto', comVera);
      efeito.textContent = comVera ? 'Pronto para ser escolhido.' : 'Fica de fora.';
    }, semMovimento ? 0 : selos.length * 140));
  }

  botoes.forEach((b) => b.addEventListener('click', () => { tocou = true; aplicar(b.dataset.modo); }));

  // Mostra a virada sozinho uma vez, quando a pessoa chega na secao
  const io = new IntersectionObserver((entradas) => {
    if (!entradas[0].isIntersecting) return;
    io.disconnect();
    setTimeout(() => { if (!tocou) aplicar('vera'); }, 2200);
  }, { threshold: 0.6 });
  io.observe(caixa);
})();

/* ---------- 02 previa ao passar o mouse nos trabalhos ---------- */
(function previa() {
  const caixa = $('[data-previa-caixa]');
  const img = $('[data-previa-img]');
  if (!caixa || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let x = 0, y = 0, cx = 0, cy = 0, ativo = false, raf = 0;

  function mover() {
    cx += (x - cx) * 0.18;
    cy += (y - cy) * 0.18;
    caixa.style.transform = `translate(${cx + 28}px, ${cy - 120}px)`;
    if (ativo || Math.abs(x - cx) > 0.5) raf = requestAnimationFrame(mover);
  }
  $$('[data-previa]').forEach((linha) => {
    linha.addEventListener('mouseenter', (e) => {
      img.src = linha.dataset.previa;
      x = cx = e.clientX; y = cy = e.clientY;
      ativo = true;
      caixa.classList.add('ativa');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(mover);
    });
    linha.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; });
    linha.addEventListener('mouseleave', () => { ativo = false; caixa.classList.remove('ativa'); });
  });
})();

/* ---------- videos ---------- */
(function videos() {
  $$('video[data-video]').forEach((v) => {
    const fontes = $$('source', v);
    const ultima = fontes[fontes.length - 1];
    // Sem nenhuma fonte disponivel: com poster, fica a foto; sem poster, some
    if (ultima && !v.hasAttribute('poster')) ultima.addEventListener('error', () => { v.style.visibility = 'hidden'; });

    if (semMovimento) { v.removeAttribute('autoplay'); v.pause(); return; }

    const preguica = v.hasAttribute('data-video-preguica');
    const io = new IntersectionObserver((entradas) => {
      const e = entradas[0];
      if (e.isIntersecting) {
        if (preguica && v.preload !== 'auto') { v.preload = 'auto'; v.load(); }
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        v.pause();
      }
    }, { rootMargin: preguica ? '200px 0px' : '0px', threshold: 0.01 });
    io.observe(v);
  });
})();

/* ---------- 3D da ERK ---------- */
(function giro() {
  const palco = $('[data-giro]');
  if (!palco) return;
  const canvas = $('canvas', palco);
  const dica = $('[data-giro-dica]', palco);
  const peca = $('[data-giro-peca]', palco);
  const spec = { tipo: 'corrente', elo: 'cubano', esp: 6, medida: 50, acabamento: 'polido' };
  let viewer = null;

  const nomes = { cubano: 'cubano', grumet: 'grumet', veneziana: 'veneziana', cartier: 'cartier', baiana: 'baiana' };
  const legenda = () => { if (peca) peca.textContent = `Elo ${nomes[spec.elo]} · ${spec.esp} mm · ${spec.medida} cm · ${spec.acabamento}`; };

  function semWebGL() {
    const img = new Image();
    img.src = 'assets/img/erk-montar.webp';
    img.alt = 'Montador de peças da ERK Pratas com a corrente em 3D.';
    canvas.replaceWith(img);
    if (dica) dica.remove();
  }

  $$('[data-giro-grupo]').forEach((grupo) => {
    grupo.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-valor]');
      if (!b) return;
      $$('button', grupo).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      spec[grupo.dataset.giroGrupo] = b.dataset.valor;
      legenda();
      if (viewer) viewer.setSpec({ ...spec });
    });
  });
  legenda();

  canvas.addEventListener('pointerdown', () => dica && dica.classList.add('sumiu'), { once: true });

  const io = new IntersectionObserver(async (entradas) => {
    if (!entradas[0].isIntersecting) return;
    io.disconnect();
    try {
      const teste = document.createElement('canvas');
      if (!(teste.getContext('webgl2') || teste.getContext('webgl'))) throw new Error('sem webgl');
      const { createViewer } = await import('./erk-3d.js');
      viewer = await createViewer(canvas, { orbitaVertical: false });
      viewer.setSpec({ ...spec });
    } catch (erro) {
      semWebGL();
    }
  }, { rootMargin: '400px 0px' });
  io.observe(palco);
})();

/* ---------- entrada ao rolar ---------- */
(function revelar() {
  const alvos = $$([
    '.titulo-secao', '.case__titulo', '.case__abre', '.telas', '.resultado',
    '.indice > li', '.numeros > li', '.lista-num > li', '.rolo', '.fluxo__passo',
    '.vitrine__video', '.vitrine__texto', '.modulos__lista > div', '.casa__item',
    '.tabela__linha', '.etapa', '.mapa', '.sanfona details', '.giro__palco', '.ficha',
    '.contato__titulo', '.formulario',
  ].join(','));
  if (!('IntersectionObserver' in window) || semMovimento) {
    alvos.forEach((a) => a.classList.add('revelado'));
    return;
  }
  alvos.forEach((a) => {
    const irmaos = a.parentElement ? [...a.parentElement.children].filter((c) => c.matches(a.tagName)) : [];
    const n = Math.max(0, irmaos.indexOf(a));
    a.style.setProperty('--atraso', `${Math.min(n, 6) * 70}ms`);
    a.setAttribute('data-revela', '');
  });
  const io = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('revelado');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  alvos.forEach((a) => io.observe(a));
})();

/* ---------- topo e barra do WhatsApp ---------- */
(function topo() {
  const cab = $('[data-topo]');
  const barra = $('[data-barra]');
  const abertura = $('#inicio');
  const contato = $('#contato');
  const marcar = () => cab && cab.classList.toggle('rolado', window.scrollY > 24);
  marcar();
  window.addEventListener('scroll', marcar, { passive: true });

  if (!barra || !abertura || !contato) return;
  let passouTopo = false, noContato = false;
  const atualizar = () => barra.classList.toggle('visivel', passouTopo && !noContato);
  new IntersectionObserver((e) => { passouTopo = !e[0].isIntersecting; atualizar(); }, { threshold: 0.12 }).observe(abertura);
  new IntersectionObserver((e) => { noContato = e[0].isIntersecting; atualizar(); }, { threshold: 0.05 }).observe(contato);
})();

/* ---------- links de WhatsApp ---------- */
(function links() {
  if (!numeroWhats) return; // sem numero configurado, os botoes levam ao formulario
  $$('[data-whats]').forEach((a) => {
    a.href = linkWhats(mensagemPadrao(a.dataset.assunto));
    a.target = '_blank';
    a.rel = 'noopener';
  });
})();

/* ---------- formulario ---------- */
(function formulario() {
  const form = $('[data-formulario]');
  if (!form) return;
  const aviso = $('[data-aviso]', form);
  const campoEmpresa = $('[data-campo-empresa]', form);
  const campoCidade = $('[data-campo-cidade]', form);
  if (empresa && campoEmpresa) campoEmpresa.value = empresa;
  if (cidade && campoCidade) {
    const op = [...campoCidade.options].find((o) => o.text === cidade);
    campoCidade.value = op ? op.text : 'Outra';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = new FormData(form);
    const nome = limpar(dados.get('nome'));
    const negocio = limpar(dados.get('negocio'), 80);
    const cid = limpar(dados.get('cidade'), 40);
    const precisa = limpar(dados.get('precisa'), 60) || 'um site';

    if (!nome) {
      aviso.textContent = 'Escreva seu nome para a gente saber com quem vai falar.';
      aviso.classList.add('erro');
      form.elements.nome.focus();
      return;
    }
    aviso.classList.remove('erro');

    let msg = `Olá, Vera Group! Meu nome é ${nome}`;
    if (negocio) msg += `, da ${negocio}`;
    if (cid && cid !== 'Outra') msg += `, de ${cid}`;
    msg += `. Preciso de ${precisa}. Vi o portfólio de vocês.`;

    // Link de verdade, clicado no mesmo gesto: abre o WhatsApp em qualquer navegador,
    // inclusive dentro do proprio WhatsApp. O aviso deixa o link a mao se nada abrir.
    const url = linkWhats(msg);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'abrir o WhatsApp';
    aviso.replaceChildren(
      numeroWhats ? 'Mensagem pronta. Se nada abriu, toque para ' : 'Mensagem pronta. Escolha a conversa da Vera Group ou toque para ',
      link,
      '.'
    );
    link.click();
  });
})();
