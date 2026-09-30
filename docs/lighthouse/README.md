# Relatório Lighthouse

Lighthouse 12, rodado sobre o build de produção (`npm run build && npm run preview`), em 30/09/2026.
Mobile: aparelho Moto G Power emulado, 4G lento e CPU 4× mais lenta. Desktop: preset `desktop`.

| Página | Modo | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Home | mobile | 99 | 100 | 100 | 100 | 2,1 s | 0 | 50 ms |
| Home | desktop | 100 | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |
| Serviço (loja virtual) | mobile | 99 | 100 | 100 | 100 | 1,8 s | 0 | 0 ms |
| Serviço (loja virtual) | desktop | 100 | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |
| Case (ERK Pratas) | mobile | 99 | 100 | 100 | 100 | 1,8 s | 0 | 0 ms |
| Case (ERK Pratas) | desktop | 100 | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |
| Diagnóstico | mobile | 100 | 100 | 100 | 100 | 1,7 s | 0 | 0 ms |
| Diagnóstico | desktop | 100 | 100 | 100 | 100 | 0,4 s | 0 | 0 ms |
| Apresentação | mobile | 99 | 100 | 100 | 69* | 2,0 s | 0,002 | 0 ms |
| Apresentação | desktop | 100 | 100 | 100 | 69* | 0,4 s | 0 | 0 ms |

\* `/apresentacao` é `noindex` de propósito (não deve aparecer no Google). O Lighthouse desconta pontos de SEO por isso.

Metas do briefing (mobile): Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO 100. Todas batidas nas páginas indexáveis.

Relatórios completos da home: [`home-mobile.html`](home-mobile.html) e [`home-desktop.html`](home-desktop.html).

## Peso enviado ao navegador (home, com gzip)

- JavaScript: cerca de 5 KB no total.
- CSS: embutido no HTML, cerca de 14 KB.
- HTML completo: cerca de 37 KB.
- Fontes: Sora e Inter, subset latin, woff2, com pré-carregamento e fallback métrico (sem salto de layout).

## Acessibilidade além do Lighthouse

- axe-core (WCAG 2.1 A e AA) sem nenhuma violação nas 21 páginas, em 390 px. O script de verificação faz esse teste.
- Também sem violações em 768 e 1280 px, com as animações ligadas.
- Navegação por teclado conferida na home, com foco visível em todos os elementos.

## Como rodar de novo

```bash
npm run build && npm run preview
CHROME_PATH=/caminho/do/chrome npx lighthouse http://localhost:4321/ --view
```
