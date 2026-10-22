/* Validade de sugestões: uma mensagem gerada só vale para o contexto em que nasceu.
   Mudou a conversa, a etapa, o bloqueio, o retorno, a proposta, o catálogo ou o prompt: a sugestão fica desatualizada. */

export interface Contexto {
  ultimaMensagemId: string | null
  totalMensagens: number
  etapa: string
  bloqueado: boolean
  retornoEm: string | null
  propostaStatus: string | null
  catalogoVersao: string
  promptVersion: string
  observacao?: string | null
}

/** Hash curto e estável (FNV-1a 32 bits) do contexto. Não é segurança, é identidade. */
export function hashContexto(c: Contexto): string {
  const s = JSON.stringify([c.ultimaMensagemId, c.totalMensagens, c.etapa, c.bloqueado, c.retornoEm, c.propostaStatus, c.catalogoVersao, c.promptVersion, (c.observacao ?? '').trim()])
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36)
}

export interface SugestaoMin {
  created_at: string
  etapa?: string | null
  prompt_version?: string | null
  catalogo_versao?: string | null
  status?: string | null
  enviada_confirmada_em?: string | null
}

export interface ContextoLeve {
  /** Momento da última mensagem do lead ou nossa (ultimo_contato_em / ultima_resposta_em ou a própria conversa). */
  ultimaAtividade: string | null
  etapa: string
  bloqueado: boolean
  promptVersion: string
  catalogoVersao: string
}

export type MotivoObsoleta = 'mensagem_nova' | 'etapa_mudou' | 'bloqueado' | 'versao' | 'ja_enviada' | null

/**
 * Por que a sugestão não vale mais (null = ainda vale). Serve para a tela Hoje, o painel e o detalhe do lead,
 * sem precisar carregar a conversa inteira.
 */
export function motivoObsoleta(s: SugestaoMin, c: ContextoLeve): MotivoObsoleta {
  if (c.bloqueado) return 'bloqueado'
  if (s.enviada_confirmada_em) return 'ja_enviada'
  if (c.ultimaAtividade && new Date(c.ultimaAtividade) > new Date(s.created_at)) return 'mensagem_nova'
  if (s.etapa && s.etapa !== c.etapa) return 'etapa_mudou'
  // Rascunhos antigos (sem versão gravada) continuam valendo pelo critério de data.
  if (s.prompt_version && s.prompt_version !== c.promptVersion) return 'versao'
  if (s.catalogo_versao && s.catalogo_versao !== c.catalogoVersao) return 'versao'
  return null
}

export const TEXTO_OBSOLETA: Record<Exclude<MotivoObsoleta, null>, string> = {
  mensagem_nova: 'Chegou mensagem nova depois desta sugestão.',
  etapa_mudou: 'A etapa do lead mudou depois desta sugestão.',
  bloqueado: 'O contato está bloqueado.',
  versao: 'O catálogo ou as instruções da IA mudaram.',
  ja_enviada: 'Esta mensagem já foi enviada.',
}

/** Maior data entre as fornecidas (ignora vazias). */
export function maisRecente(...ds: (string | null | undefined)[]): string | null {
  const v = ds.filter(Boolean).map((d) => new Date(d!).getTime())
  return v.length ? new Date(Math.max(...v)).toISOString() : null
}
