# Reformulação do site da Vera Group · entrega

Site reconstruído do zero sobre a identidade que já existia: a marca "Vera." com o ponto vermelho e o vermelho `#D4371C` como único acento. Ele segue a ordem do método de venda (dor → perda → potencial → solução), roda quase sem JavaScript e tem um modo próprio para demonstração na loja do cliente.

## 1. Mapa do site

| Página | O que tem |
|---|---|
| `/` | Topo (dor) · faixa de cidades e serviços · calculadora de perda (perda) · construtor ao vivo (potencial) · portfólio com o 3D da ERK (prova) · serviços (solução) · como funciona · quem somos + Vera Finances · dúvidas · fechamento |
| `/?demo=1` | Modo demonstração: sem menu e sem rodapé, letra e botões maiores, abre no construtor, sequência construtor → portfólio → calculadora, botão "Mandar no meu WhatsApp" |
| `/portfolio` | Cada projeto autorizado completo (problema → o que fizemos → link no ar), todas as telas reais, 3D, Vera Finances |
| `/servicos` e `/servicos/[slug]` | 8 serviços, cada um com para quem é, o que inclui, como funciona, preço (só nos de entrada) ou orçamento, perguntas e schema `Service` |
| `/itu`, `/salto`, `/sorocaba`, `/indaiatuba` | Uma página por cidade, cada uma com um ângulo próprio (veja a seção 7) |
| `/previa?n=&s=&c=` | A prévia montada no construtor, para mandar ao cliente. Fora do Google (`noindex`) |
| `/privacidade` | Política de privacidade (LGPD) |
| `/sitemap-index.xml`, `/robots.txt` | Gerados no build a partir de `src/data/empresa.ts` |

## 2. O que mudou em relação ao site anterior

| Antes | Agora |
|---|---|
| Site estático num arquivo HTML só | Astro (gerador estático): componentes, páginas por cidade e serviço, dados em arquivos separados. Continua saindo HTML puro |
| Archivo + IBM Plex Mono | Instrument Serif nos títulos, Geist no texto, Geist Mono em números e rótulos. A marca "Vera." manteve o desenho original (virou SVG, sem baixar a fonte antiga) |
| Topo com vídeo gerado no Higgsfield | Topo com um celular onde um site se monta bloco por bloco, de verdade, no navegador |
| Tabela com 5 preços (R$ 1.200, R$ 1.800, R$ 2.500 a 4.000, R$ 800) | Preço só na Landing Express (R$ 690 + R$ 97/mês) e na plaquinha NFC (R$ 100). O resto pede orçamento no WhatsApp |
| ERK e Vó Neis no portfólio, Vera Prospect na seção "dentro de casa" | Só a ERK aparece (`autorizado: true`). Vó Neis, Ronaldo Rocha e Taperá estão nos dados com `autorizado: false`. Vera Prospect saiu |
| 6 cidades (com Porto Feliz e Tietê) | As 4 do briefing, cada uma com página própria |
| Formulário que montava a mensagem | Calculadora de perda e construtor ao vivo, os dois com a mensagem do WhatsApp pronta |
| Sem schema de serviço, sem sitemap | `ProfessionalService` (LocalBusiness) com `areaServed` nas 4 cidades, `Service` por serviço, `FAQPage`, `BreadcrumbList`, sitemap, robots, imagem de prévia própria por página |

### O 3D da ERK: preservado e melhorado

É o mesmo código do visualizador entregue para a ERK (`src/scripts/erk-3d.js`), com os mesmos 5 elos e 3 acabamentos. Mudou só a forma de carregar:

- three.js empacotado só com o que o visualizador usa: de 649 KB para 454 KB (115 KB comprimido);
- carrega depois de todo o conteúdo e nunca entra na primeira pintura;
- antes de carregar aparece uma imagem real do próprio 3D;
- em 4G fraco, no modo economia de dados e no modo demo, só carrega quando a pessoa toca em "Girar em 3D".

Os prints de antes e depois foram enviados junto com esta entrega (`antes-3d-390.png` e `depois-3d-390.png`).

## 3. Verificação

**Teste de ponta a ponta** (`npm run testar`, com o site rodando em `npm run preview`). Passa em tudo:

- construtor com os 7 segmentos (confeitaria, odontologia, oficina, pet shop, academia, advocacia, loja): blocos, botão, nome, cor e mensagem do WhatsApp;
- nenhum preço ou estrela inventado em nenhuma prévia;
- link da prévia abre igual em outra aba, e nome com HTML é escapado;
- calculadora: 100 × 20% × R$ 50 = R$ 1.000/mês e R$ 12.000/ano, com a conta visível;
- modo demo: menu, rodapé e topo escondidos, ordem construtor → portfólio → calculadora, botões de 62 px, 3D esperando toque, "Mandar no meu WhatsApp" indo para o número do cliente com o link da prévia;
- eventos de conversão registrados, sem nunca levar o que a pessoa digitou;
- nenhum script do Google sem consentimento;
- todas as 18 páginas abrem, com `alt` em todas as imagens, sem rolagem lateral em 390 px e sem erro no console;
- nenhum `[[PREENCHER]]` vaza para title, meta ou schema.

**Lighthouse mobile** (Lighthouse 13.6, 4G simulado, relatório completo da página inicial em [`lighthouse/home-mobile.html`](lighthouse/home-mobile.html)):

| Página | Desempenho | Acessibilidade | Boas práticas | SEO | FCP | LCP | TBT | CLS | Peso |
|---|---|---|---|---|---|---|---|---|---|
| / | 100 | 100 | 100 | 100 | 0,8 s | 0,8 s | 50 ms | 0 | 128 KiB |
| /portfolio | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 10 ms | 0 | 173 KiB |
| /servicos | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 30 ms | 0 | 106 KiB |
| /servicos/landing-express | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 0 ms | 0 | 105 KiB |
| /servicos/plaquinha-nfc | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 0 ms | 0 | 104 KiB |
| /itu | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 20 ms | 0 | 105 KiB |
| /salto | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 40 ms | 0 | 115 KiB |
| /sorocaba | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 0 ms | 0 | 105 KiB |
| /indaiatuba | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 0 ms | 0 | 105 KiB |
| /privacidade | 100 | 100 | 100 | 100 | 0,6 s | 0,6 s | 10 ms | 0 | 103 KiB |

Medido no build local servido com compressão. Vale repetir no endereço publicado depois do deploy.

## 4. O que falta preencher

Rode `npm run check:preencher` para a lista atualizada, com arquivo e linha. Hoje são 41 marcadores. No site, cada um aparece destacado em vermelho tracejado.

**Empresa** (`src/data/empresa.ts`)
- nome do responsável (rodapé e privacidade)
- WhatsApp comercial com 55 e DDD (sem ele, os botões abrem o WhatsApp para a pessoa escolher a conversa)
- e-mail comercial
- link das avaliações da Vera no Google
- ferramenta de medição: ID do GA4 (`ga4`) ou do GTM (`gtm`)
- oferta de lançamento: nome, condição, data final, vagas e preço depois (fica desligada com `ativa: false`)

**Página inicial** (`src/data/home.ts`)
- prazos dos 4 passos: em quantos dias a visita acontece, prazo padrão de entrega, garantia padrão
- papel, cidade e uma frase de cada sócio (Otávio, Davi e Alaf)
- dúvidas: prazos padrão por serviço; domínio e hospedagem fora da Landing (e em nome de quem o domínio fica); o que vai incluso de LGPD nos sites entregues; se atendem outras cidades

**Serviços** (`src/data/servicos.ts`)
- Landing Express: confirmar o que entra nos R$ 97/mês e o que é "ajuste simples"; prazo padrão
- Site completo: como funcionam ajustes fora da manutenção
- Plaquinha NFC: o que fazer com celular sem NFC
- Manutenção: o que mais entra

**Portfólio** (`src/data/portfolio.ts`)
- Vó Neis: como recebia pedidos antes
- Ronaldo Rocha: problema antes do site; link do site
- Taperá: cidade; problema antes; link
- Vera Finances: link e situação (em uso, beta, lançado)

**Privacidade** (`src/pages/privacidade.astro`)
- por quanto tempo vocês guardam as conversas e os dados de quem chama no WhatsApp

**Fotos dos sócios (opcional):** coloque a foto real em `src/assets/equipe/` ou em `public/` e o caminho no campo `foto` de cada sócio em `src/data/home.ts`. Sem foto, a seção funciona só com o texto.

## 5. Projetos com `autorizado: false`

Estão nos dados, completos até onde o briefing permitiu, e não aparecem em lugar nenhum do site:

1. **Vó Neis Confeitaria** (Salto): cardápio digital das duas lojas, pedido montado no WhatsApp. Já tem link e 4 telas reais.
2. **Ronaldo Rocha** (Sorocaba, Campinas e Piracicaba): site institucional e painel de leads. Faltam link e telas.
3. **Taperá Manutenção Odontológica**: Reels, WhatsApp Business e tráfego pago. Faltam cidade, link e telas.

Para liberar: autorização do cliente por escrito, preencher os `[[PREENCHER]]` do projeto e trocar para `autorizado: true`.

## 6. Suposições e decisões para conferir

1. **Preços no sistema de prospecção.** O Maestro (n8n) ainda tem na tabela de produtos Landing Express a R$ 1.200, Landing + WhatsApp a R$ 1.800, Site a R$ 2.500–4.000 e Automação a R$ 800. O site agora diz R$ 690 + R$ 97/mês. Se a mensagem de prospecção citar o preço antigo, o cliente vê dois preços diferentes. Vale alinhar o Maestro.
2. **Nomes da equipe.** O banco de prospecção listava "Alaf Rocha" e "Davi Paulino"; usei o que o briefing diz: Davi Marques e Alaf. A prospecção assina como "Lucas", que não aparece no site.
3. **Identidade.** Mantive a marca e o vermelho. O papel passou de `#F2EFE8` para `#F4F1EA` (o do briefing, quase igual). Para texto pequeno em vermelho uso `#B52B16`, porque o `#D4371C` sobre o papel não passa no contraste AA em letra pequena.
4. **Fatos da ERK.** Usei o briefing e o que as telas reais mostram (montador "etapa 1 de 8"). Tirei os números do site antigo que não estão no briefing (como "11 telas no painel").
5. **Vera Finances.** O site antigo dizia "Open Finance" e "em desenvolvimento"; o briefing diz orçamento por envelopes. Fiquei com o briefing e deixei a situação como marcador.
6. **"O que inclui"** de Site completo, Combo, Google Meu Negócio, WhatsApp com IA e Manutenção foi escrito a partir da descrição curta do briefing. Confiram se é isso mesmo que entregam.
7. **Passo 2 do "Como funciona"** diz que a perda é mostrada "na mesma visita". Se não for assim, ajustem em `src/data/home.ts`.
8. **Páginas por cidade** usam conhecimento público: Itu turística, centro histórico e "cidade dos exageros"; Salto com a ERK no ar; Sorocaba como uma das maiores cidades do interior; Indaiatuba recebendo moradores e bairros novos. Revisem com o olhar de quem conhece as cidades.
9. **Calculadora:** valores iniciais escolhidos baixos de propósito: 40 pessoas por mês, ticket de R$ 60 e 10% de desistência (R$ 240/mês).
10. **Construtor:** as 8 cores e os textos de cada segmento são meus. Nenhum modelo tem preço, estrela, endereço ou horário: o que é do cliente aparece como espaço reservado.
11. **Banner de cookies:** só aparece quando existir GA4 ou GTM configurado. Sem ferramenta de medição o site não grava cookie, então pedir consentimento seria pedir por nada. Os eventos (`whatsapp_clique`, `calculadora_uso`, `construtor_uso`, `construtor_quero`, `demo_envio`, `previa_quero`) já vão para o `dataLayer` e passam a ser enviados assim que o ID entrar e o visitante aceitar.
12. **Vídeos do Higgsfield** saíram: o topo mudou de conceito e o da Vó Neis estava num case que agora está oculto.
13. **Domínio:** continua `vera-group.vercel.app` em `src/data/empresa.ts` (`url`). Quando ligar o domínio próprio, troque lá e rode `npm run og` de novo.
14. **Link da ERK** aponta para `site-production-0686.up.railway.app`. Se a ERK tiver domínio próprio, troque em `src/data/portfolio.ts`.
15. **Deploy:** o `vercel.json` agora diz para a Vercel rodar `npm run build` (Astro) e publicar `dist/`. Antes o projeto não tinha etapa de build. Confiram o primeiro deploy.

## 7. As páginas por cidade, lado a lado

| Cidade | Ângulo | Serviços em destaque |
|---|---|---|
| Itu | Cidade turística: o visitante decide pelo Google | Google Meu Negócio, plaquinha NFC, Landing Express |
| Salto | Caso no ar na cidade: a ERK | Loja online, site completo, WhatsApp com IA |
| Sorocaba | Cidade grande, mais concorrência: decide-se pelo mapa do bairro | Google Meu Negócio, plaquinha NFC, WhatsApp com IA |
| Indaiatuba | Cidade que recebe gente nova, que ainda não conhece ninguém | Landing Express, combo, site completo |

## 8. Onde editar cada coisa

| Quero mudar | Arquivo |
|---|---|
| Contatos, responsável, CNPJ, domínio, medição, oferta | `src/data/empresa.ts` |
| Projetos do portfólio e a flag `autorizado` | `src/data/portfolio.ts` |
| Serviços, preços, o que inclui, perguntas | `src/data/servicos.ts` |
| Páginas por cidade | `src/data/cidades.ts` |
| Segmentos e cores do construtor | `src/data/construtor.ts` |
| Faixa, calculadora, passos, equipe, dúvidas | `src/data/home.ts` |
| Imagens de prévia de link | `npm run og` (gera `public/og/`) |
