# vera. — site da Vera Group

> do design ao resultado, para negócios locais

O site é uma rua comercial do interior, à noite, em 3D. A luz de cada loja é o status dela: quem aparece no Google, tem site e responde no WhatsApp fica aceso. O visitante passa por cinco momentos guiados pela câmera:

| Momento | Endereço | O que acontece |
| --- | --- | --- |
| Cidade | `/` | Rua infinita com carros e pedestres. "Seu negócio existe. Mas será que estão encontrando ele?" Lojas apagadas abrem a calculadora de perda. |
| Trabalhos | `#trabalhos`, `#trabalhos/erk`, `#trabalhos/voneis` | A fachada abre em corte. ERK Pratas: corrente de prata 3D e montador de peça. Vó Neis: cardápio com pedido pelo WhatsApp. |
| Sua loja | `#sua-loja` | O visitante digita o nome e um prédio sobe no terreno vazio. Cada serviço ligado muda a loja (letreiro, pino do Google, vitrine, plaquinha, balões). |
| A Vera perto de você | `#perto` | Mapa 3D de Itu, Salto, Sorocaba e Indaiatuba, com os sócios. |
| Contato | `#contato` | Os dois preços fixos, o que é sob orçamento e os canais de contato (quando existirem). |

Tem também a versão leve, sem 3D (`?modo=2d`). Ela entra sozinha quando o aparelho não tem WebGL2 ou é muito fraco.

## Rodar

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm test           # testes (vitest)
npm run build      # gera dist/ (ver "O que o build faz")
npm run preview    # serve o dist/ em http://127.0.0.1:4173
```

Node 22 ou mais novo.

### Parâmetros úteis na URL

| Parâmetro | Efeito |
| --- | --- |
| `?modo=2d` / `?modo=3d` | força a versão leve, ou força o 3D num aparelho considerado fraco |
| `?q=alta` / `media` / `baixa` | qualidade da cena (o padrão é `media` no celular e `alta` no resto) |
| `?fps=1` | mostra um medidor de quadros por segundo no canto da tela |
| `?t=8` | congela o relógio da cena (para prints) |
| `?mov=0` | simula "reduzir movimento" |

## Configuração

### Dados da empresa: `src/data/empresa.ts`

`whatsapp`, `email`, `responsavel` e `cnpj` estão **vazios**. Todo elemento que depende de um campo vazio simplesmente não aparece: não existe botão de WhatsApp, link de e-mail nem CNPJ na tela, e o schema do Google fica sem telefone. **Hoje o site não tem nenhum canal de contato direto.** O fechamento do "Sua loja" oferece "Copiar o resumo" no lugar do WhatsApp.

Para ligar o WhatsApp, preencha só com dígitos, com DDI e DDD: `whatsapp: '5511999999999'`. Os botões aparecem sozinhos, com mensagem pronta, e o telefone entra no schema LocalBusiness e na página de privacidade.

### Busca no Google (opcional): `VITE_GOOGLE_MAPS_API_KEY`

Sem chave, o "Sua loja" funciona em **modo simulação** e diz isso na tela, com o selo "Simulação". O diagnóstico usa as respostas do próprio visitante.

Com chave, o nome digitado é buscado no Google (Places, `searchByText`, com preferência por um raio de 40 km em volta de Salto). O diagnóstico passa a usar dados reais: nota, avaliações, site, telefone e horário, marcados como "do Google".

1. No Google Cloud, ative **Maps JavaScript API** e **Places API (New)**.
2. Crie uma chave restrita por **referenciador HTTP** (o domínio do site) e por essas duas APIs.
3. Defina `VITE_GOOGLE_MAPS_API_KEY` nas variáveis de ambiente do build (no Cloudflare Pages: Settings → Variables). A chave fica visível no JavaScript, como em todo site com mapa do Google, e é a restrição por domínio que a protege.

## Deploy (Cloudflare Pages)

1. Workers & Pages → Create → Pages → conectar o repositório.
2. Branch de produção: a que for publicada (hoje o trabalho está em `ccr-623052fb-jnf2wc`, PR #4).
3. Framework preset: **None** (ou Vite). Build command: `npm run build`. Output directory: `dist`.
4. Variável `NODE_VERSION` = `22`. Opcional: `VITE_GOOGLE_MAPS_API_KEY`.
5. Com o domínio definido, troque `og:image` em `index.html` por um endereço absoluto (`https://dominio/og.jpg`). Algumas redes não aceitam caminho relativo.

O resultado é estático (HTML, JS, imagens). Não precisa de servidor nem de funções.

## O que o build faz

`npm run build` roda, nesta ordem:

1. `tsc --noEmit`: checagem de tipos.
2. `vitest run`: os testes (ver abaixo). Se um falhar, o build para.
3. `vite build`: gera o site em `dist/`. A cena 3D vai num pedaço separado (`Cena-*.js`), carregado só depois que a página aparece.
4. `vite build --ssr` e `scripts/prerender.mjs`:
   - colocam no `index.html` o HTML já renderizado de todo o conteúdo, para buscador e leitor de tela;
   - colocam o schema `LocalBusiness` (cidades atendidas, sócios, as duas ofertas com preço);
   - completam a página de privacidade.
5. `scripts/verificar-placeholders.mjs dist`: **derruba o build** se qualquer HTML gerado tiver texto provisório ("PREENCHER", "[...]", "em breve", "Lorem", "TODO", "undefined", "NaN"…) ou link vazio.

### Testes (`testes/`)

- Nenhuma seção renderizada tem texto provisório. São nove seções, mais o "Sua loja" com todos os serviços ligados.
- Com `whatsapp`/`email` vazios não existe `wa.me` nem `mailto:`, e CNPJ e responsável não são citados. Preenchidos, os botões aparecem.
- Só Landing Express (R$ 690 + R$ 97/mês) e Plaquinha NFC (R$ 100) têm preço. O resto é orçamento.
- Conta da calculadora, arredondamento e rotas por endereço.

### Pôsteres e imagem de compartilhamento

`public/poster-*.webp` aparecem enquanto a cena carrega. `public/og.jpg` é a imagem de quando o link é compartilhado. Os três são prints da própria cena. Para refazer, com `npm run dev` rodando: `node scripts/posters.mjs` (precisa do Playwright).

## Verdade na tela

| O quê | Status |
| --- | --- |
| Preços (Landing Express, Plaquinha NFC) | reais, do briefing |
| Cases ERK Pratas e Vó Neis | reais e autorizados: fotos e telas dos sistemas entregues |
| Montador da ERK, cardápio da Vó Neis | **demonstração** na tela (selo), com as opções reais dos sistemas |
| Caixa e estoque da Vó Neis | **dados fictícios**, ditos na tela |
| Calculadora de perda | **estimativa**, com a fórmula escrita embaixo |
| Diagnóstico do "Sua loja" | **do Google** com chave; **simulação** sem chave (selo) |
| Painel do dono no "Sua loja" | **simulação** (selo) |
| Sócios e cidades | reais, do briefing |

Não existe número inventado de clientes, avaliações ou resultados.

## Engenharia da cena

Medido nesta máquina, que não tem placa de vídeo (o WebGL roda em software):

- **~175 a 190 draw calls por quadro**, contados direto nas chamadas do WebGL. Uns 15 são passes do pós-processamento (bloom e tom).
  - Os objetos visíveis somam 190 mil triângulos (celular) e 290 mil (desktop), antes do descarte do que está fora da tela.
  - A versão anterior da cena fazia ~260 draw calls.
  - Para chegar nisso:
    - quarteirões fundidos em poucas malhas, com a luz de cada loja num uniform;
    - pedestres, carros, pinos e reflexos instanciados;
    - letreiros num atlas;
    - luz dos postes assada nos vértices, sem sombra em tempo real.
- `frameloop="demand"`: a cena só redesenha quando precisa.
  - A vida ambiente roda a 30 qps (60 na qualidade alta).
  - Câmera e transições rodam em ritmo cheio só enquanto acontecem.
  - A aba escondida para de desenhar.
- Os shaders são pré-compilados atrás do pôster. Abrir os cases e ligar serviços não compila nada novo, o que foi conferido contando os programas do WebGL antes e depois.
- Lighthouse (build de produção):
  - **3D**: Acessibilidade 100, Boas práticas 100, SEO 100. LCP 0,5 s no desktop e 2,2 s no celular, CLS 0.
  - **Versão leve**: Desempenho 96, CLS 0.
  - O "Desempenho" do 3D (~60) mede aqui o WebGL desenhado pelo processador, com a CPU desacelerada 4×. Não representa um celular com GPU.
- JavaScript inicial: ~87 KB gzip. A cena (three.js + R3F): ~390 KB gzip, carregada depois.

## Limitações conhecidas

- **Quadros por segundo em aparelho real não foram medidos.** Este ambiente não tem GPU. Use `?fps=1` num celular intermediário e num desktop para conferir as metas: 45+ qps no celular, 55+ no desktop. Se o celular ficar abaixo, `?q=baixa` tira o bloom e mostra menos quarteirões, pedestres e carros. Dá para tornar essa troca automática.
- **Sem canal de contato** enquanto `whatsapp` e `email` estiverem vazios.
- **Google Places** só funciona com chave. **Photorealistic 3D Tiles** (prédios reais do Google) não foi implementado. O mapa das quatro cidades é estilizado, com posições reais de latitude e longitude.
- A primeira entrada no mapa compila alguns shaders enquanto a cortina está fechada. Num aparelho lento, a tela fica escura um instante a mais.
- O nome digitado no "Sua loja" não é guardado: fechou a aba, sumiu (de propósito, ver `/privacidade.html`).

## Estrutura

```
index.html, privacidade.html
public/          fontes (OFL), fotos dos cases, pôsteres, og.jpg, favicon
src/
  data/          empresa, serviços e preços, cases, cidades, segmentos, lotes da rua
  momentos/      Cidade, Trabalhos, SuaLoja, Perto, Contato (HTML do conteúdo)
  ui/            marca, navegação, painel/bottom sheet, calculadora, abertura
  cena/          tudo do 3D (Cena, Diretor da câmera, quarteirões, lojas, pedestres, carros, mapa…)
  lib/           calculadora, formatação, busca no Google
  estado.ts      estado único (zustand) que liga o HTML e a cena
  rotas.ts       endereço ↔ momento
scripts/         prerender, verificador de texto provisório, pôsteres
testes/          vitest
```

## Fontes e licenças

- Syne, DM Sans e DM Mono (marca e interface): SIL Open Font License, servidas de `public/fontes/` com as licenças ao lado.
- Big Shoulders Display e Cinzel (letreiros das lojas fictícias da rua): SIL Open Font License, via `@fontsource`.
- Fotos e telas da ERK Pratas e da Vó Neis: dos próprios clientes, uso autorizado no portfólio.
