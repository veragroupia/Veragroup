/* Serviços da Vera Group.
   Regra de preço: só os serviços de entrada (Landing Express e plaquinha NFC)
   mostram valor. O resto leva o botão de orçamento no WhatsApp, porque o valor
   é apresentado na conversa, depois de mostrar a perda. */

export type Preco =
  | { tipo: 'mensal'; implantacao: number; mensal: number; mensalidadeInclui: string[] }
  | { tipo: 'unico'; valor: number; nota: string };

export type Servico = {
  slug: string;
  nome: string;
  /** Linha curta para listas. */
  curto: string;
  paraQuem: string;
  inclui: string[];
  preco?: Preco;
  /** Texto honesto de comparação, sem número inventado e sem citar concorrente. */
  comparativo?: string;
  /** Passos específicos do serviço (página /servicos/[slug]). */
  comoFunciona: string[];
  /** Perguntas específicas do serviço. */
  perguntas: { p: string; r: string }[];
  /** Projeto do portfólio que prova este serviço (só aparece se autorizado). */
  prova?: string;
  title: string;
  description: string;
};

export const servicos: Servico[] = [
  {
    slug: 'landing-express',
    nome: 'Landing Express',
    curto: 'Página de vendas rápida para começar a aparecer e receber contato.',
    paraQuem:
      'Para o negócio que ainda não tem site, ou tem um que não traz cliente, e precisa de uma página no ar sem esperar um projeto grande.',
    inclui: [
      'Uma página com o que você vende, onde fica e como chamar no WhatsApp',
      'Feita para abrir rápido no celular, que é onde o seu cliente procura',
      'Botão de WhatsApp com a mensagem já pronta',
    ],
    preco: {
      tipo: 'mensal',
      implantacao: 690,
      mensal: 97,
      mensalidadeInclui: ['Hospedagem', 'Domínio', 'Ajustes simples', '[[PREENCHER: confirmar o que inclui]]'],
    },
    comparativo:
      'Landing pages no mercado costumam custar de algumas centenas a vários milhares de reais. A nossa sai por R$ 690 porque usamos um processo próprio de produção.',
    comoFunciona: [
      'A gente vai até a sua loja e entende o que você vende e para quem.',
      'Montamos a página com os seus serviços, fotos e contato.',
      'Você confere a prévia no celular e pede ajustes.',
      'A página vai ao ar no seu domínio. A mensalidade cobre hospedagem, domínio e ajustes simples.',
    ],
    perguntas: [
      { p: 'O que entra nos R$ 97 por mês?', r: 'Hospedagem, domínio e ajustes simples. [[PREENCHER: confirmar o que inclui e o que é ajuste simples]]' },
      { p: 'Dá para parcelar a implantação?', r: 'Sim, no cartão de crédito. A taxa da maquininha do parcelamento é repassada ao cliente.' },
      { p: 'Em quanto tempo fica no ar?', r: '[[PREENCHER: prazo padrão da Landing Express]]' },
    ],
    title: 'Landing Express: página de vendas por R$ 690 + R$ 97/mês',
    description:
      'Página de vendas rápida para negócios de Itu, Salto, Sorocaba e Indaiatuba. R$ 690 de implantação e R$ 97 por mês com hospedagem, domínio e ajustes simples.',
  },
  {
    slug: 'site-completo',
    nome: 'Site completo',
    curto: 'Várias páginas para mostrar tudo o que o seu negócio faz.',
    paraQuem:
      'Para quem tem vários serviços, atende mais de uma cidade ou precisa explicar mais antes de o cliente chamar.',
    inclui: [
      'Uma página para cada serviço ou área importante do negócio',
      'Pensado para a busca “serviço + cidade” no Google',
      'WhatsApp a um toque em todas as páginas',
    ],
    comoFunciona: [
      'Visita na sua loja para entender o negócio e o que o cliente pergunta.',
      'Mostramos quanto você está perdendo hoje e o que muda com o site.',
      'Orçamento pelo WhatsApp, de acordo com o tamanho do projeto.',
      'Construção com prévia para você acompanhar, e o site no ar.',
    ],
    perguntas: [
      { p: 'Quanto custa?', r: 'Depende do número de páginas e do que o site precisa fazer. O orçamento sai na conversa pelo WhatsApp, e dá para parcelar no cartão.' },
      { p: 'Quem atualiza depois?', r: 'Você pode contratar a manutenção mensal, ou pedir ajustes quando precisar. [[PREENCHER: como funcionam ajustes fora da manutenção]]' },
    ],
    title: 'Site completo para negócios locais',
    description:
      'Site com várias páginas para negócios de Itu, Salto, Sorocaba e Indaiatuba. Orçamento pelo WhatsApp, visita presencial e parcelamento no cartão.',
  },
  {
    slug: 'loja-online',
    nome: 'Loja online',
    curto: 'Catálogo, carrinho, Pix e cartão, com painel do dono.',
    paraQuem: 'Para quem vende produto e hoje depende do direct ou do WhatsApp para fechar cada venda, uma por uma.',
    inclui: [
      'Catálogo com fotos, preços e categorias',
      'Carrinho de compras',
      'Pagamento por Pix e cartão',
      'Painel do dono para cadastrar produtos e acompanhar pedidos',
    ],
    comoFunciona: [
      'Visita na sua loja para conhecer os produtos e como você vende hoje.',
      'Mostramos onde as vendas estão escapando e o que uma loja própria muda.',
      'Orçamento pelo WhatsApp, de acordo com o catálogo e as funções da loja.',
      'Construção, cadastro inicial e a loja no ar, com você usando o painel.',
    ],
    perguntas: [
      { p: 'Quanto custa?', r: 'Depende do tamanho do catálogo e do que a loja precisa fazer. O orçamento sai na conversa pelo WhatsApp, com parcelamento no cartão.' },
      { p: 'Eu consigo mudar preço e produto sozinho?', r: 'Sim. A loja vem com painel do dono para isso.' },
    ],
    prova: 'erk-pratas',
    title: 'Loja online com Pix, cartão e painel do dono',
    description:
      'Loja online para negócios de Itu, Salto, Sorocaba e Indaiatuba: catálogo, carrinho, Pix e cartão e painel do dono. Veja a ERK Pratas no ar.',
  },
  {
    slug: 'combos',
    nome: 'Combo completo',
    curto: 'Site, Google, WhatsApp e manutenção, tudo junto.',
    paraQuem: 'Para quem quer resolver a presença digital de uma vez e não quer cuidar de cada parte separada.',
    inclui: [
      'Site (landing ou completo, conforme o negócio)',
      'Perfil no Google Meu Negócio arrumado',
      'WhatsApp organizado para responder mais rápido',
      'Manutenção mensal',
    ],
    comoFunciona: [
      'Visita na sua loja e diagnóstico de como o negócio aparece hoje.',
      'Montamos o combo com o que faz diferença para o seu caso.',
      'Orçamento pelo WhatsApp.',
      'Implantação por partes e acompanhamento mensal.',
    ],
    perguntas: [
      { p: 'Quanto custa?', r: 'Depende das partes que entram no combo. O orçamento sai na conversa pelo WhatsApp, com parcelamento no cartão.' },
    ],
    title: 'Combo completo: site, Google, WhatsApp e manutenção',
    description:
      'Site, Google Meu Negócio, WhatsApp e manutenção num pacote só, para negócios de Itu, Salto, Sorocaba e Indaiatuba. Orçamento pelo WhatsApp.',
  },
  {
    slug: 'google-meu-negocio',
    nome: 'Google Meu Negócio e SEO local',
    curto: 'Seu negócio aparecendo no mapa e na busca da sua cidade.',
    paraQuem: 'Para quem é procurado por “perto de mim” ou “serviço + cidade” e não aparece, ou aparece com informação errada.',
    inclui: [
      'Perfil do Google criado ou arrumado: categoria, horário, telefone, fotos',
      'Site e perfil apontando um para o outro',
      'Páginas e textos pensados para a busca da sua cidade',
    ],
    comoFunciona: [
      'Olhamos com você como o negócio aparece hoje no Google e no Maps.',
      'Arrumamos o perfil e ligamos ao site.',
      'Ajustamos as páginas para a busca local.',
      'Orientamos como pedir avaliações (a plaquinha NFC ajuda nisso).',
    ],
    perguntas: [
      { p: 'Vocês garantem o primeiro lugar no Google?', r: 'Não. Ninguém pode garantir posição no Google. O que dá para fazer é deixar o perfil completo, correto e com avaliações reais, que é o que o Google usa para decidir.' },
      { p: 'Quanto custa?', r: 'Depende de como o perfil está hoje. O orçamento sai na conversa pelo WhatsApp.' },
    ],
    title: 'Google Meu Negócio e SEO local',
    description:
      'Perfil do Google completo e site preparado para a busca local em Itu, Salto, Sorocaba e Indaiatuba. Sem promessa de primeiro lugar, com trabalho que o Google valoriza.',
  },
  {
    slug: 'plaquinha-nfc',
    nome: 'Plaquinha NFC de avaliação',
    curto: 'O cliente encosta o celular e cai direto na avaliação do Google.',
    paraQuem: 'Para quem atende bem no balcão, mas quase ninguém lembra de avaliar no Google depois.',
    inclui: [
      'Plaquinha NFC configurada com o link de avaliação do seu perfil no Google',
      'Instalação no balcão',
    ],
    preco: { tipo: 'unico', valor: 100, nota: 'Já configurada no seu perfil do Google e instalada no balcão.' },
    comoFunciona: [
      'Configuramos a plaquinha com o link de avaliação do seu perfil no Google.',
      'Instalamos no balcão, onde o cliente paga.',
      'O cliente encosta o celular e abre direto a tela para avaliar.',
    ],
    perguntas: [
      { p: 'Preciso ter perfil no Google?', r: 'Sim, a plaquinha leva para a avaliação do seu perfil. Se você ainda não tem, a gente cria junto com o serviço de Google Meu Negócio.' },
      { p: 'Funciona em qualquer celular?', r: 'Funciona nos celulares com NFC ligado. [[PREENCHER: o que fazer com celular sem NFC]]' },
    ],
    title: 'Plaquinha NFC de avaliação do Google por R$ 100',
    description:
      'Plaquinha NFC configurada no seu perfil do Google e instalada no balcão por R$ 100. O cliente encosta o celular e avalia na hora.',
  },
  {
    slug: 'whatsapp-ia',
    nome: 'WhatsApp com IA semiautomática',
    curto: 'A IA prepara a resposta, uma pessoa da sua equipe revisa e envia.',
    paraQuem: 'Para quem perde cliente porque demora para responder no WhatsApp, mas não quer um robô falando sozinho pela loja.',
    inclui: [
      'Respostas preparadas pela IA a partir das perguntas que a sua loja recebe',
      'Uma pessoa revisa e envia: nada sai sem alguém aprovar',
      'Organização das conversas para ninguém ficar sem resposta',
    ],
    comoFunciona: [
      'Levantamos as perguntas que o seu WhatsApp mais recebe.',
      'Configuramos a IA para preparar as respostas no tom da sua loja.',
      'Sua equipe revisa cada resposta e envia.',
      'Ajustamos com o uso, conforme surgem perguntas novas.',
    ],
    perguntas: [
      { p: 'A IA responde sozinha?', r: 'Não. A IA prepara a resposta e uma pessoa revisa e envia. É assim de propósito: quem fala com o seu cliente é a sua loja.' },
      { p: 'Quanto custa?', r: 'Depende do volume de conversas. O orçamento sai na conversa pelo WhatsApp.' },
    ],
    title: 'WhatsApp com IA semiautomática: a IA prepara, uma pessoa envia',
    description:
      'Responda o WhatsApp mais rápido sem robô falando sozinho: a IA prepara a resposta e a sua equipe revisa e envia. Para negócios de Itu, Salto, Sorocaba e Indaiatuba.',
  },
  {
    slug: 'manutencao',
    nome: 'Manutenção mensal',
    curto: 'Site no ar, atualizado e com alguém cuidando dele.',
    paraQuem: 'Para quem não quer se preocupar com o site depois da entrega.',
    inclui: [
      'Site no ar e funcionando',
      'Ajustes e atualizações combinados por mês',
      '[[PREENCHER: o que mais entra na manutenção]]',
    ],
    comoFunciona: [
      'Você manda a mudança pelo WhatsApp.',
      'A gente ajusta e avisa quando estiver no ar.',
    ],
    perguntas: [
      { p: 'Quanto custa?', r: 'Depende do site e da frequência de mudanças. O orçamento sai na conversa pelo WhatsApp.' },
    ],
    title: 'Manutenção mensal de site',
    description:
      'Manutenção mensal de site para negócios de Itu, Salto, Sorocaba e Indaiatuba: o site no ar, atualizado e com alguém cuidando dele.',
  },
];

export const porSlug = (slug: string) => servicos.find((s) => s.slug === slug);
