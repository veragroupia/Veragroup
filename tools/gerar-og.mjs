// Gera assets/img/og.jpg a partir de tools/og.html.
// Uso: node tools/gerar-og.mjs   (precisa do Playwright instalado)
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.goto('file://' + path.join(raiz, 'tools/og.html'))
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)
await page.screenshot({ path: path.join(raiz, 'assets/img/og.jpg'), type: 'jpeg', quality: 88 })
await browser.close()
console.log('assets/img/og.jpg gerado')
