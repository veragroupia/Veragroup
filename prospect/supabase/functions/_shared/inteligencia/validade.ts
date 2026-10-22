/* Validade de sugestões: uma mensagem gerada só vale para o contexto em que nasceu.
   Mudou a conversa, a etapa, o bloqueio, o retorno, a proposta, a temperatura definida pela equipe,
   a memória corrigida pela equipe, o catálogo, as instruções de comunicação ou o prompt:
   a sugestão fica desatualizada. O painel e a função calculam o mesmo hash, com os mesmos dados. */

export interface Contexto {
  ultimaMensagemId: string | null
  totalMensagens: number
  etapa: string
  bloqueado: boolean
  retornoEm: string | null
  propostaStatus: string | null
  catalogoVersao: string
  promptVersion: string
  /** Temperatura definida pela equipe (null = automática). */
  temperaturaManual?: string | null
  /** Quando a equipe corrigiu a memória pela última vez. */
  memoriaEquipeEm?: string | null
  /** Estilo, formalidade, emojis, objetivo e política de prévias da configuração. */
  comunicacao?: string | null
}

/** Hash curto e estável (FNV-1a 32 bits). Não é segurança, é identidade. */
export function hashTexto(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36)
}

export function hashContexto(c: Contexto): string {
  return hashTexto(JSON.stringify([c.ultimaMensagemId, c.totalMensagens, c.etapa, c.bloqueado, c.retornoEm, c.propostaStatus,
    c.catalogoVersao, c.promptVersion, c.temperaturaManual ?? null, c.memoriaEquipeEm ?? null, c.comunicacao ?? null]))
}

/** Parte da configuração que muda o jeito de escrever: mudou, as mensagens antigas ficam desatualizadas. */
export function assinaturaComunicacao(c: { estilo: string; formalidade: string; emojis: string; objetivo: string; politica_previas: string; preferir_qualificacao: boolean }) {
  return [c.estilo, c.formalidade, c.emojis, c.objetivo, c.politica_previas, c.preferir_qualificacao].join('|')
}

export interface SugestaoMin {
  created_at: string
  contexto_hash?: string | null
  etapa?: string | null
  prompt_version?: string | null
  catalogo_versao?: string | null
  status?: string | null
  enviada_confirmada_em?: string | null
}

export interface ContextoLeve {
  /** Hash do contexto atual, quando a tela tem todos os dados (painel do lead, tela Hoje). */
  hashAtual?: string | null
  /** Momento da última mensagem do lead ou nossa (ultimo_contato_em / ultima_resposta_em ou a própria conversa). */
  ultimaAtividade: string | null
  etapa: string
  bloqueado: boolean
  promptVersion: string
  catalogoVersao: string
}

export type MotivoObsoleta = 'mensagem_nova' | 'etapa_mudou' | 'bloqueado' | 'versao' | 'ja_enviada' | 'contexto' | null

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
  // Rascunho v5 carrega o hash do contexto: qualquer mudança relevante o invalida, mesmo sem mensagem nova.
  if (c.hashAtual && s.contexto_hash && s.prompt_version === c.promptVersion && s.contexto_hash !== c.hashAtual) return 'contexto'
  return null
}

export const TEXTO_OBSOLETA: Record<Exclude<MotivoObsoleta, null>, string> = {
  mensagem_nova: 'Chegou mensagem nova depois desta sugestão.',
  etapa_mudou: 'A etapa do lead mudou depois desta sugestão.',
  bloqueado: 'O contato está bloqueado.',
  versao: 'O catálogo ou as instruções da IA mudaram.',
  ja_enviada: 'Esta mensagem já foi enviada.',
  contexto: 'O contexto do lead mudou (temperatura, memória, proposta, retorno ou configuração).',
}

/** Maior data entre as fornecidas (ignora vazias). */
export function maisRecente(...ds: (string | null | undefined)[]): string | null {
  const v = ds.filter(Boolean).map((d) => new Date(d!).getTime())
  return v.length ? new Date(Math.max(...v)).toISOString() : null
}
