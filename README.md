# Vera Group · site oficial

Site da Vera Group, agência de presença digital para negócios de Itu, Salto, Sorocaba e Indaiatuba. Serve para aparecer no Google da região, convencer quem chega por anúncio ou Instagram e como demonstração ao vivo na loja do cliente (`/?demo=1`).

A entrega da reformulação, com a lista do que falta preencher e as decisões tomadas, está em [`docs/ENTREGA.md`](docs/ENTREGA.md).

## Como rodar

```bash
npm install
npm run dev       # http://localhost:4321, recarrega sozinho
npm run build     # gera o site estático em dist/
npm run preview   # serve o dist/ para conferir
```

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run check:preencher` | Lista todos os `[[PREENCHER: ...]]` com arquivo e linha, e os projetos com `autorizado: false` |
| `npm run testar` | Teste de ponta a ponta (com `npm run preview` rodando): construtor nos 7 segmentos, prévia, calculadora, modo demo, eventos, páginas |
| `npm run og` | Gera as imagens de prévia de link de cada página em `public/og/` |

Os dois últimos usam o Playwright com Chromium instalado na máquina.

## Onde editar

Tudo que é conteúdo fica em `src/data/`, separado do layout:

```
src/data/empresa.ts     contatos, responsável, CNPJ (oculto se vazio), domínio, medição, oferta de lançamento
src/data/portfolio.ts   projetos (só aparecem com autorizado: true) e o Vera Finances
src/data/servicos.ts    serviços, preços dos dois de entrada, o que inclui, perguntas
src/data/cidades.ts     páginas /itu, /salto, /sorocaba, /indaiatuba
src/data/construtor.ts  segmentos e cores do Construtor ao vivo
src/data/home.ts        faixa, calculadora, como funciona, equipe, dúvidas
```

O que ainda não foi confirmado fica escrito como `[[PREENCHER: ...]]`. O site mostra esse marcador destacado e nunca o coloca em título, descrição ou dados do Google.

## Estrutura

```
src/pages/            páginas (index, portfolio, servicos, servicos/[slug], [cidade], previa, privacidade, 404)
src/components/       componentes; os da página inicial ficam em components/home/
src/layouts/Base.astro  cabeçalho HTML, SEO, schema, fontes, cookies
src/lib/              texto e links de WhatsApp, motor da prévia, schema.org, medição
src/scripts/          comportamento comum e o visualizador 3D da ERK (three.js)
src/styles/           base visual e o celular/mini-site do construtor
public/fonts/         Instrument Serif, Geist e Geist Mono, recortadas para português (SIL OFL)
public/og/            imagens de prévia de link
tools/                gerar imagens de prévia, testar o site, listar marcadores
docs/                 entrega, relatório Lighthouse e o diagnóstico da versão anterior
```

## Publicação

Projeto `vera-group` na Vercel, ligado a este repositório: **https://vera-group.vercel.app**. O `vercel.json` manda rodar `npm run build` e publicar `dist/`, com cache longo para fontes e arquivos do build.

Ao ligar o domínio próprio, troque `url` em `src/data/empresa.ts` (canonical, sitemap, robots, Open Graph e schema saem dali) e rode `npm run og`.

## Medição

Os cliques de WhatsApp, o uso da calculadora e do construtor e o envio no modo demo vão para `window.dataLayer`. Nada sai do navegador até existir um ID de GA4 ou GTM em `src/data/empresa.ts` e o visitante aceitar os cookies. Nunca é enviado o que a pessoa digitou.
