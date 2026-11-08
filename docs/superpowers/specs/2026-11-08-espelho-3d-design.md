# Vera Group · "Espelho 3D da cidade" — design aprovado

Aprovado em 08/11/2026. Fonte da verdade sobre fatos: o briefing do dono (preços, cases, sócios, cidades). Nada além disso entra na tela.

## Ideia

O site é um quarteirão comercial do interior, à noite, em 3D. A luz de cada loja é o status: apagada = ninguém acha no Google; acesa = tem presença digital. Tocar numa loja abre a fachada e mostra o trabalho (ERK Pratas, Vó Neis), a calculadora de perda (lojas genéricas) ou o construtor (terreno vazio).

## Cena

- 8 lotes, 4 de cada lado, escala real (frente de 6 m, pé-direito de 3,2 m). Câmera de lente longa (FOV ~26°), órbita com limites (azimute ±35°, elevação 28–60°), zoom 0,7–1,6×.
- `src/data/rua.ts` descreve cada lote; a cena só lê esse arquivo.
- Fachada com chanfro, toldo, porta de vidro, janelas instanciadas, letreiro em canvas. Pino de status em cima de cada loja, sempre com ícone além da cor.
- Lua direcional fria (1 sombra), 4 postes âmbar como spot para baixo, vitrines emissivas, névoa azul-petróleo, asfalto molhado (reflexo real no modo alto, faixas falsas no modo baixo).
- Corrente da ERK com envMap próprio (RoomEnvironment/PMREM): `MeshPhysicalMaterial` #f2f2f4, metalness 1, roughness 0,18, envMapIntensity 1,4; elos torus 1,6× encaixados a 90°, em catenária.
- Pós: Bloom só acima de 1,0 (luzes acesas), vinheta, SMAA, ACES, sRGB. `PerformanceMonitor` desce: sem bloom → sem sombra → dpr menor (máx. 1,75 no celular).
- Entrada ≤ 3,5 s: rua com postes; ERK acende, depois Vó Neis (rampa curta com leve sobressalto, sem piscar). `prefers-reduced-motion`: cena parada e acesa.

## Telas

- Desktop: cena inteira, marca "Vera.", legenda de status, painel de vidro à direita ao abrir loja.
- Celular: cena inteira, barra Rua · Trabalhos · Sua loja · Contato, painéis em bottom sheet (3 alturas).
- Abaixo da cena: serviços, sócios, contato. Página `/privacidade`.
- Lista de lojas em `<button>` sempre no HTML: teclado, leitor de tela, SEO e versão 2D.

## Calculadora

Perda/mês = procuras × % que desiste × taxa de fechamento do segmento × ticket. A taxa de fechamento é fixa por segmento e aparece escrita na linha da conta. Valores marcados como "estimativa".

## Contato e campos vazios

`src/data/empresa.ts` tem `whatsapp`, `email`, `responsavel`, `cnpj` vazios. Elemento que depende de campo vazio não renderiza. Teste de build falha se o HTML tiver "PREENCHER", "[...]", "em breve", "Lorem".

## Stack

Vite + React 19 + TypeScript; @react-three/fiber 9, drei 10, postprocessing 3; `motion` para painéis; zustand liga cena e HTML. HTML pré-renderizado no build. Cena em chunk separado depois do pôster WebP (gerado da própria cena). Deploy no Cloudflare Pages (o dono liga o repositório no fim).

## Fontes e licenças

- Cabinet Grotesk (títulos) e Satoshi (texto): ITF Free Font License. A licença permite hospedar no próprio site, mas proíbe subset, conversão e distribuição por repositório público. Como este repositório é público, os arquivos **não** vão para o git: `scripts/fontes.mjs` baixa os WOFF2 oficiais do Fontshare no build, sem alterar.
- JetBrains Mono (números) e a fonte dos letreiros: OFL, via npm. Os letreiros e o nome digitado no construtor usam a fonte OFL, para não oferecer fonte do Fontshare a terceiros gerarem conteúdo.

## Checkpoints

1. Plano (feito). 2. Rua + luzes, prints 390×844 e 1440×900. 3. Interação + ERK. 4. Vó Neis, genéricas, construtor, calculadora. 5. Blocos, 2D, SEO, testes, Lighthouse, deploy. 6. Relatório.
