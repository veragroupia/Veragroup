-- Agenda inicial da Vera: 26/10 a 27/11/2026.
-- 15 posts (seg, qua, sex), stories nas terças e quintas e as tarefas que
-- deixam a casa organizada. Follow-ups e reuniões com lead não entram aqui:
-- a aba Agenda lê direto das tabelas followups e reunioes.
--
-- Vídeos sem rosto por padrão (tela, mãos, narração). Onde a credibilidade
-- pede alguém da equipe, o Alaf grava; está marcado no roteiro.

insert into public.agenda (data, hora, tipo, plataforma, titulo, objetivo, roteiro, responsavel, criado_por) values

-- ============================== SEMANA 1 ==============================
('2026-10-26', '08:30', 'tarefa', null, 'Arrumar perfis do Instagram e do TikTok',
 'Quem chega pela prospecção confere o perfil antes de responder',
 '1. Foto: o logo da Vera (V com o ponto vermelho), fundo escuro.
2. Bio (até 150 caracteres):
   Sites, lojas e sistemas para negócios do interior de SP
   Itu · Salto · Sorocaba · Indaiatuba
   Veja trabalhos no ar ↓
3. Link na bio: vera-group.vercel.app
4. Destaques fixos: Trabalhos (ERK e Vó Neis), Preços, Como funciona, Contato.
5. Mesmo @ no Instagram e no TikTok. Conta comercial nos dois.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-26', '18:00', 'post', 'Reels + TikTok', 'Pesquisei "dentista em Itu". Olha quem aparece.',
 'Comentários (a pessoa pede a pesquisa do nicho dela)',
 'FORMATO: gravação de tela do celular, sem rosto. 25 a 35 s.

CENA 1 (0-3 s) · Tela do Google, digitando "dentista em Itu".
Texto na tela: "Seu cliente faz isso antes de te ligar"

CENA 2 (3-15 s) · Rolar o resultado devagar. Círculo nos 3 primeiros: foto, horário, site, botão de WhatsApp.
Narração: "Os três primeiros têm foto, horário, site e WhatsApp. É neles que a pessoa clica."

CENA 3 (15-25 s) · Rolar mais para baixo, achar um sem foto e sem site.
Narração: "Esse aqui pode até ser o melhor dentista da cidade. Mas ninguém vai chegar até ele."

CENA 4 (25-30 s) · Tela preta com o texto:
"Comenta seu ramo e sua cidade que a gente pesquisa pra você."

LEGENDA:
Fizemos o teste que o seu cliente faz todo dia: pesquisar no Google. Quem tem foto, horário e um jeito rápido de chamar leva a ligação. Comenta aqui seu ramo e sua cidade que a gente mostra como você aparece hoje.

#itu #salto #sorocaba #indaiatuba #negociolocal #googlemeunegocio #marketinglocal

DEPOIS DE POSTAR: responder cada comentário com a pesquisa feita (print). Vira lead quente.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-27', '09:00', 'tarefa', null, 'Pedir autorização da ERK e da Vó Neis para o portfólio',
 'Por escrito, antes de usar os projetos nos posts',
 'Mandar no WhatsApp de cada cliente:

"Oi, tudo bem? Aqui é o Alaf, da Vera. A gente quer mostrar o trabalho que fizemos juntos no nosso site e no Instagram, com as telas reais e o nome da loja. Tudo certo pra você? Se puder, manda também uma frase curta sobre como foi trabalhar com a gente. Ajuda muito quem ainda não conhece a Vera."

Guardar o print da resposta. Se mandarem foto do dono, melhor ainda (nunca usar foto gerada).',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-27', '12:00', 'story', 'Story', 'Enquete: seu negócio tem site?',
 'Descobrir quem acompanha o perfil',
 'Story 1: foto de um celular com o Google aberto.
Texto: "Seu negócio tem site?"
Enquete: "Tenho" / "Só Instagram"

Story 2 (no dia seguinte, para quem votou "Só Instagram"): mandar DM perguntando o ramo e a cidade e oferecer a pesquisa do post de segunda.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-27', '14:00', 'tarefa', null, 'Corrigir lead com o nicho errado no banco',
 'Um lead tem o texto inteiro de uma mensagem salvo no campo nicho',
 'No Supabase (projeto vera-prospect), tabela leads: achar o registro em que nicho começa com "Oi, tudo bem? Aqui é o {vendedor}" e trocar por "confeitaria". O painel já esconde esse valor dos filtros, mas ele bagunça as Métricas por nicho.',
 'ombarbieri@gmail.com', 'agenda-inicial'),

('2026-10-28', '10:00', 'tarefa', null, 'Atualizar a tabela de preços da IA de avaliação',
 'A IA sugere mensagens com preços diferentes dos do site',
 'Função avaliar (Supabase › Edge Functions): no texto do SYSTEM, trocar a linha da tabela por:
Landing Express R$ 1.200 (5 dias); Landing com WhatsApp automático R$ 1.800 (7 dias); Site completo R$ 2.500 a R$ 4.000 (14 dias); Automação de WhatsApp R$ 800 (5 dias); Sistema sob medida sob consulta.
Publicar de novo e rodar uma avaliação de teste num lead com conversa.',
 'ombarbieri@gmail.com', 'agenda-inicial'),

('2026-10-28', '18:00', 'post', 'Reels + TikTok', 'Uma joia que você monta e gira na tela',
 'Alcance e salvamento (mostrar que a Vera faz mais que site simples)',
 'FORMATO: gravação de tela do montador da ERK Pratas. Sem rosto. 20 a 30 s.

CENA 1 (0-3 s) · Close na corrente girando em 3D.
Texto: "Isso não é vídeo. É o site."

CENA 2 (3-18 s) · Trocar o elo (cubano → grumet → cartier), o acabamento (polido → oxidado) e a medida. O preço muda junto.
Narração: "Na loja da ERK Pratas, de Salto, o cliente escolhe o elo, a espessura, a medida e o acabamento. A peça muda na hora e o preço é calculado pelo peso da prata."

CENA 3 (18-25 s) · Mostrar o botão de comprar e o celular.
Narração: "Da bancada de Salto para qualquer CEP do Brasil."

FINAL · "Feito pela Vera Group. Sites, lojas e sistemas no interior de SP."

LEGENDA:
A ERK Pratas tem oficina própria em Salto e trabalha com prata 925. A loja online precisava passar o mesmo cuidado da bancada. Então construímos um montador em 3D: o cliente monta a peça e vê o preço antes de comprar. Quer ver de perto? Link na bio.

#salto #joalheria #prata925 #lojaonline #site3d #negociolocal',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-29', '10:00', 'tarefa', null, 'Criar o Perfil da Empresa da Vera no Google',
 'A Vera vende presença no Google: precisa ter a sua',
 'business.google.com › Adicionar empresa.
Nome: Vera Group. Categoria: Designer de sites (secundária: Agência de marketing).
Área atendida: Itu, Salto, Sorocaba, Indaiatuba, Porto Feliz, Tietê.
Site: vera-group.vercel.app. WhatsApp comercial.
Fotos: telas da ERK e da Vó Neis (depois da autorização).
Depois de verificado, pedir avaliação aos dois clientes.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-29', '14:00', 'tarefa', null, 'Ligar o Vera Prospect ao GitHub na Vercel',
 'Hoje o painel só atualiza quando alguém publica à mão',
 'Vercel › projeto vera-prospect › Settings › Git › Connect: repositório veragroupia/Veragroup.
Settings › General › Root Directory: prospect (framework Vite).
As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY já estão cadastradas.
Testar: subir uma mudança pequena e ver o deploy sozinho.',
 'davimpaulino@gmail.com', 'agenda-inicial'),

('2026-10-29', '12:00', 'story', 'Story', 'Bastidor: tela do painel de prospecção',
 'Mostrar que a Vera usa o que vende',
 'Gravar 10 s da tela do Vera Prospect na aba Funil (desfocar nomes e telefones dos leads).
Texto: "Aqui a gente organiza cada conversa. É o mesmo tipo de sistema que fazemos para os clientes."',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-30', '18:00', 'post', 'Reels + TikTok', 'Antes: foto por foto no WhatsApp. Depois: o pedido chega pronto.',
 'Salvamento e compartilhamento entre donos de confeitaria e restaurante',
 'FORMATO: tela dividida, sem rosto. 25 a 35 s.

CENA 1 (0-8 s) · "ANTES": print de conversa de WhatsApp com várias fotos de bolo mandadas uma a uma (montar uma conversa de exemplo, sem dados reais de cliente).
Narração: "Toda confeitaria conhece: o cliente pede o cardápio e você manda foto por foto."

CENA 2 (8-25 s) · "DEPOIS": gravação do cardápio da Vó Neis. Escolher dois bolos, a calda, e tocar em enviar. Mostrar a mensagem chegando pronta no WhatsApp com itens e total.
Narração: "Na Vó Neis, de Salto, o cliente escolhe com foto e preço, e o pedido chega pronto no WhatsApp."

CENA 3 (25-30 s) · Texto: "Quanto tempo isso te devolve por dia?"

LEGENDA:
Antes de cada venda, 10 minutos mandando foto. Depois, o pedido chega pronto, com os itens e o total. Foi isso que fizemos na Vó Neis Confeitaria, em Salto. Marca aqui quem ainda manda o cardápio foto por foto 👇

#confeitaria #salto #cardapiodigital #bolos #whatsapp #negociolocal',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-10-30', '16:00', 'tarefa', null, 'Fechamento da semana',
 '15 minutos olhando os números, sem reunião',
 'No Vera Prospect:
1. Métricas › 7 dias: contatos feitos, taxa de resposta, reuniões.
2. Agenda: algum post da semana ficou sem "postado"? Remarcar.
3. Hoje: zerar os follow-ups vencidos.
4. Anotar no grupo da equipe: 1 coisa que funcionou e 1 para mudar na semana que vem.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

-- ============================== SEMANA 2 ==============================
('2026-11-02', '18:00', 'post', 'Carrossel', '5 coisas que o cliente olha antes de te chamar',
 'Salvamento',
 'FORMATO: carrossel de 7 lâminas (no TikTok, modo foto). Fundo claro, texto preto, um detalhe vermelho.

1. "5 coisas que o cliente olha antes de te chamar"
2. "1. Foto. Sem foto, ele acha que você fechou."
3. "2. Horário. Ninguém liga para saber se está aberto."
4. "3. Endereço no mapa. Para saber se compensa ir até você."
5. "4. Avaliações. Nota 4,5 vale mais que qualquer anúncio."
6. "5. Um jeito rápido de chamar. Botão de WhatsApp, não formulário."
7. "Faltou alguma? A gente arruma tudo isso em 5 dias. Link na bio."

LEGENDA:
Feriado é dia de muita gente pesquisando no celular. Salva para conferir no seu negócio depois.

#negociolocal #googlemeunegocio #dicasdenegocio #itu #salto #sorocaba',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-03', '10:00', 'tarefa', null, 'Ligar o Web Analytics no site da Vera',
 'Saber quantos cliques no WhatsApp vêm de cada mensagem de prospecção',
 'Vercel › projeto vera-group › Analytics › Enable.
Conferir no código se o clique no botão de WhatsApp registra um evento com o parâmetro ?empresa= do link personalizado.
Resultado esperado: ver por empresa quem abriu o link e quem clicou para conversar.',
 'davimpaulino@gmail.com', 'agenda-inicial'),

('2026-11-03', '12:00', 'story', 'Story', 'Caixinha: qual sua maior dúvida sobre ter um site?',
 'Pauta para os próximos posts',
 'Caixinha de perguntas: "Qual sua maior dúvida sobre ter um site?"
Responder as melhores nos stories da semana. As que se repetirem viram post.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-04', '18:00', 'post', 'Reels + TikTok', 'Um dia na Vera',
 'Humanizar a marca (gente de verdade por trás)',
 'FORMATO: sequência de cortes rápidos, sem rosto (mãos, telas, mesa). 20 a 30 s. Música leve.

1. Café e o painel abrindo na aba Hoje.
2. Mãos no celular mandando uma mensagem (desfocar o nome do lead).
3. Tela de código rolando (Davi ou Barbieri programando).
4. Prévia de um site no celular sendo aprovada.
5. Final: "Sites, lojas e sistemas. Feitos aqui no interior."

Texto na tela, de cena em cena: "8h: ver quem respondeu" / "10h: falar com donos de negócio" / "14h: programar" / "17h: mandar a prévia para o cliente".

LEGENDA:
Por trás de cada site tem gente aqui de Salto conversando com o dono do negócio e construindo do zero. Nada de modelo pronto.

#salto #itu #agenciadigital #rotina #bastidores',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-05', '10:00', 'tarefa', null, 'Ajustar o radar pelos números de resposta',
 'Prospectar mais onde o dono responde',
 'Métricas › "Resposta por nicho" e "Resposta por cidade".
Nichos com menos de 10% de resposta depois de 15 contatos: tirar do radar (Configurações › Radar).
Nichos acima de 30%: subir para o começo da lista.
Conferir também se o modelo da primeira mensagem (Configurações › Mensagem) está com menos de 400 caracteres.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-05', '12:00', 'story', 'Story', 'Repost do carrossel + link',
 'Tráfego para o site',
 'Repostar o carrossel de segunda nos stories com a figurinha de link para vera-group.vercel.app.
Texto: "Quer ver como fica no seu ramo? Toca aqui."',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-06', '18:00', 'post', 'Reels + TikTok', 'Quanto custa um site no interior de SP?',
 'Pedir orçamento (preço aberto derruba a principal objeção)',
 'FORMATO: ALAF NA CÂMERA. Assunto de dinheiro pede rosto para passar confiança. 30 a 45 s. Celular na vertical, luz de janela.

ALAF (olhando para a câmera):
"A pergunta que todo dono de negócio faz: quanto custa um site? Aqui na Vera o preço fica na mesa."

(Texto aparecendo ao lado, um por vez)
"Uma página completa, com serviços, fotos, mapa e botão de WhatsApp: R$ 1.200, pronta em 5 dias."
"A mesma página com WhatsApp que responde sozinho as dúvidas mais comuns: R$ 1.800, em 7 dias."
"Site completo, com várias páginas, galeria ou catálogo: de R$ 2.500 a R$ 4.000, em 14 dias."
"E se você já tem site e só quer o WhatsApp automático: R$ 800."

ALAF:
"Antes de começar você recebe tudo por escrito: o que vai ser feito, o prazo e o preço fechado. Sem surpresa no meio. Quer saber qual faz sentido pro seu negócio? Me chama."

LEGENDA:
Preço na mesa, sem "depende". Valores de referência dos projetos mais pedidos, com proposta por escrito antes de começar. Comenta "QUERO" que eu te mando a proposta pro seu ramo.

#quantocustaumsite #site #itu #salto #sorocaba #indaiatuba #negociolocal',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-06', '16:00', 'tarefa', null, 'Fechamento da semana',
 '15 minutos olhando os números, sem reunião',
 'No Vera Prospect:
1. Métricas › 7 dias: contatos feitos, taxa de resposta, reuniões.
2. Agenda: algum post da semana ficou sem "postado"? Remarcar.
3. Hoje: zerar os follow-ups vencidos.
4. Responder todos os "QUERO" do post de preço com a proposta.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

-- ============================== SEMANA 3 ==============================
('2026-11-09', '18:00', 'post', 'Reels + TikTok', 'O erro no WhatsApp que faz você perder cliente',
 'Comentários e pedido de automação (R$ 800)',
 'FORMATO: tela de celular com uma conversa de exemplo (montada, sem dados reais). Sem rosto. 25 a 35 s.

CENA 1 (0-5 s) · Mensagem chegando às 21h47: "Oi, vocês fazem bolo pra sábado?"
Texto: "21h47. Você já fechou."

CENA 2 (5-15 s) · Relógio passando. A mensagem fica sem resposta até 9h do dia seguinte.
Narração: "O cliente não esperou. Às 21h50 ele já tinha mandado a mesma pergunta para o concorrente."

CENA 3 (15-28 s) · Mesma mensagem, agora com resposta automática na hora: horário, cardápio e "amanhã às 9h a gente confirma sua encomenda".
Narração: "Uma resposta automática segura o cliente até você voltar. E responde sozinha o que todo mundo pergunta."

FINAL · "Automação de WhatsApp em 5 dias."

LEGENDA:
Quantas mensagens chegam depois que você fecha? A automação responde na hora o que todo mundo pergunta (horário, preço, cardápio, endereço) e deixa o cliente esperando por você, não pelo concorrente.

#whatsappbusiness #atendimento #negociolocal #automacao #itu #salto',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-10', '10:00', 'tarefa', null, 'Decidir o domínio próprio da Vera',
 'Link .vercel.app em mensagem fria reduz a confiança',
 'Ver se veragroup.com.br (ou parecido) está livre no registro.br.
Decidir com a equipe e registrar.
Depois: apontar na Vercel para o site, e trocar o link na bio, no modelo de mensagem do radar e no og:image do index.html.',
 'ombarbieri@gmail.com', 'agenda-inicial'),

('2026-11-10', '12:00', 'story', 'Story', 'Bastidor: código rodando',
 'Mostrar que tudo é feito do zero',
 '10 s de tela de código ou do terminal publicando um site.
Texto: "Nada de modelo pronto. Cada projeto, do zero."',
 'davimpaulino@gmail.com', 'agenda-inicial'),

('2026-11-11', '18:00', 'post', 'Reels + TikTok', '106 fotos, 31 prontas: como tirar foto do seu produto com o celular',
 'Salvamento (dica útil para qualquer comércio)',
 'FORMATO: tela + mãos fotografando um produto. Sem rosto. 30 a 40 s.

CENA 1 · Texto: "A Vó Neis mandou 106 fotos. 31 estavam prontas para o cardápio."
CENA 2 · Exemplos (fotos de exemplo da equipe, não da loja): fundo bagunçado, embalagem refletindo, luz estourada. Um X vermelho em cada.
Narração: "Os três erros mais comuns: fundo com coisa demais, plástico refletindo e luz forte de cima."
CENA 3 · Mãos montando o jeito certo: mesa clara, perto da janela, produto ocupando o quadro.
Narração: "Mesa clara, luz do dia e o produto ocupando a foto. Só isso já muda tudo."
FINAL · "Salva para a próxima foto."

LEGENDA:
Foto boa vende antes de você abrir a boca. Três regras que deixamos no guia da Vó Neis Confeitaria e que servem para qualquer negócio. Salva e manda para quem tira as fotos aí.

#fotografiadeproduto #dicas #confeitaria #negociolocal #salto',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-12', '10:00', 'tarefa', null, 'Pedir avaliação no Google aos clientes',
 'Avaliação é o selo de confiança mais barato que existe',
 'Depois que o Perfil da Empresa da Vera estiver verificado, mandar o link de avaliação para a ERK Pratas e a Vó Neis:

"Oi! Se puder, deixa uma avaliação da Vera no Google? Leva 1 minuto e ajuda muito quem ainda não conhece a gente: [link]. Obrigado!"',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-12', '12:00', 'story', 'Story', 'Enquete: você responde o WhatsApp depois das 21h?',
 'Gancho para o post de automação',
 'Enquete: "Você responde mensagem de cliente depois das 21h?" "Sempre" / "Só no dia seguinte".
Para quem votar "Só no dia seguinte": DM com o post de segunda.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-13', '18:00', 'post', 'Reels + TikTok', 'Arrume seu perfil do Google em 3 minutos',
 'Alcance e autoridade (dica gratuita de verdade)',
 'FORMATO: gravação de tela do Perfil da Empresa no Google, sem rosto. 35 a 45 s.

Passo a passo narrado:
1. "Categoria certa: é ela que faz você aparecer na pesquisa."
2. "Horário de funcionamento, inclusive feriado."
3. "No mínimo 10 fotos: fachada, interior, produto e equipe."
4. "Botão de WhatsApp ou de agendamento."
5. "Responder todas as avaliações, até as boas."
FINAL · "Se não der tempo, a gente arruma pra você."

LEGENDA:
Antes e depois de um perfil do Google bem feito. É grátis e muda quem te encontra. Salva e faz hoje.

#googlemeunegocio #perfildaempresa #seo #negociolocal #itu #sorocaba',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-13', '16:00', 'tarefa', null, 'Fechamento da semana',
 '15 minutos olhando os números, sem reunião',
 'No Vera Prospect:
1. Métricas › 7 dias: contatos feitos, taxa de resposta, reuniões.
2. Agenda: algum post da semana ficou sem "postado"? Remarcar.
3. Hoje: zerar os follow-ups vencidos.
4. Qual dos posts trouxe mais mensagem? Anotar para repetir o formato.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

-- ============================== SEMANA 4 ==============================
('2026-11-16', '18:00', 'post', 'Reels + TikTok', '3 motivos para o concorrente aparecer antes de você no Google',
 'Comentários',
 'FORMATO: tela do Google com a pesquisa "barbearia em Sorocaba". Sem rosto. 25 a 35 s.

Narração:
"Seu concorrente não é melhor que você. Ele só fez três coisas."
"Um: tem site. O Google confia mais em quem tem endereço próprio na internet."
"Dois: tem avaliação recente. Quem pede avaliação para cada cliente sobe."
"Três: responde rápido. O Google mostra quem atende."
Texto final: "Qual dos três você ainda não tem?"

LEGENDA:
Aparecer primeiro não é sorte. Comenta qual dos três falta aí que a gente te diz por onde começar.

#seo #googlemaps #negociolocal #barbearia #sorocaba #itu',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-17', '12:00', 'story', 'Story', 'Pergunta da semana respondida',
 'Responder uma dúvida real da caixinha',
 'Pegar a pergunta mais repetida da caixinha de 03/11 e responder em 2 ou 3 stories de texto.
Se for sobre preço, mandar para o post de 06/11.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-18', '18:00', 'post', 'Reels + TikTok', 'O painel que diz quanto o dono lucrou no mês',
 'Mostrar o sistema sob medida (ticket maior)',
 'FORMATO: gravação de tela do painel do dono da ERK (com autorização; desfocar valores reais se pedirem). Sem rosto. 25 a 35 s.

CENA 1 · Texto: "Duas perguntas que todo dono faz: o que eu preciso fazer hoje? Quanto eu lucrei este mês?"
CENA 2 · Pedido parado há mais de 48h ficando vermelho.
Narração: "Pedido parado fica vermelho. Ninguém esquece."
CENA 3 · Tabela de peças com margem em verde, amarelo e vermelho.
Narração: "Cada peça com custo, preço e margem. Verde acima de 40%, vermelho abaixo de 20."
CENA 4 · Financeiro do mês.
Narração: "E o lucro do mês, linha por linha, pronto para mandar ao contador."
FINAL · "Sistema sob medida. Feito para o jeito que o seu negócio funciona."

LEGENDA:
Site mostra o seu negócio. Sistema organiza ele. Na ERK Pratas, o dono abre o painel e sabe em segundos o que fazer e quanto ganhou.

#gestao #sistema #empreendedor #salto #joalheria #negociolocal',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-19', '12:00', 'story', 'Story', 'Bastidor: prévia de site sendo aprovada',
 'Mostrar o processo com link de prévia',
 'Gravar a tela de uma prévia de site no celular (projeto em andamento ou exemplo).
Texto: "O cliente acompanha por um link enquanto a gente constrói. Pede ajuste na hora."',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-20', '18:00', 'post', 'Reels + TikTok', 'Como a gente encontra negócios que ainda não têm site',
 'Curiosidade e autoridade',
 'FORMATO: gravação de tela do radar do Vera Prospect. DESFOCAR nomes e telefones. Sem rosto. 20 a 30 s.

Narração:
"Todo dia, o nosso radar pesquisa no Google Maps os negócios de Itu, Salto, Sorocaba e Indaiatuba."
"Ele separa quem não tem site, quem tem muita avaliação e quem atende pelo celular."
"E é assim que a gente chega até você, com uma mensagem que fala do seu negócio, não uma propaganda genérica."
Texto final: "Se você recebeu uma mensagem nossa, agora sabe por quê."

LEGENDA:
Feriado de Consciência Negra e a gente mostrando os bastidores. Não é robô mandando mensagem para todo mundo: é pesquisa de verdade, negócio por negócio.

#bastidores #prospeccao #negociolocal #itu #salto #sorocaba #indaiatuba',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-20', '16:00', 'tarefa', null, 'Fechamento da semana',
 '15 minutos olhando os números, sem reunião',
 'No Vera Prospect:
1. Métricas › 30 dias: comparar com o começo do mês.
2. Agenda: algum post ficou sem "postado"? Remarcar.
3. Hoje: zerar os follow-ups vencidos.
4. Montar a agenda de dezembro: repetir os 3 formatos que mais deram resposta.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

-- ============================== SEMANA 5 ==============================
('2026-11-23', '18:00', 'post', 'Reels + TikTok', 'Só Instagram ou site? A diferença na prática',
 'Comentários e pedido de Landing Express',
 'FORMATO: tela dividida, sem rosto. 25 a 35 s. Usar um negócio de EXEMPLO (montado pela equipe), nunca um cliente real sem autorização.

ESQUERDA · "Só Instagram": pesquisa no Google não acha o perfil; para ver o horário tem que mandar DM; sem mapa.
DIREITA · "Com site": aparece na pesquisa, horário e endereço na primeira tela, botão de WhatsApp.

Narração:
"Instagram é ótimo para quem já te segue. Mas quem pesquisa no Google não te encontra lá."
"O site é a porta para quem ainda não te conhece."
Texto final: "Uma página completa fica pronta em 5 dias."

LEGENDA:
Não é um ou outro: o Instagram conversa com quem já te conhece, o site é encontrado por quem está procurando. Comenta "SITE" que a gente te mostra como ficaria o seu.

#instagram #site #negociolocal #landingpage #itu #salto',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-24', '12:00', 'story', 'Story', 'Contagem para a Black Friday',
 'Lembrar que o cliente vai pesquisar no Google',
 'Story com contagem regressiva (figurinha) para 27/11.
Texto: "Sexta é Black Friday. Seu cliente vai te procurar no Google. Ele vai te achar?"',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-25', '18:00', 'post', 'Reels + TikTok', 'Do primeiro oi ao site no ar',
 'Tirar o medo de "vai dar trabalho pra mim"',
 'FORMATO: ALAF NA CÂMERA (ou narração por cima de telas, se preferir). 30 a 40 s.

ALAF:
"Muita gente acha que fazer site dá trabalho para o dono. Na Vera é assim:"
"Dia 1: a gente conversa e olha como seu negócio aparece hoje no Google, no Maps, no Instagram e no WhatsApp."
"Dia 1 ou 2: você recebe a proposta por escrito, com escopo, prazo e preço fechado."
"De 5 a 14 dias: a gente constrói e você acompanha por um link de prévia, pedindo ajuste na hora."
"No fim: o site no ar, no seu endereço, e a gente segue por perto."
"Você não precisa chegar com nada pronto. Só conhecer o seu negócio."

LEGENDA:
Textos, fotos, endereço do site e publicação ficam com a gente. Você só precisa conhecer o seu negócio. Quer começar? Link na bio.

#comofunciona #site #negociolocal #itu #salto #sorocaba',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-26', '12:00', 'story', 'Story', 'Véspera de Black Friday: checklist rápido',
 'Utilidade e lembrança da marca',
 '3 stories:
1. "Amanhã é Black Friday. 3 coisas para conferir hoje:"
2. "Horário especial atualizado no Google."
3. "Resposta automática no WhatsApp para não perder ninguém à noite."
Último: link para o site da Vera.',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-27', '18:00', 'post', 'Reels + TikTok', 'Black Friday: seu cliente vai te procurar hoje',
 'Urgência sem desconto (regra da Vera: nada de desconto seco)',
 'FORMATO: tela do celular, sem rosto. 15 a 25 s.

CENA 1 · Pesquisa "promoção Black Friday [ramo] Salto" no Google.
Texto: "Hoje muita gente vai fazer essa pesquisa."
CENA 2 · Resultados com site, foto e WhatsApp.
Narração: "Quem aparece com foto, preço e um botão para chamar vende. Quem não aparece não entra nem na disputa."
CENA 3 · Texto: "Para a próxima data, comece hoje. Uma página fica pronta em 5 dias."

LEGENDA:
Black Friday, Natal, Dia das Mães: toda data forte começa com uma pesquisa no Google. Quer estar lá no Natal? Dá tempo. Comenta "NATAL".

#blackfriday #natal #negociolocal #vendas #itu #salto #sorocaba',
 'alafrocha3@gmail.com', 'agenda-inicial'),

('2026-11-27', '16:00', 'tarefa', null, 'Fechamento do mês',
 'Ver o que funcionou e planejar dezembro',
 'No Vera Prospect:
1. Métricas › 30 dias: contatos, respostas, reuniões, fechados e receita mensal.
2. Instagram e TikTok: os 3 posts com mais mensagens e salvamentos.
3. Agenda de dezembro: Natal é a data forte; repetir os formatos que mais deram resposta.
4. Responder todos os "NATAL" do post de hoje.',
 'alafrocha3@gmail.com', 'agenda-inicial');
