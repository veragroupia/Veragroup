/* Portfólio da Vera Group.
   Um projeto só aparece no site com autorizado: true.
   Antes de virar true: autorização do cliente por escrito, link no ar conferido
   e os [[PREENCHER]] do projeto resolvidos. */
import type { ImageMetadata } from 'astro';

import erkHome from '../assets/img/erk-home.webp';
import erkMobile from '../assets/img/erk-mobile.webp';
import erkMontar from '../assets/img/erk-montar.webp';
import erkMontarMobile from '../assets/img/erk-montar-mobile.webp';
import erkPeca from '../assets/img/erk-peca.webp';
import erkCatalogo from '../assets/img/erk-catalogo.webp';
import voneisDesktop from '../assets/img/voneis-desktop.webp';
import voneisMobile from '../assets/img/voneis-mobile.webp';
import voneisProdutos from '../assets/img/voneis-mobile-produtos.webp';
import voneisSacola from '../assets/img/voneis-sacola.webp';

export type Tela = { src: ImageMetadata; alt: string; legenda: string; formato: 'computador' | 'celular' };

export type Projeto = {
  slug: string;
  autorizado: boolean;
  nome: string;
  cidade: string;
  segmento: string;
  /** Uma linha: o que o projeto é. */
  resumo: string;
  /** A dor antes da Vera. */
  problema: string;
  /** O que a Vera fez, item por item. */
  feito: string[];
  /** Endereço no ar. */
  link: { url: string; rotulo: string };
  telas: Tela[];
  /** Mostra o visualizador 3D real (só a ERK tem). */
  tem3d?: boolean;
  /** Serviços da Vera ligados a este projeto (slugs de servicos.ts). */
  servicos: string[];
};

export const projetos: Projeto[] = [
  {
    slug: 'erk-pratas',
    autorizado: true,
    nome: 'ERK Pratas',
    cidade: 'Salto',
    segmento: 'Joalheria de prata',
    resumo: 'Loja online com visualização 3D das peças, peças personalizadas e painel do dono.',
    problema:
      'A ERK vendia só pelo Instagram. Não havia um lugar dela para o cliente ver o catálogo inteiro, montar a peça do jeito dele e comprar.',
    feito: [
      'Loja online própria, com catálogo das peças',
      'Visualização 3D das peças, desenhada elo por elo',
      'Montador para o cliente criar a peça personalizada, etapa por etapa',
      'Painel do dono para cuidar da loja sem depender de ninguém',
    ],
    link: { url: 'https://site-production-0686.up.railway.app', rotulo: 'Abrir a loja da ERK' },
    telas: [
      { src: erkHome, formato: 'computador', legenda: 'Página inicial', alt: 'Página inicial da loja ERK Pratas no computador, com uma corrente cubana de prata e os botões Ver o catálogo e Montar a minha peça.' },
      { src: erkMobile, formato: 'celular', legenda: 'A loja no celular', alt: 'A loja ERK Pratas aberta no celular, com o menu compacto e a foto da corrente ocupando a tela.' },
      { src: erkMontar, formato: 'computador', legenda: 'Montador de peças', alt: 'Montador de peças da ERK na etapa 1 de 8, com a corrente em 3D à esquerda e as opções à direita.' },
      { src: erkMontarMobile, formato: 'celular', legenda: 'Montador no celular', alt: 'Montador de peças da ERK no celular: etapa 1 de 8, corrente em 3D e botão Ver em 3D.' },
      { src: erkPeca, formato: 'computador', legenda: 'Página da peça', alt: 'Página da corrente cubana com fotos, medidas e o botão Ver em 3D.' },
      { src: erkCatalogo, formato: 'computador', legenda: 'Catálogo', alt: 'Catálogo da ERK Pratas com filtro por categoria e ordenação.' },
    ],
    tem3d: true,
    servicos: ['loja-online'],
  },
  {
    slug: 'vo-neis',
    autorizado: false,
    nome: 'Vó Neis Confeitaria',
    cidade: 'Salto',
    segmento: 'Confeitaria',
    resumo: 'Cardápio digital das duas lojas, com o pedido montado direto no WhatsApp.',
    problema: '[[PREENCHER: como a Vó Neis recebia pedidos antes do cardápio]]',
    feito: ['Cardápio digital das duas lojas', 'Pedido montado pelo cliente e enviado pronto para o WhatsApp da loja'],
    link: { url: 'https://cardapio-vo-neis.vercel.app', rotulo: 'Abrir o cardápio da Vó Neis' },
    telas: [
      { src: voneisMobile, formato: 'celular', legenda: 'Abre o cardápio da loja', alt: 'Topo do cardápio da Vó Neis no celular, com o logo e as categorias.' },
      { src: voneisProdutos, formato: 'celular', legenda: 'Escolhe com foto e preço', alt: 'Fatias de bolo com fotos reais, preço e botão para adicionar.' },
      { src: voneisSacola, formato: 'celular', legenda: 'O pedido vai pronto para o WhatsApp', alt: 'Sacola com três fatias, escolha de calda, total e botão Pedir via WhatsApp.' },
      { src: voneisDesktop, formato: 'computador', legenda: 'Cardápio no computador', alt: 'Cardápio da Vó Neis no computador, com categorias e produtos.' },
    ],
    servicos: ['site-completo'],
  },
  {
    slug: 'ronaldo-rocha',
    autorizado: false,
    nome: 'Ronaldo Rocha',
    cidade: 'Sorocaba, Campinas e Piracicaba',
    segmento: 'Engenharia civil',
    resumo: 'Site institucional e painel de leads para um engenheiro civil.',
    problema: '[[PREENCHER: qual era o problema antes do site]]',
    feito: ['Site institucional', 'Painel de leads para acompanhar quem pediu contato'],
    link: { url: '[[PREENCHER: link do site do Ronaldo Rocha]]', rotulo: 'Abrir o site' },
    telas: [],
    servicos: ['site-completo'],
  },
  {
    slug: 'tapera',
    autorizado: false,
    nome: 'Taperá Manutenção Odontológica',
    cidade: '[[PREENCHER: cidade da Taperá]]',
    segmento: 'Manutenção de equipamentos odontológicos',
    resumo: 'Conteúdo para Reels, WhatsApp Business e tráfego pago para alcançar clínicas.',
    problema: '[[PREENCHER: qual era o problema antes]]',
    feito: ['Conteúdo para Reels', 'WhatsApp Business configurado', 'Tráfego pago para alcançar clínicas'],
    link: { url: '[[PREENCHER: link do Instagram ou site da Taperá]]', rotulo: 'Ver o perfil' },
    telas: [],
    servicos: ['combos'],
  },
];

export const projetosNoSite = projetos.filter((p) => p.autorizado);

/* Produto próprio. Entra como prova de que a Vera constrói produto de verdade. */
export const veraFinances = {
  nome: 'Vera Finances',
  descricao:
    'Plataforma de finanças pessoais da própria Vera Group, com site e aplicativo. Organiza o orçamento por envelopes: cada real ganha um destino antes de ser gasto.',
  link: '[[PREENCHER: link do Vera Finances]]',
  situacao: '[[PREENCHER: situação hoje (em uso, beta, lançado)]]',
};
