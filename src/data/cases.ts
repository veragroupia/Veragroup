/**
 * Cases autorizados. Tudo aqui vem do pacote de referências e dos prints reais em public/trabalhos.
 * Nada de número de resultado inventado.
 */

export interface Tela {
  src: string;
  alt: string;
  formato: 'celular' | 'desktop';
}

export const erk = {
  id: 'erk' as const,
  nome: 'ERK Pratas',
  cidade: 'Salto',
  segmento: 'Joalheria de prata',
  antes: 'Vendia só pelo Instagram.',
  entregas: ['Loja online com corrente 3D girável', 'Montador de peça personalizada', 'Painel do dono'],
  link: 'https://site-production-0686.up.railway.app/',
  telas: [
    { src: '/trabalhos/erk-mobile.webp', alt: 'Página inicial da loja da ERK Pratas no celular', formato: 'celular' },
    { src: '/trabalhos/erk-montar-mobile.webp', alt: 'Montador de peça da ERK Pratas no celular', formato: 'celular' },
    { src: '/trabalhos/erk-home.webp', alt: 'Página inicial da loja da ERK Pratas no computador', formato: 'desktop' },
    { src: '/trabalhos/erk-catalogo.webp', alt: 'Catálogo da ERK Pratas com correntes cubana, grumet e veneziana', formato: 'desktop' },
    { src: '/trabalhos/erk-montar.webp', alt: 'Montador "Monte a sua peça" da ERK Pratas, etapa 1 de 8', formato: 'desktop' },
    { src: '/trabalhos/erk-peca.webp', alt: 'Página de uma peça da ERK Pratas', formato: 'desktop' },
  ] as Tela[],
  /** Etapa 1 do montador real ("Que peça você quer montar?") e modelos do catálogo real. */
  montador: {
    pecas: [
      { id: 'corrente', nome: 'Corrente', faixa: 'de 45 a 70 cm', min: 45, max: 70, padrao: 60, unidade: 'cm' },
      { id: 'pulseira', nome: 'Pulseira', faixa: 'de 18 a 23 cm', min: 18, max: 23, padrao: 20, unidade: 'cm' },
      { id: 'anel', nome: 'Anel', faixa: 'aro 16 a 22', min: 16, max: 22, padrao: 19, unidade: 'aro' },
    ],
    modelos: [
      { id: 'cubana', nome: 'Cubana', descricao: 'Elo cubano' },
      { id: 'grumet', nome: 'Grumet', descricao: 'Elo grumet' },
      { id: 'veneziana', nome: 'Veneziana', descricao: 'Malha veneziana' },
    ],
    nota: 'Na loja de verdade são 8 etapas, e o preço sai do peso da prata, como na bancada.',
  },
};

export interface ItemCardapio {
  nome: string;
  preco: number;
  foto?: string;
}

export const voneis = {
  id: 'voneis' as const,
  nome: 'Vó Neis Confeitaria',
  nomeCurto: 'Vó Neis',
  cidade: 'Salto',
  segmento: 'Confeitaria',
  entregas: ['Cardápio digital', 'Pedido montado direto no WhatsApp', 'Caixa do dia', 'Estoque'],
  telas: [
    { src: '/trabalhos/voneis-mobile.webp', alt: 'Cardápio digital da Vó Neis no celular', formato: 'celular' },
    { src: '/trabalhos/voneis-mobile-produtos.webp', alt: 'Fatias de bolo no cardápio da Vó Neis', formato: 'celular' },
    { src: '/trabalhos/voneis-sacola.webp', alt: 'Sacola do pedido da Vó Neis com o botão Pedir via WhatsApp', formato: 'celular' },
    { src: '/trabalhos/voneis-desktop.webp', alt: 'Cardápio da Vó Neis no computador', formato: 'desktop' },
    { src: '/trabalhos/voneis-desktop-pedido.webp', alt: 'Montando o pedido no cardápio da Vó Neis', formato: 'desktop' },
  ] as Tela[],
  /** Categorias e fatias como aparecem no cardápio real (prints). */
  categorias: ['Fatias de Bolo', 'Potes & Copos', 'Bolos Inteiros', 'Cookies', 'Palha Italiana', 'Pão de Mel', 'Cones', 'Bebidas'],
  fatias: [
    { nome: 'Abacaxi com Coco', preco: 18, foto: '/trabalhos/voneis-bolo-abacaxi.webp' },
    { nome: 'Chocolatudo', preco: 18, foto: '/trabalhos/voneis-bolo-chocolatudo.webp' },
    { nome: 'Doce de Leite com Ninho', preco: 18, foto: '/trabalhos/voneis-bolo-branco-dourado.webp' },
    { nome: 'Floresta Negra', preco: 18, foto: '/trabalhos/voneis-bolo-raspas-chocolate.webp' },
    { nome: 'Olho de Sogra', preco: 18, foto: '/trabalhos/voneis-olho-de-sogra.webp' },
    { nome: 'Choco Ninho', preco: 18 },
    { nome: 'Ninho', preco: 18 },
    { nome: 'Brigadeiro', preco: 18 },
    { nome: 'Bolo Pudim com Doce de Leite', preco: 20 },
  ] as ItemCardapio[],
  caldas: ['Sem', 'Choc.', 'Ninho'],
  /** Fotos reais para a vitrine 3D. */
  vitrine: [
    '/trabalhos/voneis-bolo-chocolatudo.webp',
    '/trabalhos/voneis-bolo-abacaxi.webp',
    '/trabalhos/voneis-bolo-raspas-chocolate.webp',
    '/trabalhos/voneis-olho-de-sogra.webp',
    '/trabalhos/voneis-bolo-branco-dourado.webp',
    '/trabalhos/voneis-cones-doces.webp',
  ],
};

export type IdCase = typeof erk.id | typeof voneis.id;
