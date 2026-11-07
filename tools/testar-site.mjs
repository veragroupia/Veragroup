// Teste de ponta a ponta do site já compilado.
// Uso: npm run build && npm run preview   (em outro terminal)   e   npm run testar
// Testa: construtor com os 7 segmentos, link de prévia, calculadora, modo demo,
// eventos de conversão, banner de cookies, selo de carregamento e erros de console.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { segmentos } from '../src/data/construtor.ts';

const BASE = process.env.BASE || 'http://localhost:4321';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
})();

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ok ' : 'FALHA'}  ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const erros = [];
ctx.on('page', (p) => {
  p.on('pageerror', (e) => erros.push(`${p.url()}: ${e}`));
  p.on('console', (m) => m.type() === 'error' && erros.push(`${p.url()}: ${m.text()}`));
});

/* ---------- construtor: 7 segmentos ---------- */
console.log('\nConstrutor ao vivo');
const p = await ctx.newPage();
await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await p.fill('[data-cons-nome]', 'Casa do Zé');
ok((await p.textContent('#cons-cel .pv-marca')) === 'Casa do Zé', 'nome digitado aparece na prévia');
ok((await p.textContent('#cons-cel [data-pv-sigla]')) === 'CZ', 'sigla gerada a partir do nome');
for (const s of segmentos) {
  await p.check(`input[name="segmento"][value="${s.id}"]`, { force: true });
  const txt = await p.textContent('#cons-cel .pv');
  const href = decodeURIComponent(await p.getAttribute('[data-cons-quero]', 'href'));
  ok(
    txt.includes(s.lista.titulo) && txt.includes(s.botao) && txt.includes('Casa do Zé') && href.includes(`Segmento: ${s.rotulo}`) && href.includes(`s=${s.id}`),
    `segmento ${s.rotulo}: blocos, botão, nome e mensagem do WhatsApp`,
  );
  ok(!/R\$|★|estrela/i.test(txt), `segmento ${s.rotulo}: sem preço ou estrela inventados na prévia`);
}
await p.check('input[name="cor"][value="#1C7A52"]', { force: true });
const estilo = await p.getAttribute('#cons-cel [data-pv]', 'style');
ok(estilo.includes('--pv:#1C7A52'), 'cor escolhida vai para a prévia');
const quero = decodeURIComponent(await p.getAttribute('[data-cons-quero]', 'href'));
ok(quero.startsWith('https://wa.me/') && quero.includes('Negócio: Casa do Zé') && quero.includes('Cor: Verde'), '"Quero esse no ar" leva nome, segmento e cor');
const urlPrevia = quero.match(/Prévia: (\S+)/)?.[1];
ok(Boolean(urlPrevia && urlPrevia.includes('/previa?')), 'mensagem leva o link da prévia');

/* ---------- link de prévia ---------- */
console.log('\nLink de prévia');
const pr = await ctx.newPage();
await pr.goto(urlPrevia.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'networkidle' });
ok((await pr.textContent('#pr-cel .pv-marca')) === 'Casa do Zé', 'prévia compartilhada abre com o nome');
ok((await pr.getAttribute('#pr-cel [data-pv]', 'style')).includes('#1C7A52'), 'prévia compartilhada abre com a cor');
ok((await pr.textContent('#pr-cel .pv')).includes(segmentos.at(-1).lista.titulo), 'prévia compartilhada abre com o segmento');
const prQuero = decodeURIComponent(await pr.getAttribute('[data-pr-quero]', 'href'));
ok(prQuero.includes('Casa do Zé'), 'botão da prévia leva o nome para o WhatsApp');
ok((await pr.getAttribute('meta[name="robots"]', 'content')) === 'noindex, follow', 'prévia fora do Google (noindex)');
const injetada = await ctx.newPage();
await injetada.goto(`${BASE}/previa?n=${encodeURIComponent('<img src=x onerror=alert(1)>')}&s=xx&c=zzz`, { waitUntil: 'networkidle' });
ok((await injetada.$('#pr-cel img')) === null, 'nome com HTML não vira código (escapado)');
ok((await injetada.getAttribute('#pr-cel [data-pv]', 'style')).includes('#D4371C'), 'cor inválida volta para a padrão');

/* ---------- calculadora ---------- */
console.log('\nCalculadora');
await p.fill('[data-calc-n="procuram"]', '100');
await p.fill('[data-calc-n="ticket"]', '50');
await p.fill('[data-calc-n="desistem"]', '20');
ok((await p.textContent('[data-calc-mes]')).replace(/\s/g, ' ') === 'R$ 1.000', '100 × 20% × R$ 50 = R$ 1.000 por mês');
ok((await p.textContent('[data-calc-ano]')).replace(/\s/g, ' ') === 'R$ 12.000', '× 12 = R$ 12.000 por ano');
ok((await p.textContent('[data-calc-t="perdidos"]')) === '20', 'conta visível: 20 clientes perdidos');
ok((await p.textContent('.calc__saida')).includes('Estimativa'), 'rótulo "estimativa" visível');

/* ---------- eventos ---------- */
console.log('\nEventos de conversão (só no dataLayer, nada sai sem consentimento)');
const eventos = await p.evaluate(() => (window.dataLayer || []).map((e) => e.event));
ok(eventos.includes('construtor_uso'), 'uso do construtor medido');
ok(eventos.includes('calculadora_uso'), 'uso da calculadora medido');
const [nova] = await Promise.all([ctx.waitForEvent('page'), p.click('.hero [data-whats="hero"]')]);
await nova.close();
ok((await p.evaluate(() => (window.dataLayer || []).map((e) => e.event))).includes('whatsapp_clique'), 'clique no WhatsApp medido');
const dados = await p.evaluate(() => JSON.stringify(window.dataLayer));
ok(!dados.includes('Casa do Zé'), 'nome digitado nunca vai para a medição');
ok(!(await p.evaluate(() => [...document.scripts].some((s) => s.src.includes('googletagmanager')))), 'nenhum script do Google carregado sem consentimento');
ok(await p.isHidden('[data-cookies]'), 'sem GA4/GTM configurado, sem banner (não há cookie)');
ok(await p.isVisible('.hero [data-carga]'), 'selo de carregamento aparece com o tempo medido');

/* ---------- modo demo ---------- */
console.log('\nModo demonstração (?demo=1)');
const d = await ctx.newPage();
await d.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
ok(await d.isHidden('.topo'), 'menu escondido');
ok(await d.isHidden('.rodape'), 'rodapé escondido');
ok(await d.isHidden('.hero'), 'abre direto no construtor (topo escondido)');
const topoDe = (sel) => d.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
const [tc, tp, tk] = [await topoDe('#construtor'), await topoDe('#portfolio'), await topoDe('#calculadora')];
ok(tc < tp && tp < tk, 'ordem: construtor → portfólio → calculadora');
ok(tc < 100, 'construtor é a primeira coisa da tela');
ok(await d.isVisible('.demo-barra'), 'barra de etapas visível');
ok(await d.isVisible('[data-cons-mandar]'), 'botão "Mandar no meu WhatsApp" visível');
ok(await d.isVisible('[data-p3d-carregar]'), '3D espera o toque (bom para 4G fraco)');
ok((await d.evaluate(() => getComputedStyle(document.querySelector('[data-cons-quero]')).minHeight)) === '62px', 'botões maiores');
await d.fill('[data-cons-nome]', 'Pet Amigo');
await d.check('input[name="segmento"][value="petshop"]', { force: true });
await d.fill('[data-cons-tel]', '(11) 98765-4321');
const mandar = decodeURIComponent(await d.getAttribute('[data-cons-mandar]', 'href'));
ok(mandar.startsWith('https://wa.me/5511987654321?text='), 'mandar vai para o número do cliente');
ok(mandar.includes('/previa?') && mandar.includes('n=Pet+Amigo') && mandar.includes('s=petshop'), 'mensagem leva o link da prévia com os parâmetros');
const [aba] = await Promise.all([ctx.waitForEvent('page'), d.click('[data-cons-mandar]')]);
await aba.close();
ok((await d.evaluate(() => (window.dataLayer || []).map((e) => e.event))).includes('demo_envio'), 'envio no modo demo medido');

const n = await ctx.newPage();
await n.goto(`${BASE}/`, { waitUntil: 'networkidle' });
ok(await n.isHidden('.demo-barra'), 'fora do demo, a barra de etapas não aparece');
ok(await n.isHidden('[data-cons-mandar]'), 'fora do demo, "Mandar no meu WhatsApp" não aparece');

/* ---------- todas as páginas ---------- */
console.log('\nPáginas');
const html = [];
const varrer = (d) => readdirSync(d).forEach((f) => {
  const c = path.join(d, f);
  if (statSync(c).isDirectory()) varrer(c);
  else if (f.endsWith('.html')) html.push(c);
});
varrer(path.join(raiz, 'dist'));
for (const arq of html) {
  const rota = '/' + path.relative(path.join(raiz, 'dist'), arq).replace(/\.html$/, '').replace(/^index$/, '');
  const s = readFileSync(arq, 'utf8');
  const head = s.split('</head>')[0];
  const ld = [...s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => m[1]).join('');
  ok(!head.replace(/<script type="application\/ld\+json">.*?<\/script>/g, '').includes('PREENCHER') && !ld.includes('PREENCHER'), `${rota}: nenhum [[PREENCHER]] em title, meta ou schema`);
  if (rota !== '/404') {
    const pg = await ctx.newPage();
    const r = await pg.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
    ok(r.ok(), `${rota}: abre (HTTP ${r.status()})`);
    const semAlt = await pg.$$eval('img', (is) => is.filter((i) => !i.getAttribute('alt')).length);
    ok(semAlt === 0, `${rota}: todas as imagens com alt`);
    const largura = await pg.evaluate(() => document.documentElement.scrollWidth);
    ok(largura <= 390, `${rota}: sem rolagem lateral em 390 px (${largura})`);
    await pg.close();
  }
}

ok(erros.length === 0, `sem erros de JavaScript no console${erros.length ? ': ' + erros.join(' | ') : ''}`);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
