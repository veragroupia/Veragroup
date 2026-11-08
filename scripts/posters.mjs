// Gera os pôsteres (public/poster-desktop.webp, poster-celular.webp) e a imagem de compartilhamento
// (public/og.jpg) a partir da própria cena, com a interface escondida.
//
// Uso: com `npm run dev` rodando em outro terminal, `node scripts/posters.mjs`.
// Precisa do Playwright (`npm i -D playwright && npx playwright install chromium`).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const ESCONDE = `body *{visibility:hidden!important} .palco,.palco *{visibility:visible!important}
  .palco-dica,.palco-poster{visibility:hidden!important} #og,#og *{visibility:visible!important}`;

const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

async function capturar(w, h, dpr, sobrepor) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 600, hasTouch: w < 600 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}?t=8&q=alta&dpr=${dpr}`, { waitUntil: 'load' });
  await page.waitForSelector('.palco-cena--pronta', { timeout: 300000 });
  await page.waitForTimeout(4000);
  await page.addStyleTag({ content: ESCONDE });
  if (sobrepor) await page.evaluate(sobrepor);
  await page.waitForTimeout(1500);
  const png = await page.screenshot({ timeout: 300000 });
  await ctx.close();
  return png;
}

/** Converte PNG para WebP/JPEG usando o próprio navegador (sem dependência de imagem). */
async function converter(png, tipo, qualidade) {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(
    async ({ b64, tipo, qualidade }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL(tipo, qualidade);
    },
    { b64: png.toString('base64'), tipo, qualidade },
  );
  await page.close();
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

const salvar = (nome, buf) => {
  writeFileSync(`public/${nome}`, buf);
  console.log(`public/${nome}`, (buf.length / 1024).toFixed(0), 'KB');
};

salvar('poster-desktop.webp', await converter(await capturar(1440, 900, 1), 'image/webp', 0.72));
salvar('poster-celular.webp', await converter(await capturar(390, 844, 2), 'image/webp', 0.72));
salvar(
  'og.jpg',
  await converter(
    await capturar(1200, 630, 1, () => {
      const d = document.createElement('div');
      d.id = 'og';
      d.style.cssText = 'position:fixed;left:64px;bottom:64px;z-index:99;color:#f2efe8;max-width:620px;text-shadow:0 2px 24px #05060a';
      d.innerHTML = `<div style="font:700 44px/1 Syne,sans-serif;letter-spacing:-0.02em">vera<span style="color:#c9a96e">.</span></div>
        <div style="font:700 50px/1.08 Syne,sans-serif;letter-spacing:-0.02em;margin-top:26px">Seu negócio existe. Mas será que estão encontrando ele?</div>
        <div style="font:500 20px/1.4 'DM Sans',sans-serif;color:rgba(242,239,232,.7);margin-top:18px">Itu · Salto · Sorocaba · Indaiatuba</div>`;
      document.body.appendChild(d);
    }),
    'image/jpeg',
    0.84,
  ),
);
await browser.close();
