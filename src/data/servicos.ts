/** Serviços da Vera. Preço só nos de entrada; o resto é orçamento. */
export type IdServico = 'landing' | 'site' | 'loja' | 'cardapio' | 'google' | 'nfc' | 'whatsapp' | 'manutencao';

export interface Servico {
  id: IdServico;
  nome: string;
  linha: string;
  preco?: { implantacao: number; mensal?: number; nota?: string };
}

export const servicos: Servico[] = [
  {
    id: 'landing',
    nome: 'Landing Express',
    linha: 'Uma página que mostra o que você vende e leva o cliente para a conversa.',
    preco: { implantacao: 690, mensal: 97 },
  },
  {
    id: 'nfc',
    nome: 'Plaquinha NFC de avaliação',
    linha: 'O cliente encosta o celular e cai direto na avaliação do Google.',
    preco: { implantacao: 100, nota: 'configurada e instalada' },
  },
  { id: 'site', nome: 'Site completo', linha: 'Quantas páginas o negócio precisar, com a sua cara.' },
  { id: 'loja', nome: 'Loja online', linha: 'Catálogo, carrinho e pedido, do jeito que a ERK vende hoje.' },
  { id: 'cardapio', nome: 'Cardápio digital', linha: 'Pedido montado no celular e enviado pelo WhatsApp.' },
  { id: 'google', nome: 'Google Meu Negócio', linha: 'Perfil completo, com foto, horário e resposta às avaliações.' },
  {
    id: 'whatsapp',
    nome: 'WhatsApp com IA',
    linha: 'A IA prepara a resposta, uma pessoa da equipe revisa e envia.',
  },
  { id: 'manutencao', nome: 'Manutenção mensal', linha: 'A gente cuida para continuar no ar e atualizado.' },
];

export const servicosComPreco = servicos.filter((s) => s.preco);
export const servicosSobOrcamento = servicos.filter((s) => !s.preco);
