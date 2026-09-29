# Diagnóstico: site portfólio da Vera Group

Documento de trabalho. Reúne as perguntas que um estrategista faria antes de desenhar o site, a resposta que os dados disponíveis dão para cada uma e a decisão tomada. No fim ficam as perguntas que só a Vera Group pode responder.

## De onde veio a informação

| Fonte | O que ela disse |
|---|---|
| Sistema Maestro (skill `vera-group-maestro`) | Oferta, preços, prazos, nichos por dia da semana, cidades, metodologia Dor, Perda, Potencial, Solução |
| Banco `vera-prospect` (Supabase) | Equipe com acesso, cidades e nichos do radar, texto real da primeira mensagem de prospecção |
| Repositório `ERKpratas` e site no ar | Loja online de joalheria em Salto: catálogo, montador de peças por etapas, 3D elo por elo, conta de cliente |
| Repositório `Painel-ERK` | Painel do dono: lucro do mês, pedidos, peças com margem, insumos, financeiro, 11 telas |
| Repositório `Cardapio-vo-neis` e sites no ar | Confeitaria em Salto com duas unidades: cardápio por loja, pedido pronto no WhatsApp, PDV, caixa, ficha técnica, financeiro, fila do iFood |
| Repositório `vera-finances` | Produto próprio em desenvolvimento: finanças pessoais com Open Finance |
| Vercel | Endereços publicados: `cardapio-vo-neis.vercel.app`, `painel-vo-neis.vercel.app`, `vera-prospect.vercel.app` |

## 1. Negócio

**O que a Vera Group vende, de fato?**
No papel: landing page, site e automação de WhatsApp para negócio local. Na prática, o que já foi entregue é bem maior: uma loja online com configurador 3D e painel de gestão, e um sistema completo de confeitaria com caixa, estoque do dia, ficha técnica e integração com iFood.
**Decisão:** o site vende a oferta de entrada (preços claros), mas prova com os sistemas. Quem vê o que foi feito para a ERK e para a Vó Neis entende que uma landing page é o mínimo.

**Para quem?**
Donos de negócio local no interior de São Paulo: Itu, Salto, Sorocaba, Indaiatuba, Porto Feliz, Tietê. Nichos do radar: dentista, clínica de estética, oficina, salão, barbearia, pet shop, academia, restaurante, clínica veterinária, advocacia, farmácia, buffet, escola de idiomas.
**Decisão:** linguagem de balcão, não de agência. Nada de "soluções digitais 360". Frases curtas, exemplos concretos, preço em reais.

**Como o visitante chega?**
Pela mensagem de WhatsApp da prospecção. O texto real diz: "reparei que vocês ainda não têm um site. Hoje muita gente pesquisa '{nicho} em {cidade}' e acaba fechando com quem aparece primeiro".
**Decisão:**
1. O site continua essa conversa. O topo repete a pesquisa (nicho em cidade) em vez de abrir com um slogan genérico.
2. O endereço aceita parâmetros (`?empresa=&nicho=&cidade=`) e personaliza a página para cada prospect. O Maestro pode gerar esse link na mensagem.
3. Celular primeiro: quem clica no WhatsApp abre no navegador do próprio WhatsApp, com pressa.
4. A prévia do link (imagem e título que aparecem no WhatsApp) foi desenhada junto com o site.

**Qual é a objeção número um de quem recebe mensagem fria?**
"Isso é golpe? Quem são esses caras?" Depois: "quanto custa?" e "vai dar trabalho pra mim?".
**Decisão:** cada objeção tem uma resposta visível sem precisar perguntar:
- golpe: trabalhos com link clicável para o site do cliente, no ar agora;
- quem são: cidades atendidas, sistemas próprios, conversa por WhatsApp com gente;
- quanto custa: tabela de preços aberta;
- trabalho: processo em etapas com prazo em dias.

**Qual é a prova mais forte?**
Dois clientes reais de Salto com sistemas que funcionam. Pouca quantidade, muita profundidade.
**Decisão:** a seção se chama "Trabalhos selecionados" e mostra cada case com ficha técnica, números concretos do que foi construído, telas reais e link para o site no ar. O 3D da ERK roda dentro do portfólio (o visitante gira a corrente), usando o código do próprio projeto.

**O que diferencia a Vera das outras agências da região?**
A maioria entrega site institucional em modelo pronto. A Vera entrega sistema: painel com lucro do mês, caixa com conferência, estoque do dia, 3D. E mostra preço.

## 2. Mensagem

**Qual a ordem da página?**
A mesma metodologia que o Maestro usa na abordagem, aplicada ao site:
1. **Dor:** alguém procurou "dentista em Itu" hoje. Encontrou quem?
2. **Perda:** o teste mostra o que o cliente vê de um concorrente completo e de um negócio sem site.
3. **Potencial:** os trabalhos mostram o que é possível.
4. **Solução:** oferta, preço e prazo.

**Falar de inteligência artificial?**
Não. O dono da oficina não compra IA, compra cliente chegando. E o briefing pede zero cara de IA.

**Tom?**
Direto, de quem mostra o serviço feito. Sem travessão, sem superlativo, sem promessa de "primeiro lugar no Google". Tudo que o site afirma pode ser clicado ou conferido.

## 3. Design

**Que identidade usar?**
"Vera" vem do latim *verus*: verdadeiro. O site se comporta como um documento de prova: papel claro, tinta preta, tipografia de jornal, fichas técnicas, numeração. Um único vermelho de sinal, usado como a luz de "no ar" de estúdio de rádio: marca o que está publicado e funcionando.

**O que foi proibido, e por quê?**
- Gradientes (roxo e azul principalmente): viraram a assinatura visual de produto feito por IA. O roxo do painel Vera Prospect fica só no painel.
- Três cards de benefícios: o layout mais repetido da internet. No lugar, listas numeradas, tabelas e fichas.
- Vidro fosco, brilho neon, ícones de emoji, "badges" com estrelinha, números inventados, depoimentos inventados.
- Travessão em qualquer texto.

**Tipografia?**
Archivo (grotesca com eixo de largura, dá títulos firmes sem cara de modelo pronto) e IBM Plex Mono para rótulos, números e fichas. As duas hospedadas no próprio site: carregam rápido e não dependem de serviço externo.

**Onde o Higgsfield entra?**
Em dois lugares onde vídeo gerado não parece gerado:
1. Fundo do topo: luz da manhã passando por folhas numa parede de reboco. Textura humana, sem rosto, sem texto, sem produto.
2. Case Vó Neis: a foto real do bolo Chocolatudo, tirada na loja, ganhou um movimento lento de câmera.
O resto do movimento é código: o 3D real da ERK, o teste de pesquisa, o mapa das cidades.

**Celular?**
Prioridade. Barra fixa de WhatsApp no rodapé depois do topo, textos de 17 px, alvos de toque grandes, nenhum pop-up.

## 4. Operação

**Qual é o botão principal?**
WhatsApp. O formulário do contato só monta a mensagem pronta (nome, negócio, cidade, o que precisa) e abre a conversa.

**Onde hospedar?**
Site estático, sem etapa de build. Serve na Vercel (a conta já existe), GitHub Pages ou qualquer hospedagem.

**Como medir?**
Recomendado: ligar Vercel Web Analytics e contar cliques no WhatsApp por parâmetro de origem (`?empresa=`). Fica como próximo passo.

## 5. Perguntas que só vocês respondem

Estas definem o que falta para o site sair de "muito bom" para "à prova de desconfiança":

1. **Qual é o número de WhatsApp comercial?** Hoje o site usa um número provisório em `assets/js/config.js`. Sem ele, os botões levam para a seção de contato.
2. **Qual domínio?** (ex.: `veragroup.com.br`). Link `.vercel.app` em mensagem fria reduz a confiança.
3. **CNPJ e endereço podem aparecer no rodapé?** É o selo de confiança mais barato que existe.
4. **Querem nomes e fotos da equipe no site?** O banco lista Otávio Barbieri, Alaf Rocha e Davi Paulino. Rosto real vence qualquer frase. As fotos precisam ser reais, nunca geradas.
5. **A prospecção assina como "Lucas".** Quem recebe mensagem do Lucas e não encontra o Lucas no site desconfia. Alinhar persona e equipe.
6. **ERK Pratas e Vó Neis autorizaram o uso no portfólio?** Pedir por escrito e aproveitar para pedir uma frase de depoimento com foto do dono.
7. **Há resultado mensurável?** Pedidos por WhatsApp, vendas pela loja, tempo economizado no fechamento do caixa. Um número real de cliente vale mais que qualquer seção.
8. **Preço público continua?** O site mostra a tabela porque ela derruba a principal objeção. Se preferirem esconder, é uma seção só.
9. **Qual a política depois da entrega?** Suporte, ajustes, mensalidade de hospedagem. O site hoje fala disso de forma genérica.
10. **A ERK vai trocar as fotos de banco por fotos reais das peças?** O case fica ainda mais forte com o produto real.
