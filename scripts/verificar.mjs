/**
 * Verificação automática do site construído.
 *
 * Uso:
 *   npm run build && npm run preview   (em outro terminal)
 *   node scripts/verificar.mjs [--base=http://localhost:4321] [--paginas=/,/sobre] [--fotos] [--saida=screenshots]
 *
 * O que confere em cada página:
 *   - nenhuma rolagem horizontal em 360, 390, 430, 768, 1024, 1280, 1440 e 1920 px
 *   - exatamente um <h1> e hierarquia de títulos sem pular nível
 *   - title, description, canonical, og:image e hreflang presentes
 *   - todos os links wa.me com número certo e mensagem preenchida
 *   - toda <img> com alt (vazio só se for decorativa)
 *   - botões e campos com no mínimo 44 × 44 px
 *   - nenhum erro no console
 * Com --fotos, salva screenshots de página inteira em 390, 768 e 1440 px.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const BASE = args.base || 'http://localhost:4321';
const SAIDA = args.saida || 'screenshots';
const NUMERO = '5511940723507';
const LARGURAS = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const FOTOS = [390, 768, 1440];

function paginasDoBuild() {
  const dist = path.resolve('dist');
  const lista = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const cheio = path.join(dir, nome);
      if (fs.statSync(cheio).isDirectory()) {
        if (!['_astro', 'vendor', 'og'].includes(nome)) andar(cheio);
      } else if (nome.endsWith('.html')) {
        let rota = '/' + path.relative(dist, cheio).replace(/\.html$/, '');
        if (rota === '/index') rota = '/';
        lista.push(rota);
      }
    }
  };
  andar(dist);
  return lista.sort();
}

const paginas = args.paginas ? String(args.paginas).split(',') : paginasDoBuild();
const problemas = [];
const anotar = (pagina, msg) => problemas.push(`${pagina}: ${msg}`);

const navegador = await chromium.launch();

async function rolarAteOFim(page) {
  await page.evaluate(async () => {
    const passo = Math.max(300, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle').catch(() => {});
}

for (const rota of paginas) {
  const is404 = rota === '/404';
  // 1) Rolagem horizontal em todas as larguras.
  for (const largura of LARGURAS) {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + rota, { waitUntil: 'load' });
    const vazamento = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= w + 1) return null;
      const culpados = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (!(r.right > w + 1 && r.width > 0) || getComputedStyle(el).position === 'fixed') return false;
          // Ignora quem está dentro de um contêiner que rola ou corta (carrossel, tabela).
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if (o !== 'visible') return false;
          }
          return true;
        })
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
      return `${document.documentElement.scrollWidth}px > ${w}px (${culpados.join(', ')})`;
    });
    if (vazamento) anotar(rota, `rolagem horizontal em ${largura}px: ${vazamento}`);
    await ctx.close();
  }

  // 2) Conferências de conteúdo em 390 px.
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const erros = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(e.message));
  const resposta = await page.goto(BASE + rota, { waitUntil: 'load' });
  if (!is404 && resposta && resposta.status() >= 400) anotar(rota, `status ${resposta.status()}`);

  const r = await page.evaluate((numero) => {
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || document.querySelector(sel)?.getAttribute('href') || '';
    const titulos = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
    const pulos = [];
    titulos.forEach((n, i) => {
      if (i > 0 && n > titulos[i - 1] + 1) pulos.push(`h${titulos[i - 1]}→h${n}`);
    });
    const wa = [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href'));
    const waRuins = wa.filter((href) => {
      try {
        const u = new URL(href);
        return u.pathname !== `/${numero}` || !(u.searchParams.get('text') || '').trim();
      } catch {
        return true;
      }
    });
    const semAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(-40));
    const pequenos = [...document.querySelectorAll('a.btn, button, input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea, summary, .chip, nav a')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || el.closest('[hidden],dialog:not([open])')) return false;
        return r.height < 43.5 || r.width < 43.5;
      })
      .slice(0, 6)
      .map((el) => `${el.tagName.toLowerCase()}("${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}") ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`);
    return {
      h1: document.querySelectorAll('h1').length,
      pulos,
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: meta('link[rel="canonical"]'),
      og: meta('meta[property="og:image"]'),
      hreflang: !!document.querySelector('link[hreflang="pt-BR"]'),
      lang: document.documentElement.lang,
      wa: wa.length,
      waRuins,
      semAlt,
      pequenos,
    };
  }, NUMERO);

  if (r.h1 !== 1) anotar(rota, `${r.h1} h1 (esperado 1)`);
  if (r.pulos.length) anotar(rota, `títulos pulando nível: ${r.pulos.join(', ')}`);
  if (!r.title) anotar(rota, 'sem <title>');
  if (!r.description) anotar(rota, 'sem meta description');
  if (!r.canonical) anotar(rota, 'sem canonical');
  if (!r.og) anotar(rota, 'sem og:image');
  if (!r.hreflang) anotar(rota, 'sem hreflang pt-BR');
  if (r.lang !== 'pt-BR') anotar(rota, `lang=${r.lang}`);
  if (r.waRuins.length) anotar(rota, `links de WhatsApp inválidos: ${r.waRuins.slice(0, 3).join(' | ')}`);
  if (r.semAlt.length) anotar(rota, `imagens sem alt: ${r.semAlt.join(', ')}`);
  if (r.pequenos.length) anotar(rota, `alvos de toque < 44px: ${r.pequenos.join('; ')}`);
  const errosReais = erros.filter((e) => !(is404 && /404/.test(e)));
  if (errosReais.length) anotar(rota, `erros no console: ${errosReais.slice(0, 3).join(' | ')}`);
  console.log(`✓ ${rota.padEnd(46)} h1=${r.h1} wa=${r.wa} title="${r.title}"`);
  await ctx.close();

  // 3) Screenshots.
  if (args.fotos) {
    fs.mkdirSync(SAIDA, { recursive: true });
    for (const largura of FOTOS) {
      const c = await navegador.newContext({ viewport: { width: largura, height: largura < 768 ? 844 : 900 }, reducedMotion: 'reduce' });
      // Screenshot sem o banner de cookies na frente.
      await c.addInitScript(() => localStorage.setItem('vg-consentimento', 'recusado'));
      const p = await c.newPage();
      await p.goto(BASE + rota, { waitUntil: 'load' });
      await rolarAteOFim(p);
      await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')));
      await p.waitForTimeout(250);
      const nome = (rota === '/' ? 'home' : rota.slice(1).replace(/\//g, '_')) + `-${largura}.png`;
      await p.screenshot({ path: path.join(SAIDA, nome), fullPage: true });
      await c.close();
    }
  }
}

await navegador.close();

console.log(`\n${paginas.length} páginas × ${LARGURAS.length} larguras verificadas.`);
if (problemas.length) {
  console.log(`\n${problemas.length} problema(s):`);
  problemas.forEach((p) => console.log('  ✗ ' + p));
  process.exit(1);
} else {
  console.log('Nenhum problema encontrado.');
}
