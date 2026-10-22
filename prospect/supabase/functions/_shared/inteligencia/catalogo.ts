import type { Solucao } from './tipos.ts'

// Catálogo aprovado: a tabela de preços do site (index.html, seção 04 Preços).
// A tabela config_comercial.catalogo pode substituir esta lista; sem ela, vale esta.
export const CATALOGO_VERSAO_PADRAO = 'site-2026-10'

export interface Oferta {
  id: string; nome: string; preco: string; prazo: string; itens: string
  /** Que tipo de necessidade esta oferta resolve. */
  solucoes: Solucao[]
  ativo?: boolean
}

export const CATALOGO_PADRAO: Oferta[] = [
  { id: 'landing_express', nome: 'Landing Express', preco: 'R$ 1.200', prazo: '5 dias',
    itens: 'Uma página completa para o negócio ser encontrado: serviços, fotos, localização e botão de WhatsApp.',
    solucoes: ['landing_page', 'cardapio_digital'] },
  { id: 'landing_whatsapp', nome: 'Landing com WhatsApp automático', preco: 'R$ 1.800', prazo: '7 dias',
    itens: 'A página e um atendimento automático que responde as dúvidas mais comuns e encaminha o cliente.',
    solucoes: ['landing_page'] },
  { id: 'site_completo', nome: 'Site completo', preco: 'R$ 2.500 a R$ 4.000, conforme o escopo', prazo: '14 dias',
    itens: 'Várias páginas, serviços detalhados, galeria, catálogo ou blog. Para quem precisa mostrar mais.',
    solucoes: ['site_institucional'] },
  { id: 'automacao_whatsapp', nome: 'Automação de WhatsApp', preco: 'R$ 800', prazo: '5 dias',
    itens: 'Para quem já tem site: respostas automáticas, agendamento e lembretes para o cliente.',
    solucoes: ['solucao_pedidos'] },
  { id: 'sistema_sob_medida', nome: 'Sistema sob medida', preco: 'sob consulta', prazo: 'definido na proposta',
    itens: 'Loja online, cardápio com gestão, painel de controle.',
    solucoes: ['solucao_pedidos', 'cardapio_digital'] },
]

/** Projetos reais que a Vera mostra no site. Só nome e o que o site diz, sem resultado inventado. */
export const PORTFOLIO = [
  { nome: 'Vó Neis', descricao: 'Confeitaria. Citada no site da Vera como exemplo de sistema sob medida.' },
  { nome: 'ERK Pratas', descricao: 'Loja de pratas. Citada no site da Vera como exemplo de sistema sob medida.' },
]

export const NOME_SOLUCAO: Record<Solucao, string> = {
  cardapio_digital: 'Cardápio digital', landing_page: 'Landing page', site_institucional: 'Site institucional',
  solucao_pedidos: 'Solução de pedidos', nenhuma: 'Nenhuma oferta agora', indefinida: 'Ainda indefinida',
}

export function ofertasAtivas(catalogo: Oferta[] | null | undefined): Oferta[] {
  const lista = catalogo?.length ? catalogo : CATALOGO_PADRAO
  return lista.filter((o) => o.ativo !== false)
}

/**
 * A oferta só vale se existir no catálogo e combinar com a solução diagnosticada.
 * "nenhuma" e "indefinida" nunca têm oferta.
 */
export function validarOferta(ofertaId: unknown, solucao: Solucao, catalogo: Oferta[]): string | null {
  if (typeof ofertaId !== 'string') return null
  if (solucao === 'nenhuma' || solucao === 'indefinida') return null
  const o = catalogo.find((x) => x.id === ofertaId)
  if (!o) return null
  return o.solucoes.includes(solucao) ? o.id : null
}
