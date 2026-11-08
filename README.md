# Vera Group · Espelho 3D da cidade

Site novo da Vera Group: um quarteirão comercial do interior, à noite, em 3D. A luz de cada loja mostra o status dela: apagada quer dizer que ninguém acha o negócio no Google; acesa quer dizer que ele tem presença digital.

Em construção, por checkpoints. O design aprovado está em [`docs/superpowers/specs/2026-11-08-espelho-3d-design.md`](docs/superpowers/specs/2026-11-08-espelho-3d-design.md).

## Rodar

```bash
npm install
npm run dev      # baixa as fontes do Fontshare (1ª vez) e abre em http://127.0.0.1:5173
npm run build    # gera dist/ (Cloudflare Pages: build "npm run build", saída "dist")
```

Parâmetros úteis na URL (prints e pôster):

- `?t=1.6`: congela a animação de entrada nesse instante.
- `?q=alta|media|baixa`: força a qualidade.
- `?dpr=1`: força a resolução.
- `?az=300`: abre a câmera noutro ângulo.
- `?mov=0`: simula `prefers-reduced-motion`.

## Onde mexer

- `src/data/empresa.ts`: WhatsApp, e-mail, responsável, CNPJ e sócios. Campo vazio = o elemento não aparece.
- `src/data/rua.ts`: cada loja da rua (posição, segmento, status, case, cores, letreiro). Cliente novo = lote novo aqui.
- `src/cena/`: a cena 3D (geometria procedural, luz, pós-processamento, câmera).

## Fontes e licenças

- **Cabinet Grotesk** e **Satoshi** são da ITF Free Font License. Ela permite hospedar no próprio site, mas proíbe alterar o arquivo e distribuí-lo por repositório público. Por isso os arquivos **não estão no git**: `scripts/fontes.mjs` baixa os WOFF2 oficiais do Fontshare a cada build, sem alterar.
- **JetBrains Mono**, **Big Shoulders Display** (letreiros) e **Cinzel** (letreiro da ERK, perto da marca deles) são OFL e vêm pelo npm.
- O nome que o visitante digita no construtor usa só fonte OFL.

## Fotos

As fotos e prints em `public/trabalhos/` são dos clientes reais (ERK Pratas e Vó Neis), com autorização.
