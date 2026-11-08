# Vera Group · "O site como prova de competência": design

Revisado em 08/11/2026 a partir do segundo briefing ("VERA GROUP — O SITE COMO PROVA DE COMPETÊNCIA") e do pacote de referências (REFERENCIAS-VERA-3D.md). Ele substitui a primeira versão deste documento, que usava outra marca e outra cena.

Fonte da verdade sobre fatos: o briefing. Nada além dele entra na tela: preços, cases, sócios, cidades e produtos próprios. Telefone, e-mail, responsável e CNPJ não existem ainda e não são inventados.

## Ideia

O próprio site prova que a Vera sabe fazer. É uma rua comercial do interior, à noite, em 3D, e a luz de cada loja é o status dela. A câmera guia o visitante por cinco momentos. Cada serviço da Vera tem um efeito físico visível na rua.

## Marca

- "vera." em Syne 700, letter-spacing -0,02em, ponto dourado. Abertura: as letras sobem uma a uma, com brilho dourado respirando.
- Cores:
  - fundo #05060a; superfícies #09090f, #0d0e16 e #11121c;
  - ouro #c9a96e, ouro claro #e2c48a;
  - texto #f2efe8 (apagado a 50%); bordas em 5,5%, 10% e 16% de branco;
  - sucesso #4ade80; WhatsApp #25d366.
- Syne (títulos), DM Sans (texto), DM Mono (números e selos), todas OFL e locais. Assinatura: "do design ao resultado, para negócios locais".
- Sem gradiente roxo, emoji, número inventado ou frase genérica de agência.

## Os cinco momentos

1. **Cidade**: rua infinita (quarteirões de 45 m + travessa de 9 m, reciclados por índice), carros com semáforo e pedestres que entram nas lojas acesas e passam reto pelas apagadas. Mensagem: "Seu negócio existe. Mas será que estão encontrando ele?". Loja apagada → calculadora de perda (estimativa, fórmula à mostra) e "Acender esta loja".
2. **Trabalhos**: a fachada desliza e o corte desce até o térreo ("maquete em corte").
   - ERK Pratas: corrente de prata física no balcão, que muda com o montador (peça, modelo do elo, comprimento), e celular com as telas reais.
   - Vó Neis: vitrine com os doces reais e cardápio com pedido pelo WhatsApp. Caixa e estoque aparecem com dados fictícios, ditos na tela.
3. **Sua loja**: o visitante digita o nome e um prédio sobe no terreno vazio, com a cor e o letreiro dele.
   - Com chave do Google, busca no Places e mostra dados verificados. Sem chave: simulação, com selo.
   - Serviços e efeitos:
     - site → letreiro acende e celular com prévia;
     - Google → pino e pedestres que vêm;
     - cardápio → vitrine se enche;
     - NFC → plaquinha no balcão;
     - WhatsApp → balões de mensagem.
   - Painel do dono com selo "Simulação".
4. **A Vera perto de você**: mapa 3D estilizado das quatro cidades em posição real, ligadas pela SP-75, e os sócios Otávio Barbieri, Davi Marques e Alaf. Entre rua e mapa há uma cortina, porque estão em lugares diferentes do mundo.
5. **Contato**:
   - Landing Express R$ 690 + R$ 97/mês e Plaquinha NFC R$ 100; o resto é orçamento.
   - Canais só se preenchidos em `src/data/empresa.ts`.

## Telas

- **Desktop**: cena inteira, navegação no topo e painel de vidro à direita. Arrastar anda pela rua, o botão direito gira, a roda aproxima, as setas andam e Esc volta um nível.
- **Celular**: barra Rua · Trabalhos · Sua loja · Contato e bottom sheet com três alturas, que muda de altura em vez de deslizar (para todo o conteúdo caber).
- **Versão leve** (`?modo=2d`, sem WebGL2 ou aparelho fraco): página única com pôster e todas as seções. É decidida antes da primeira pintura.

## Engenharia

- Vite + React 19 + TypeScript; three 0.187, @react-three/fiber 9, drei 10, postprocessing; zustand liga cena e HTML.
- `frameloop="demand"` com metrônomo de 30 qps (60 na alta) e ritmo cheio só em transições.
- Luz dos postes assada nos vértices, sem sombra em tempo real. Luz por loja num uniform. Instancing em pedestres, carros, pinos e reflexos. Letreiros em atlas.
- Bloom a meia resolução. DPR 1,5 no desktop e 1,25 no celular.
- Shaders pré-compilados atrás do pôster. Os objetos que só aparecem depois ficam "visíveis" com escala quase zero, para compilar junto.
- HTML pré-renderizado no build (SEO e leitor de tela), schema LocalBusiness, `/privacidade.html` (sem cookies nem analytics).
- O build falha com texto provisório, link vazio ou teste quebrado.

## Fora do escopo desta versão

- Photorealistic 3D Tiles do Google.
- Troca automática de qualidade por qps medido.
- Canal de contato: a Vera não tem número nem e-mail definidos.
