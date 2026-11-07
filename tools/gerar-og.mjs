// Gera as imagens de prévia de link (Open Graph) de cada página em public/og/.
// Uso: npm run og   (precisa do Playwright com Chromium instalado na máquina)
// Rode de novo sempre que mudar título de página, serviço ou cidade.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servicos } from '../src/data/servicos.ts';
import { cidades } from '../src/data/cidades.ts';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function playwright() {
  try {
    return require('playwright');
  } catch {
    const global = execSync('npm root -g').toString().trim();
    return require(path.join(global, 'playwright'));
  }
}

const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const em = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\|/g, ' ');

const paginas = [
  { slug: 'home', kicker: 'Itu · Salto · Sorocaba · Indaiatuba', titulo: 'Seu cliente *procurou.* E achou o *concorrente.*' },
  { slug: 'portfolio', kicker: 'Portfólio', titulo: 'Projetos *no ar*, com o link de verdade.' },
  { slug: 'servicos', kicker: 'Serviços', titulo: 'Tudo o que faz o cliente *achar você*.' },
  ...servicos.map((s) => ({
    slug: `servico-${s.slug}`,
    kicker: s.preco
      ? s.preco.tipo === 'mensal'
        ? `${brl(s.preco.implantacao)} + ${brl(s.preco.mensal)}/mês`
        : `${brl(s.preco.valor)}, configurada e instalada`
      : 'Orçamento pelo WhatsApp',
    titulo: `*${s.nome}*`,
    sub: s.curto,
  })),
  ...cidades.map((c) => ({ slug: `cidade-${c.slug}`, kicker: `${c.nome} · ${c.angulo}`, titulo: c.h1 })),
];

const fonte = (f) => `file://${path.join(raiz, 'public/fonts', f)}`;
const logo = readFileSync(path.join(raiz, 'src/assets/logo-vera.svg'), 'utf8');

const html = (p) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face{font-family:S;src:url(${fonte('instrument-serif-400.woff2')})}
@font-face{font-family:S;font-style:italic;src:url(${fonte('instrument-serif-400-italic.woff2')})}
@font-face{font-family:G;src:url(${fonte('geist-var.woff2')});font-weight:100 900}
@font-face{font-family:M;src:url(${fonte('geist-mono-var.woff2')});font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#F4F1EA;color:#0E0E0C;font-family:G;display:grid;grid-template-rows:auto 1fr auto;padding:56px 64px 48px;position:relative;overflow:hidden}
.k{font-family:M;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#5E5A52;display:flex;gap:14px;align-items:center}
.k b{width:12px;height:12px;border-radius:50%;background:#D4371C;display:inline-block}
h1{font-family:S;font-weight:400;font-size:${p.titulo.length > 60 ? 76 : p.titulo.length > 40 ? 90 : 104}px;line-height:.95;letter-spacing:-.015em;align-self:center;max-width:1000px}
h1 em{font-style:italic}
.sub{font-size:26px;color:#36352F;margin-top:18px;max-width:900px}
.base{display:flex;justify-content:space-between;align-items:flex-end;border-top:1.5px solid #0E0E0C;padding-top:22px}
.base svg{width:150px;height:auto}
.base span{font-family:M;font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:#5E5A52}
.marca{position:absolute;right:64px;top:56px;width:22px;height:22px;border-right:1.5px solid #0E0E0C;border-top:1.5px solid #0E0E0C}
</style></head><body>
<p class="k"><b></b>${esc(p.kicker)}</p>
<div style="align-self:center"><h1>${em(p.titulo)}</h1>${p.sub ? `<p class="sub">${esc(p.sub)}</p>` : ''}</div>
<div class="base">${logo}<span>Vera Group · sites, lojas e Google</span></div>
<i class="marca"></i>
</body></html>`;

const { chromium } = playwright();
const saida = path.join(raiz, 'public/og');
mkdirSync(saida, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const tmp = mkdtempSync(path.join(os.tmpdir(), 'vera-og-'));
for (const p of paginas) {
  const arquivo = path.join(tmp, `${p.slug}.html`);
  writeFileSync(arquivo, html(p));
  await page.goto(`file://${arquivo}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(saida, `${p.slug}.jpg`), type: 'jpeg', quality: 86 });
  console.log(`public/og/${p.slug}.jpg`);
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
