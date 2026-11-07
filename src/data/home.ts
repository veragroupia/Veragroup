/* Textos fixos da página inicial que vocês podem querer ajustar. */

export const faixa = [
  'Itu',
  'Salto',
  'Sorocaba',
  'Indaiatuba',
  'Landing Express',
  'Loja online',
  'Google Meu Negócio',
  'Plaquinha NFC',
  'WhatsApp com IA revisada por gente',
  'A gente vai até a sua loja',
];

/* Calculadora de perda. Valores iniciais propositalmente baixos. */
export const calculadora = {
  procuram: { inicial: 40, min: 5, max: 1500, passo: 5 },
  ticket: { inicial: 60, min: 10, max: 5000, passo: 10 },
  desistem: { inicial: 10, min: 1, max: 60, passo: 1 },
};

export const passos = [
  {
    titulo: 'A gente vai até a sua loja',
    texto: 'Conversa presencial com quem toca o negócio. Olhamos juntos como você aparece hoje no Google e no WhatsApp.',
    prazo: '[[PREENCHER: em quantos dias a visita acontece]]',
  },
  {
    titulo: 'Você vê o que está perdendo',
    texto: 'Antes de falar de preço, mostramos onde o cliente está escapando e o que dá para mudar.',
    prazo: 'Na mesma visita',
  },
  {
    titulo: 'Construímos, você acompanha',
    texto: 'Você confere a prévia no celular e pede ajustes antes de ir ao ar.',
    prazo: '[[PREENCHER: prazo padrão de entrega]]',
  },
  {
    titulo: 'No ar, com alguém cuidando',
    texto: 'Publicamos e seguimos por perto com a manutenção mensal.',
    prazo: '[[PREENCHER: garantia padrão depois da entrega]]',
  },
];

export const equipe = {
  frase: 'Somos daqui. E a conversa é na sua loja, não por telefone com central.',
  socios: [
    {
      nome: 'Otávio Barbieri',
      papel: '[[PREENCHER: papel do Otávio]]',
      cidade: '[[PREENCHER: cidade do Otávio]]',
      frase: '[[PREENCHER: uma frase do Otávio]]',
      foto: '', // caminho de uma foto real em src/assets/equipe/, opcional
    },
    {
      nome: 'Davi Marques',
      papel: '[[PREENCHER: papel do Davi]]',
      cidade: '[[PREENCHER: cidade do Davi]]',
      frase: '[[PREENCHER: uma frase do Davi]]',
      foto: '',
    },
    {
      nome: 'Alaf',
      papel: '[[PREENCHER: papel do Alaf]]',
      cidade: '[[PREENCHER: cidade do Alaf]]',
      frase: '[[PREENCHER: uma frase do Alaf]]',
      foto: '',
    },
  ],
};

export const faq = [
  {
    p: 'Quanto custa?',
    r: 'Depende do projeto. Dois serviços têm preço fechado: a Landing Express (R$ 690 de implantação + R$ 97 por mês) e a plaquinha NFC de avaliação (R$ 100, já instalada). Site completo, loja online e combos dependem do que o seu negócio precisa, e o orçamento sai na conversa pelo WhatsApp. Parcelamos no cartão, com a taxa da maquininha repassada.',
  },
  {
    p: 'Quanto tempo demora?',
    r: 'O prazo é combinado antes de começar. [[PREENCHER: prazos padrão por serviço]]',
  },
  {
    p: 'Quem atualiza o site depois?',
    r: 'Na Landing Express, ajustes simples entram na mensalidade. Na loja online, você muda produto e preço pelo painel do dono. Para o resto existe a manutenção mensal.',
  },
  {
    p: 'Como funcionam domínio e hospedagem?',
    r: 'Na Landing Express, hospedagem e domínio estão na mensalidade. [[PREENCHER: como funciona nos outros serviços e em nome de quem o domínio fica registrado]]',
  },
  {
    p: 'E a LGPD?',
    r: 'Neste site, nada do que você digita na calculadora ou no construtor sai do seu aparelho até você tocar no botão de WhatsApp, e a medição de visitas só liga se você aceitar. [[PREENCHER: o que vai incluso de LGPD nos sites que vocês entregam (aviso de cookies, política de privacidade)]]',
  },
  {
    p: 'A IA vai responder meus clientes sozinha?',
    r: 'Não. No WhatsApp com IA semiautomática, a IA prepara a resposta e uma pessoa revisa e envia. Nada sai sem alguém aprovar.',
  },
  {
    p: 'Vocês atendem fora dessas quatro cidades?',
    r: '[[PREENCHER: atendem outras cidades? quais?]]',
  },
];
