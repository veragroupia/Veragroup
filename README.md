# Vera Group · site comercial

Site de apresentação e venda da Vera Group. A jornada é uma só: entrar, se impressionar,
conhecer os projetos reais (ERK Pratas e Vó Neis Confeitaria), entender as soluções, confiar
no processo e chamar no WhatsApp.

O raciocínio de cada decisão está em [`docs/DIAGNOSTICO.md`](docs/DIAGNOSTICO.md).

## Como rodar

Site estático, sem etapa de build. Qualquer servidor serve:

```bash
python3 -m http.server 8080
# ou
npx serve .
```

Abra `http://localhost:8080`.

## Onde está no ar

Projeto `vera-group` na Vercel, ligado a este repositório: **https://vera-group.vercel.app**.
Sem framework e sem comando de build. O `vercel.json` cuida de cache e cabeçalhos.

## Por que continua sem framework

A página é uma só, com conteúdo que muda pouco. HTML estático entrega o texto e as imagens
no primeiro byte, sem hidratação, e o JavaScript só melhora o que já funciona. Medido com
Lighthouse (celular simulado, com compressão como na Vercel): desempenho 98, acessibilidade,
boas práticas e SEO 100, LCP 2,3 s e CLS 0. Next.js traria custo de bundle e hidratação sem
ganho para este caso.

## Antes de publicar

1. **WhatsApp:** coloque o número comercial em `assets/js/config.js` (`whatsapp: '5511...'`).
   Sem ele, os botões levam para o formulário, e o formulário abre o WhatsApp com a mensagem
   pronta para a pessoa escolher o contato.
2. **Prévia do link:** `og:image`, `og:url`, `canonical`, `robots.txt` e `sitemap.xml` apontam
   para `https://vera-group.vercel.app`. Ao ligar o domínio próprio, troque esse endereço nos cinco.
3. **Vídeo da Vó Neis:** hoje vem do CDN do Higgsfield. Para servir localmente, rode
   `sh scripts/baixar-videos.sh` e acrescente `<source src="assets/video/voneis-bolo.mp4">`
   antes da fonte do CDN no `index.html`.

## Link personalizado para prospecção

A página aceita parâmetros. O Maestro pode montar esse link em cada mensagem:

```
https://vera-group.vercel.app/?empresa=Clínica%20Sorriso&nicho=dentista&cidade=Itu&projeto=erk
```

- `empresa`: o topo mostra "Preparado para Clínica Sorriso", a janela do hero mostra
  `clinicasorriso.com.br`, o formulário já vem preenchido e a mensagem cita a empresa;
- `nicho` e `cidade`: o título de Soluções vira "Hoje alguém procurou *dentista em Itu*";
  a cidade também aparece no topo e no formulário;
- `projeto` (`erk` ou `voneis`): a mensagem de contato já cita o projeto de referência.

Os botões "Quero algo assim para minha empresa" de cada projeto fazem o mesmo: com número
configurado, abrem o WhatsApp citando o projeto; sem número, levam ao formulário com a
referência marcada.

## Estrutura

```
index.html                 a página (conteúdo e SEO ficam no HTML)
assets/css/site.css        tokens, componentes, seções e movimento em CSS
assets/js/config.js        número de WhatsApp, pesquisas e nomes dos projetos
assets/js/site.js          personalização, contato, roteiro dos projetos, 3D sob demanda,
                           formulário, medição e o carregamento do movimento
assets/js/motion.js        movimento de rolagem com GSAP + ScrollTrigger
assets/js/erk-3d.js        visualizador 3D do projeto ERK Pratas (só carrega no clique)
assets/vendor/             gsap e ScrollTrigger 3.13 (licença gratuita da GSAP) e three.js (MIT)
assets/fonts/              Archivo (subconjunto) e IBM Plex Mono (SIL Open Font License)
assets/img/                telas reais dos projetos, fotos da Vó Neis e og.jpg
assets/img/r/              versões AVIF e WebP em 800 px e 1440 px das telas
tools/og.html              molde da imagem de prévia; gere com node tools/gerar-og.mjs
docs/DIAGNOSTICO.md        diagnóstico, decisões do redesenho e pendências
```

### Movimento

- A entrada do hero é CSS puro: começa no primeiro quadro, não depende de JavaScript e não
  atrasa o LCP (o texto já está pintado; uma cortina cor de papel sai de cima dele).
- GSAP e ScrollTrigger (~46 KB comprimidos) carregam depois do `load`, e nunca com
  `prefers-reduced-motion` ou economia de dados. Em aparelho com até 4 núcleos ou 2 GB de
  memória ficam só as entradas, sem efeitos amarrados à rolagem.
- Rolagem nativa: sem smooth scroll artificial e sem seção presa. O roteiro dos projetos usa
  `position: sticky` e troca a tela pelo passo que passa no meio da tela.
- Só `transform`, `opacity` e um `clip-path` por vez. Os efeitos ficam dentro de
  `gsap.matchMedia`, que desfaz tudo ao trocar de tamanho de tela.

### Como acrescentar um projeto

1. Gere as telas em `assets/img/r/` (AVIF e WebP em 800 e 1440 px; celular em 390 e 780 px).
2. Copie um bloco `<article class="projeto">` do `index.html`, troque nome, textos, ficha,
   link e telas, e ajuste `data-projeto` e `data-quero` com o nome do projeto.
3. Acrescente a chave em `projetos` no `assets/js/config.js` para aceitar `?projeto=`.
4. Acrescente a linha em `.projetos__indice` e em `.conferir` (Prova).

### Medição

`site.js` chama `registrar(evento, dados)` em cada CTA (`cta_contato`, `cta_quero_igual`,
`visitar_projeto`, `formulario_enviado`, `demo_3d_aberta`). Os eventos vão para Vercel Web
Analytics (`window.va`), Google Analytics (`gtag`) ou Plausible, se algum estiver instalado,
e sempre como `CustomEvent('vera:evento')`. Nenhuma ferramenta está instalada hoje.

## De onde vem cada imagem

- **ERK Pratas:** capturas do site no ar (`site-production-0686.up.railway.app`).
- **Vó Neis:** o cardápio real (código do repositório do cliente) renderizado com os produtos e
  as fotos da própria loja, porque a versão no ar está temporariamente sem fotos cadastradas.
- **Vídeo:** gerado no Higgsfield a partir da foto real do bolo Chocolatudo.
- **Hero:** a "obra" (um site sendo levantado, do grid ao "no ar") é HTML e CSS, sem imagem.
