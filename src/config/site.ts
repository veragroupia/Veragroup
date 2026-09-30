/**
 * Dados da Vera Group usados no site inteiro.
 * Trocar um telefone, uma rede social ou uma cidade é aqui, e só aqui.
 */

export const site = {
  nome: 'Vera Group',
  // Troque quando o domínio próprio existir (e também em astro.config.mjs, const SITE).
  url: 'https://vera-group.vercel.app',
  descricao:
    'Sites, lojas virtuais, cardápios digitais, Google e WhatsApp para o comércio de Itu, Salto, Sorocaba e Indaiatuba.',

  whatsapp: {
    numero: '5511940723507',
    exibicao: '(11) 94072-3507',
    // Mensagem padrão quando a página não define uma própria.
    mensagem: 'Olá! Vim pelo site da Vera Group e quero um diagnóstico gratuito para o meu negócio.',
  },

  instagram: {
    usuario: 'veragroup.ia',
    url: 'https://www.instagram.com/veragroup.ia/',
  },

  // TODO: e-mail comercial. Enquanto estiver vazio, não aparece no site.
  email: '',
  // TODO: CNPJ. Enquanto estiver vazio, não aparece no rodapé nem na política.
  cnpj: '',
  // TODO: cidade-base (só a cidade, sem endereço). Enquanto estiver vazia,
  // o site fala só das cidades atendidas.
  cidadeBase: '',
  estado: 'SP',

  cidades: ['Itu', 'Salto', 'Sorocaba', 'Indaiatuba'] as const,

  socios: [
    { nome: 'Alaf Rocha', iniciais: 'AR', papel: '' }, // TODO: papel de cada sócio e foto real
    { nome: 'Davi Paulino', iniciais: 'DP', papel: '' },
    { nome: 'Otávio Barbieri', iniciais: 'OB', papel: '' },
    // TODO: nome do fundador, como deve aparecer.
  ],

  garantiaDias: 60,
  prazoSiteDias: 10,
} as const;

export type Cidade = (typeof site.cidades)[number];

/** Links de navegação principal. */
export const navegacao = [
  { href: '/servicos', rotulo: 'Serviços' },
  { href: '/portfolio', rotulo: 'Portfólio' },
  { href: '/#como-trabalhamos', rotulo: 'Como trabalhamos' },
  { href: '/sobre', rotulo: 'Sobre' },
  { href: '/contato', rotulo: 'Contato' },
] as const;
