/* Páginas por cidade. Cada uma tem um ângulo próprio, não o mesmo texto com o
   nome trocado. Os fatos sobre as cidades são de conhecimento público; confira
   antes de publicar e ajuste com o que vocês veem no dia a dia de cada uma. */

export type Cidade = {
  slug: string;
  nome: string;
  title: string;
  description: string;
  /** Rótulo curto do ângulo da página. */
  angulo: string;
  /** Título grande; *palavra* vira itálico. */
  h1: string;
  intro: string[];
  /** Pesquisas que mostram como o cliente procura nesta cidade. */
  buscas: string[];
  /** Por que essas buscas importam aqui. */
  leitura: { titulo: string; texto: string };
  /** Serviços mais indicados para o perfil da cidade, em ordem. */
  foco: { slug: string; motivo: string }[];
  /** Projeto do portfólio na cidade (aparece só se autorizado). */
  prova?: string;
  perguntas: { p: string; r: string }[];
};

export const cidades: Cidade[] = [
  {
    slug: 'itu',
    nome: 'Itu',
    title: 'Site e Google para negócios de Itu',
    description:
      'Quem visita Itu escolhe onde comer, comprar e ficar pelo Google. Sites, Google Meu Negócio e avaliações para negócios de Itu, com visita presencial.',
    angulo: 'Cidade turística',
    h1: 'Quem visita Itu não conhece a sua loja. *Conhece o Google.*',
    intro: [
      'Itu recebe visitante o ano inteiro, atraído pelo centro histórico e pela fama de cidade dos exageros. Quem chega de fora não sabe qual é o bom restaurante, a melhor doceria ou a loja certa. Pega o celular e decide pelo que aparece.',
      'Para o turista, o seu perfil no Google é a sua fachada: fotos, horário, avaliações e um jeito rápido de chamar. Se ele não encontra isso, encontra o vizinho.',
    ],
    buscas: ['onde comer em Itu', 'doceria no centro de Itu', 'loja aberta agora em Itu', 'o que fazer em Itu no domingo'],
    leitura: {
      titulo: 'Visitante decide em minutos',
      texto:
        'Quem está de passagem não volta outro dia para comparar. Horário certo no Google, fotos reais e avaliações recentes pesam mais do que qualquer anúncio.',
    },
    foco: [
      { slug: 'google-meu-negocio', motivo: 'Para aparecer no mapa quando o visitante procura perto de onde está.' },
      { slug: 'plaquinha-nfc', motivo: 'Para transformar o atendimento do balcão em avaliação no Google, na hora.' },
      { slug: 'landing-express', motivo: 'Para ter uma página com fotos, horário e WhatsApp que abre rápido no celular.' },
    ],
    perguntas: [
      {
        p: 'Meu público é mais turista do que morador. Faz diferença?',
        r: 'Faz. O morador já conhece você; o turista só conhece o que o Google mostra. Para quem vive de visitante, perfil completo e avaliações costumam ser o primeiro passo.',
      },
      { p: 'Vocês vão até a minha loja em Itu?', r: 'Vamos. A conversa é presencial, na sua loja.' },
    ],
  },
  {
    slug: 'salto',
    nome: 'Salto',
    title: 'Sites e lojas online para negócios de Salto',
    description:
      'A ERK Pratas, de Salto, saiu do Instagram para uma loja online com peças em 3D. Sites, lojas online e Google para negócios de Salto, com visita presencial.',
    angulo: 'Caso no ar na cidade',
    h1: 'Em Salto, tem loja nossa *no ar*. Pode abrir e conferir.',
    intro: [
      'Salto é cidade de comércio de bairro e de gente que compra de quem conhece. Muita loja boa daqui vende só pelo Instagram ou pelo WhatsApp: funciona, mas cada venda depende de alguém responder na hora.',
      'A ERK Pratas era assim. Hoje tem loja online própria, com catálogo, peças em 3D e um montador para o cliente criar a peça do jeito dele.',
    ],
    buscas: ['joalheria em Salto', 'loja de presentes em Salto', 'confeitaria em Salto', 'comprar online de loja de Salto'],
    leitura: {
      titulo: 'Do Instagram para uma loja sua',
      texto:
        'No Instagram, o cliente olha e pergunta. Numa loja online, ele escolhe, monta e compra sem esperar resposta. A ERK é a prova de que dá para fazer isso a partir de Salto.',
    },
    foco: [
      { slug: 'loja-online', motivo: 'Para quem vende produto e quer parar de depender do direct.' },
      { slug: 'site-completo', motivo: 'Para quem precisa mostrar vários serviços e ser achado pela busca da cidade.' },
      { slug: 'whatsapp-ia', motivo: 'Para responder mais rápido sem deixar um robô falar pela loja.' },
    ],
    prova: 'erk-pratas',
    perguntas: [
      {
        p: 'Dá para ver um trabalho de vocês aqui de Salto?',
        r: 'Dá. A loja da ERK Pratas está no ar; o link está nesta página. Você pode abrir e testar como cliente.',
      },
      { p: 'Vocês atendem presencialmente em Salto?', r: 'Sim. A gente vai até a sua loja para conversar.' },
    ],
  },
  {
    slug: 'sorocaba',
    nome: 'Sorocaba',
    title: 'Google Meu Negócio e sites para empresas de Sorocaba',
    description:
      'Em Sorocaba, o cliente escolhe pelo mapa: quem está perto e bem avaliado. Google Meu Negócio, avaliações, sites e WhatsApp para negócios de Sorocaba.',
    angulo: 'Cidade grande, mais concorrência',
    h1: 'Em Sorocaba, o cliente escolhe *pelo mapa*.',
    intro: [
      'Sorocaba é uma das maiores cidades do interior paulista. Para quase todo tipo de negócio existe mais de uma opção no mesmo bairro, e o cliente raramente atravessa a cidade se tem alguém bom perto de casa.',
      'É por isso que a busca “perto de mim” manda tanto aqui. O Google mostra primeiro quem está perto, com perfil completo e com avaliações. Quem não cuida disso fica invisível mesmo estando na esquina.',
    ],
    buscas: ['oficina perto de mim', 'pet shop aberto agora', 'dentista em Sorocaba', 'academia perto de mim'],
    leitura: {
      titulo: 'Concorrência na mesma rua',
      texto:
        'Numa cidade grande, o que separa você do concorrente da outra quadra é o que aparece no celular: nota, número de avaliações, fotos e quanto tempo você leva para responder.',
    },
    foco: [
      { slug: 'google-meu-negocio', motivo: 'Para aparecer no mapa do bairro, que é onde a decisão acontece.' },
      { slug: 'plaquinha-nfc', motivo: 'Para juntar avaliações reais com o cliente ainda no balcão.' },
      { slug: 'whatsapp-ia', motivo: 'Para dar conta do volume de mensagens sem perder cliente por demora.' },
    ],
    perguntas: [
      {
        p: 'Com tanta concorrência em Sorocaba, ainda dá para aparecer?',
        r: 'Ninguém pode prometer primeiro lugar no Google. O que dá para fazer é deixar o seu perfil completo, correto e com avaliações reais, que é o que pesa na busca do bairro.',
      },
      { p: 'Vocês vão até Sorocaba?', r: 'Vamos. A conversa é presencial, na sua loja.' },
    ],
  },
  {
    slug: 'indaiatuba',
    nome: 'Indaiatuba',
    title: 'Sites e Google para negócios de Indaiatuba',
    description:
      'Indaiatuba recebe moradores novos o tempo todo, e quem acabou de chegar procura tudo no Google. Sites, Google Meu Negócio e WhatsApp para negócios de Indaiatuba.',
    angulo: 'Cidade que recebe gente nova',
    h1: 'Quem acabou de mudar para Indaiatuba *procura tudo no Google*.',
    intro: [
      'Indaiatuba cresce com bairros e condomínios novos, e com isso chega gente que ainda não tem o seu dentista, a sua academia, o seu pet shop. Ninguém indicou você para essa pessoa ainda.',
      'Sem indicação, o morador novo faz o que todo mundo faz: pesquisa, compara o que aparece e chama quem responde primeiro.',
    ],
    buscas: ['pet shop em Indaiatuba', 'academia perto de casa', 'dentista em Indaiatuba', 'confeitaria para encomenda em Indaiatuba'],
    leitura: {
      titulo: 'O cliente que ainda não te conhece',
      texto:
        'Para quem já é cliente, você é lembrado. Para quem chegou agora, você precisa ser encontrado. Site claro, perfil no Google e WhatsApp rápido fazem esse primeiro contato acontecer.',
    },
    foco: [
      { slug: 'landing-express', motivo: 'Para ter um endereço na internet que o morador novo encontre e entenda em segundos.' },
      { slug: 'combos', motivo: 'Para resolver site, Google e WhatsApp de uma vez.' },
      { slug: 'site-completo', motivo: 'Para quem tem vários serviços e quer explicar cada um.' },
    ],
    perguntas: [
      {
        p: 'Meu negócio vive de indicação. Ainda preciso de site?',
        r: 'Indicação traz quem já conhece alguém que conhece você. O morador novo ainda não tem essa ponte; ele chega pelo Google. O site e o perfil existem para esse cliente.',
      },
      { p: 'Vocês atendem em Indaiatuba?', r: 'Sim. A gente vai até a sua loja para conversar.' },
    ],
  },
];

export const cidadePorSlug = (slug: string) => cidades.find((c) => c.slug === slug);
