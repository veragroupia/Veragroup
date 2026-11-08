/* Vera Group · comportamento do site.
   Sem framework. Tudo aqui melhora uma página que já funciona sem JavaScript:
   personalização pelo link, contato com o projeto de referência, roteiro dos
   projetos, 3D sob demanda, vídeo, formulário e o carregamento do movimento. */

const cfg = window.VERA || {};
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CIDADES = ['Salto', 'Itu', 'Sorocaba', 'Indaiatuba', 'Porto Feliz', 'Tietê'];
const PROJETOS = cfg.projetos || {};

/* ---------- medição: só envia se houver ferramenta configurada ---------- */
function registrar(evento, dados = {}) {
  try {
    if (typeof window.va === 'function') window.va('event', { name: evento, data: dados });
    if (typeof window.gtag === 'function') window.gtag('event', evento, dados);
    if (typeof window.plausible === 'function') window.plausible(evento, { props: dados });
    window.dispatchEvent(new CustomEvent('vera:evento', { detail: { evento, ...dados } }));
  } catch (_) { /* medição nunca quebra a página */ }
}

/* ---------- personalização pelo link ----------
   ?empresa=Clínica Sorriso&nicho=dentista&cidade=Itu&projeto=erk */
function limpar(valor, max = 60) {
  if (!valor) return '';
  return String(valor).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
const params = new URLSearchParams(location.search);
const empresa = limpar(params.get('empresa'));
const nicho = limpar(params.get('nicho'), 40).toLowerCase();
const cidadeBruta = limpar(params.get('cidade'), 40);
const cidade = CIDADES.find((c) => c.toLowerCase() === cidadeBruta.toLowerCase()) || cidadeBruta;
const personalizado = Boolean(nicho || cidade);

function nomeProjeto(valor) {
  const v = limpar(valor, 60);
  if (!v) return '';
  const chave = v.toLowerCase();
  if (PROJETOS[chave]) return PROJETOS[chave];
  return Object.values(PROJETOS).find((n) => n.toLowerCase() === chave) || '';
}
let projetoRef = nomeProjeto(params.get('projeto'));

const numeroWhats = String(cfg.whatsapp || '').replace(/\D/g, '');
function linkWhats(texto) {
  const t = encodeURIComponent(texto);
  return numeroWhats ? `https://wa.me/${numeroWhats}?text=${t}` : `https://wa.me/?text=${t}`;
}
function frasesBase() {
  const partes = ['Olá, Vera Group! Vi o site de vocês.'];
  if (empresa) partes.push(`Sou da ${empresa}${cidade ? `, de ${cidade}` : ''}.`);
  return partes;
}
function fraseProjeto() {
  return projetoRef ? `Vi o projeto ${projetoRef} e quero algo assim para a minha empresa.` : '';
}
function mensagemPadrao(assunto) {
  const partes = frasesBase();
  const p = fraseProjeto();
  if (p) partes.push(p);
  if (assunto) partes.push(`${assunto}.`);
  else if (!p) partes.push('Quero conversar sobre um projeto.');
  return partes.join(' ');
}

/* ---------- cabeçalho do hero: para quem, onde e quando ---------- */
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
  const url = $('[data-obra-url]');
  if (url && empresa) {
    const slug = empresa.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 28);
    if (slug) url.textContent = `${slug}.com.br`;
  }
  const ano = $('[data-ano]');
  if (ano) ano.textContent = String(new Date().getFullYear());
})();

/* ---------- a pesquisa do título de soluções ---------- */
(function pesquisa() {
  const alvo = $('[data-busca]');
  if (!alvo) return;
  if (personalizado) {
    alvo.textContent = `${nicho || 'o que você faz'} em ${cidade || 'sua cidade'}`;
    return;
  }
  const lista = cfg.pesquisas && cfg.pesquisas.length ? cfg.pesquisas : ['dentista em Itu'];
  alvo.textContent = lista[Math.floor(Math.random() * lista.length)];
})();

/* ---------- links de WhatsApp ---------- */
function atualizarLinks() {
  if (!numeroWhats) return; // sem número configurado, os botões levam ao formulário
  $$('[data-whats]').forEach((a) => {
    a.href = linkWhats(mensagemPadrao(a.dataset.assunto));
    a.target = '_blank';
    a.rel = 'noopener';
  });
}
atualizarLinks();
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-whats]');
  if (a) registrar('cta_contato', { origem: a.dataset.origem || '', assunto: a.dataset.assunto || '', projeto: projetoRef });
  const v = e.target.closest('[data-evento]');
  if (v) registrar(v.dataset.evento, { rotulo: v.dataset.rotulo || '' });
});

/* ---------- projeto de referência ("Quero algo assim") ---------- */
const ref = (function referencia() {
  const caixa = $('[data-ref]');
  const nome = $('[data-ref-nome]');
  const tirar = $('[data-ref-tirar]');
  function mostrar() {
    if (!caixa) return;
    caixa.hidden = !projetoRef;
    if (nome) nome.textContent = projetoRef;
  }
  function definir(valor) {
    projetoRef = valor;
    mostrar();
    atualizarLinks();
  }
  if (tirar) tirar.addEventListener('click', () => definir(''));
  mostrar();

  $$('[data-quero]').forEach((botao) => {
    botao.addEventListener('click', (e) => {
      definir(botao.dataset.quero);
      registrar('cta_quero_igual', { projeto: projetoRef });
      if (numeroWhats) {
        e.preventDefault();
        window.open(linkWhats(mensagemPadrao()), '_blank', 'noopener');
        return;
      }
      // Sem número: leva ao formulário já com a referência e foca o primeiro campo
      setTimeout(() => { const n = $('[data-formulario] input[name="nome"]'); if (n) n.focus({ preventScroll: true }); }, semMovimento ? 0 : 700);
    });
  });
  return { definir };
})();

/* ---------- roteiro dos projetos: a tela acompanha o passo ---------- */
(function roteiros() {
  const largo = window.matchMedia('(min-width: 1100px)');
  $$('[data-roteiro]').forEach((roteiro) => {
    const telas = $$('.roteiro__tela', roteiro);
    const passos = $$('[data-passo]', roteiro);
    const url = $('[data-roteiro-url]', roteiro);
    if (!telas.length || !passos.length) return;
    let atual = -1;

    function ativar(i) {
      if (i === atual) return;
      atual = i;
      roteiro.setAttribute('data-ativo', String(i));
      telas.forEach((t) => t.classList.toggle('ativa', Number(t.dataset.tela) === i));
      passos.forEach((p) => p.classList.toggle('ativo', Number(p.dataset.passo) === i));
      const passo = passos.find((p) => Number(p.dataset.passo) === i);
      if (url && passo && passo.dataset.url) url.textContent = passo.dataset.url;
    }

    // Faixa estreita no meio da tela: o passo que cruza essa faixa é o ativo
    const io = new IntersectionObserver((entradas) => {
      if (!largo.matches) return;
      entradas.forEach((e) => { if (e.isIntersecting) ativar(Number(e.target.dataset.passo)); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    passos.forEach((p) => io.observe(p));
    ativar(0);
  });
})();

/* ---------- vídeos: tocam só quando aparecem ---------- */
(function videos() {
  $$('video[data-video]').forEach((v) => {
    if (semMovimento) return; // fica o poster
    const io = new IntersectionObserver((entradas) => {
      if (entradas[0].isIntersecting) {
        if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); }
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        v.pause();
      }
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    io.observe(v);
  });
})();

/* ---------- 3D da ERK: só carrega quando a pessoa pede ---------- */
(function giro() {
  const caixa = $('[data-giro]');
  if (!caixa) return;
  const palco = $('.giro__palco', caixa);
  const canvas = $('canvas', caixa);
  const iniciar = $('[data-giro-iniciar]', caixa);
  const peca = $('[data-giro-peca]', caixa);
  const spec = { tipo: 'corrente', elo: 'cubano', esp: 6, medida: 50, acabamento: 'polido' };
  let viewer = null;
  const legenda = () => { if (peca) peca.textContent = `Elo ${spec.elo} · ${spec.esp} mm · ${spec.medida} cm · ${spec.acabamento}`; };

  function semWebGL() {
    const img = new Image();
    img.src = 'assets/img/r/erk-montar-800.webp';
    img.alt = 'Montador de peças da ERK Pratas com a corrente em 3D.';
    canvas.replaceWith(img);
    if (iniciar) iniciar.remove();
  }

  async function abrir() {
    if (viewer || !iniciar) return;
    iniciar.setAttribute('aria-busy', 'true');
    registrar('demo_3d_aberta');
    try {
      const teste = document.createElement('canvas');
      if (!(teste.getContext('webgl2') || teste.getContext('webgl'))) throw new Error('sem webgl');
      canvas.hidden = false;
      const { createViewer } = await import('./erk-3d.js');
      viewer = await createViewer(canvas, { orbitaVertical: false });
      viewer.setSpec({ ...spec });
      iniciar.remove();
      canvas.setAttribute('tabindex', '0');
    } catch (erro) {
      semWebGL();
    }
  }
  if (iniciar) iniciar.addEventListener('click', abrir);

  $$('[data-giro-grupo]', caixa).forEach((grupo) => {
    grupo.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-valor]');
      if (!b) return;
      $$('button', grupo).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      spec[grupo.dataset.giroGrupo] = b.dataset.valor;
      legenda();
      if (viewer) viewer.setSpec({ ...spec });
      else abrir();
    });
  });
  legenda();
  if (palco) palco.dataset.pronto = '';
})();

/* ---------- topo, navegação ativa e barra do celular ---------- */
(function topo() {
  const cab = $('[data-topo]');
  const barra = $('[data-barra]');
  const hero = $('#inicio');
  const contato = $('#contato');
  let ultimo = window.scrollY, pedido = 0;

  function ao_rolar() {
    pedido = 0;
    const y = window.scrollY;
    if (cab) {
      cab.classList.toggle('rolado', y > 24);
      // esconde descendo, mostra subindo; nunca esconde perto do topo
      const descendo = y > ultimo + 4;
      const subindo = y < ultimo - 4;
      if (y < 400 || subindo) cab.classList.remove('escondido');
      else if (descendo && !cab.contains(document.activeElement)) cab.classList.add('escondido');
    }
    ultimo = y;
  }
  window.addEventListener('scroll', () => { if (!pedido) pedido = requestAnimationFrame(ao_rolar); }, { passive: true });
  ao_rolar();
  if (cab) cab.addEventListener('focusin', () => cab.classList.remove('escondido'));

  // link da seção atual no menu
  const links = $$('.topo__nav a');
  const secoes = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if (secoes.length) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${e.target.id}`)));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secoes.forEach((s) => io.observe(s));
  }

  if (!barra || !hero || !contato) return;
  let passouHero = false, noContato = false;
  const atualizar = () => barra.classList.toggle('visivel', passouHero && !noContato);
  new IntersectionObserver((e) => { passouHero = !e[0].isIntersecting; atualizar(); }, { threshold: 0.05 }).observe(hero);
  new IntersectionObserver((e) => { noContato = e[0].isIntersecting; atualizar(); }, { threshold: 0.02 }).observe(contato);
})();

/* ---------- formulário: monta a mensagem e abre o WhatsApp ---------- */
(function formulario() {
  const form = $('[data-formulario]');
  if (!form) return;
  const aviso = $('[data-aviso]', form);
  const enviar = $('[data-enviar]', form);
  const textoEnviar = $('[data-enviar-texto]', form);
  const campoEmpresa = $('[data-campo-empresa]', form);
  const campoCidade = $('[data-campo-cidade]', form);
  const campoNome = form.elements.nome;
  if (empresa && campoEmpresa) campoEmpresa.value = empresa;
  if (cidade && campoCidade) {
    const op = [...campoCidade.options].find((o) => o.text === cidade);
    campoCidade.value = op ? op.text : 'Outra';
  }
  campoNome.addEventListener('input', () => {
    if (campoNome.value.trim()) { campoNome.removeAttribute('aria-invalid'); aviso.classList.remove('erro'); aviso.textContent = ''; }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = new FormData(form);
    const nome = limpar(dados.get('nome'));
    const negocio = limpar(dados.get('negocio'), 80);
    const cid = limpar(dados.get('cidade'), 40);
    const precisa = limpar(dados.get('precisa'), 60) || 'ajuda para decidir';

    if (!nome) {
      aviso.textContent = 'Escreva seu nome para a gente saber com quem vai falar.';
      aviso.className = 'formulario__aviso erro';
      campoNome.setAttribute('aria-invalid', 'true');
      campoNome.focus();
      return;
    }

    let msg = `Olá, Vera Group! Meu nome é ${nome}`;
    if (negocio) msg += `, da ${negocio}`;
    if (cid && cid !== 'Outra') msg += `, de ${cid}`;
    msg += precisa === 'ajuda para decidir'
      ? '. Quero ajuda para decidir a melhor solução para a minha empresa.'
      : `. Preciso de ${precisa}.`;
    const p = fraseProjeto();
    if (p) msg += ` ${p}`;

    enviar.setAttribute('aria-busy', 'true');
    if (textoEnviar) textoEnviar.textContent = 'Abrindo o WhatsApp…';
    registrar('formulario_enviado', { precisa, cidade: cid, projeto: projetoRef });

    // Link de verdade, clicado no mesmo gesto: abre o WhatsApp em qualquer navegador,
    // inclusive dentro do próprio WhatsApp. O aviso deixa o link à mão se nada abrir.
    const link = document.createElement('a');
    link.href = linkWhats(msg);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'abrir o WhatsApp';
    aviso.className = 'formulario__aviso ok';
    aviso.replaceChildren(
      numeroWhats ? 'Mensagem pronta. Se nada abriu, toque para ' : 'Mensagem pronta. Escolha a conversa da Vera Group ou toque para ',
      link,
      '.'
    );
    link.click();
    setTimeout(() => {
      enviar.removeAttribute('aria-busy');
      if (textoEnviar) textoEnviar.textContent = 'Conversar sobre meu projeto';
    }, 1600);
  });
})();

/* ---------- movimento: GSAP só quando faz sentido ----------
   Não carrega com movimento reduzido nem com economia de dados.
   A página já está completa sem ele; o movimento é camada. */
(function movimento() {
  if (semMovimento) return;
  const conexao = navigator.connection || {};
  if (conexao.saveData) return;
  const leve = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;

  const carregar = (src) => new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = ok;
    s.onerror = falha;
    document.head.append(s);
  });

  const iniciar = async () => {
    try {
      await carregar('assets/vendor/gsap.min.js');
      await carregar('assets/vendor/ScrollTrigger.min.js');
      const { iniciarMovimento } = await import('./motion.js');
      iniciarMovimento({ leve });
    } catch (_) { /* sem movimento, a página segue inteira */ }
  };
  // Depois do primeiro desenho: não disputa banda nem CPU com o LCP
  if (document.readyState === 'complete') setTimeout(iniciar, 0);
  else window.addEventListener('load', () => setTimeout(iniciar, 0), { once: true });
})();

export { ref };
