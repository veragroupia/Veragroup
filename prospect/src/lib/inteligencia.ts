import { supabase, chamarFuncao } from './supabase'
import { invalidar, q, useConsulta } from './dados'
import type { Lead, Membro, Mensagem, RascunhoIA } from './tipos'
import { lerConfig, type ConfigComercial } from '../../supabase/functions/_shared/inteligencia/config.ts'
import { avaliarLead, hashDoLead, type Recomendacao } from '../../supabase/functions/_shared/inteligencia/avaliar.ts'
import { telefoneChave } from '../../supabase/functions/_shared/inteligencia/conversa.ts'
import { maisRecente, motivoObsoleta, type MotivoObsoleta } from '../../supabase/functions/_shared/inteligencia/validade.ts'
import type { Analise, MemoriaComercial, MemoriaEquipe } from '../../supabase/functions/_shared/inteligencia/analise.ts'
import { PROMPT_VERSION, type Acao, type Bloqueio, type Confianca, type EstadoContato, type Estagio, type JanelaContato, type Sinal, type Temperatura } from '../../supabase/functions/_shared/inteligencia/tipos.ts'

export { PROMPT_VERSION, type Recomendacao, type Temperatura, type Acao, type JanelaContato, type ConfigComercial, type MotivoObsoleta, type MemoriaEquipe }

/* Ponte entre o painel e a Vera Sales Intelligence: leitura das tabelas, correções manuais da equipe,
   bloqueio de contato e a avaliação por regras que roda no navegador (sem custo de IA). */

export interface LeadIntel {
  lead_id: string
  temperatura: Temperatura | null; score_interesse: number | null; score_adequacao: number | null
  confianca: Confianca | null; estado: EstadoContato | null; estagio: Estagio | null
  necessidade: string | null; solucao: string | null; oferta_id: string | null
  sinais: Sinal[]; conhecido: { fato: string; fonte: string; evidencia_id: string | null }[]; desconhecido: string[]
  pergunta_prioritaria: string | null; proxima_acao: Acao | null; motivo: string | null; janela: JanelaContato | null
  analise: Analise | null; resumo: string | null; contexto_hash: string | null; ultima_mensagem_id: string | null
  prompt_version: string | null; modelo: string | null; analisado_em: string | null
  temperatura_manual: Temperatura | null; temperatura_manual_nota: string | null; temperatura_manual_por: string | null; temperatura_manual_em: string | null
  retorno_em: string | null; retorno_nota: string | null; retorno_por: string | null
  contato_liberado_em: string | null; contato_liberado_por: string | null
  // v5 (migration 0005). Opcionais: sem a migration, ficam ausentes.
  memoria?: MemoriaComercial | null; diretrizes?: unknown; sinais_desconsiderados?: unknown[]; cache_chave?: string | null
  memoria_equipe?: MemoriaEquipe | null; memoria_equipe_em?: string | null; memoria_equipe_por?: string | null
  updated_at: string
}

export interface Envio {
  id: string; lead_id: string; rascunho_id: string | null; variante: 'a' | 'b' | null; followup_id: string | null
  texto: string; status: 'aberto' | 'confirmado' | 'nao_enviado' | 'leitura_automatica'; autor: string | null
  aberto_em: string; confirmado_em: string | null; mensagem_id: string | null
}

export interface BloqueioRow extends Bloqueio { id: string; origem: string; criado_por: string | null; created_at: string }

export const NOME_TEMPERATURA: Record<Temperatura, string> = { frio: 'Frio', desconhecido: 'Interesse desconhecido', morno: 'Morno', quente: 'Quente' }
/** Nome curto para listas e cards. */
export const NOME_TEMPERATURA_CURTO: Record<Temperatura, string> = { frio: 'Frio', desconhecido: 'A descobrir', morno: 'Morno', quente: 'Quente' }
export const COR_TEMPERATURA: Record<Temperatura, string> = { frio: 'text-info', desconhecido: 'text-tinta-3', morno: 'text-alerta', quente: 'text-sinal' }
export const FUNDO_TEMPERATURA: Record<Temperatura, string> = { frio: 'bg-info', desconhecido: 'bg-tinta-3', morno: 'bg-alerta', quente: 'bg-sinal' }
export const NOME_CONFIANCA: Record<Confianca, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

export const NOME_ACAO: Record<Acao, string> = {
  responder_agora: 'Responder agora', primeira_abordagem: 'Primeira abordagem', qualificar: 'Fazer pergunta de qualificação',
  apresentar_solucao: 'Apresentar solução', oferecer_demonstracao: 'Oferecer demonstração', enviar_proposta: 'Enviar proposta',
  fazer_followup: 'Fazer follow-up útil', aguardar: 'Aguardar', retomar_na_data: 'Retomar na data combinada',
  encerrar: 'Encerrar oportunidade', nao_contatar: 'Não contatar', revisar_dados: 'Revisar dados do lead',
}

export const NOME_ESTADO: Record<EstadoContato, string> = {
  ativo: 'Conversa ativa', aguardando_resposta: 'Aguardando resposta', retorno_combinado: 'Retorno combinado',
  sem_oportunidade: 'Sem oportunidade identificada', desqualificado: 'Desqualificado', encerrado: 'Encerrado', nao_contatar: 'Não contatar',
}

export const NOME_ESTAGIO: Record<Estagio, string> = {
  prospeccao: 'Prospecção', primeiro_contato: 'Primeiro contato', qualificacao: 'Qualificação', diagnostico: 'Diagnóstico',
  demonstracao: 'Demonstração', proposta: 'Proposta', negociacao: 'Negociação', fechado: 'Fechado', perdido: 'Perdido',
}

/* ---------- Leituras ---------- */

export function useConfigComercial() {
  const r = useConsulta('config_comercial', async () => {
    const { data, error } = await supabase.from('config_comercial').select('*').eq('id', 1).maybeSingle()
    // Sem a tabela (migration ainda não aplicada), vale o padrão do código.
    if (error) return { config: lerConfig(null), linha: null, disponivel: false }
    return { config: lerConfig(data), linha: data as Record<string, unknown> | null, disponivel: true }
  }, ['config_comercial'])
  return { ...r, config: r.data?.config ?? lerConfig(null) }
}

export function useBloqueios() {
  return useConsulta('contatos_bloqueados', async () => {
    const { data, error } = await supabase.from('contatos_bloqueados').select('*').order('created_at', { ascending: false })
    return error ? [] : (data as BloqueioRow[])
  }, ['contatos_bloqueados'])
}

export async function carregarIntel(ids?: string[]): Promise<Map<string, LeadIntel>> {
  let query = supabase.from('lead_inteligencia').select('*')
  if (ids) query = query.in('lead_id', ids)
  const { data, error } = await query
  if (error) return new Map()
  return new Map((data as LeadIntel[]).map((i) => [i.lead_id, i]))
}

/** Avaliação por regras no navegador, com a última análise da IA gravada (se houver). */
export function avaliarNoPainel(p: {
  lead: Lead; mensagens: Mensagem[]; intel: LeadIntel | null; bloqueios: Bloqueio[]; config: ConfigComercial
  proposta?: { status: string; enviada_em: string | null } | null
}): Recomendacao {
  return avaliarLead({
    agora: new Date(), config: p.config, lead: p.lead,
    mensagens: p.mensagens.map((m) => ({ id: m.id, direcao: m.direcao, texto: m.texto, enviada_em: m.enviada_em, confirmada: m.confirmada ?? null, origem: m.origem })),
    bloqueios: p.bloqueios,
    liberadoEm: p.intel?.contato_liberado_em ?? null,
    retornoManual: p.intel?.retorno_em ?? null,
    temperaturaManual: p.intel?.temperatura_manual ?? null,
    propostaEnviadaEm: p.proposta?.status === 'enviada' ? p.proposta.enviada_em : null,
    propostaStatus: p.proposta?.status ?? null,
    analise: p.intel?.analise ?? null,
    analisadoPorIA: !!p.intel?.analise,
    memoriaEquipe: p.intel?.memoria_equipe ?? null,
  })
}

/** Hash do contexto atual do lead: a mesma conta da função, para saber se um rascunho ainda vale. */
export function hashAtual(p: {
  lead: Lead; mensagens: Pick<Mensagem, 'id' | 'direcao' | 'texto' | 'enviada_em'>[]; intel: LeadIntel | null; bloqueios: Bloqueio[]; config: ConfigComercial
  proposta?: { status: string } | null
}): string {
  return hashDoLead({
    lead: p.lead, mensagens: p.mensagens, bloqueios: p.bloqueios, config: p.config,
    retornoManual: p.intel?.retorno_em ?? null, propostaStatus: p.proposta?.status ?? null,
    temperaturaManual: p.intel?.temperatura_manual ?? null, liberadoEm: p.intel?.contato_liberado_em ?? null,
    memoriaEquipeEm: p.intel?.memoria_equipe_em ?? null,
  })
}

/** A análise gravada ainda corresponde à conversa atual? */
export function analiseAtual(intel: LeadIntel | null, mensagens: Mensagem[]): boolean {
  if (!intel?.analisado_em) return false
  const ultima = mensagens[mensagens.length - 1]
  if (!ultima) return true
  return intel.ultima_mensagem_id === ultima.id || new Date(ultima.enviada_em) <= new Date(intel.analisado_em)
}

/** Por que o rascunho não vale mais (null = vale). Com `hash`, qualquer mudança de contexto invalida. */
export function rascunhoObsoleto(r: Pick<RascunhoIA, 'created_at' | 'etapa' | 'prompt_version' | 'catalogo_versao' | 'status' | 'enviada_confirmada_em' | 'contexto_hash'>, lead: Pick<Lead, 'etapa' | 'ultimo_contato_em' | 'ultima_resposta_em'>, bloqueado: boolean, config: ConfigComercial, ultimaMensagem?: string | null, hash?: string | null): MotivoObsoleta {
  return motivoObsoleta(r, {
    ultimaAtividade: maisRecente(lead.ultimo_contato_em, lead.ultima_resposta_em, ultimaMensagem),
    etapa: lead.etapa, bloqueado, promptVersion: PROMPT_VERSION, catalogoVersao: config.catalogo_versao, hashAtual: hash ?? null,
  })
}

/** Texto de uma opção, com a edição da equipe se houver (a edição nunca é sobrescrita). */
export function textoDaOpcao(r: Pick<RascunhoIA, 'mensagem_a' | 'mensagem_b' | 'texto_editado_a' | 'texto_editado_b'>, qual: 'a' | 'b'): string | null {
  return qual === 'a' ? r.texto_editado_a ?? r.mensagem_a : r.texto_editado_b ?? r.mensagem_b
}

/** Opção que vai para o WhatsApp: a aprovada pela equipe, senão a recomendada pela IA, senão a A. */
export function opcaoEscolhida(r: Pick<RascunhoIA, 'melhor_opcao' | 'aprovada_variante' | 'mensagem_b'>): 'a' | 'b' {
  if (r.aprovada_variante) return r.aprovada_variante
  return r.melhor_opcao === 'B' && r.mensagem_b ? 'b' : 'a'
}

/** Texto recomendado de um rascunho (aprovado ou recomendado, com edição). */
export function textoRecomendado(r: RascunhoIA): string | null {
  return textoDaOpcao(r, opcaoEscolhida(r)) ?? r.mensagem_a ?? null
}

/* ---------- IA ---------- */

export type ModoIA = 'analisar' | 'gerar' | 'preparar'
export type OrigemRascunho = 'manual' | 'automatico' | 'lote'

/** Chama a função `mensagem`. Prepara rascunho; nunca envia nada. */
export async function analisar(leadId: string, modo: ModoIA, opcoes: { observacao?: string; forcar?: boolean; origem?: OrigemRascunho; semInvalidar?: boolean } = {}) {
  const { semInvalidar, ...corpo } = opcoes
  const r = await chamarFuncao<{ ok: boolean; rascunho: RascunhoIA | null; reaproveitada: boolean; rascunho_reaproveitado?: boolean }>('mensagem', { lead_id: leadId, modo, ...corpo })
  if (!semInvalidar) invalidar('rascunhos_ia', 'lead_inteligencia', 'atividades')
  return r
}

/* ---------- Preparo automático: uma vez por contexto, nunca em loop ---------- */

const tentados = new Map<string, number>()
let iaIndisponivelAte = 0

/** Pode tentar preparar este lead neste contexto? Evita gerar de novo a cada renderização ou navegação. */
export function podePrepararAuto(leadId: string, hash: string) {
  if (Date.now() < iaIndisponivelAte) return false
  return !tentados.has(`${leadId}:${hash}`)
}
export function marcarTentativa(leadId: string, hash: string) { tentados.set(`${leadId}:${hash}`, Date.now()) }
/** A IA falhou (sem chave, fora do ar): pausa o preparo automático por 10 minutos nesta aba. */
export function pausarPreparoAuto() { iaIndisponivelAte = Date.now() + 10 * 60e3 }

/* ---------- Rascunho: edição, aprovação, cópia e avaliação humana ---------- */

export async function salvarEdicao(rascunhoId: string, qual: 'a' | 'b', texto: string) {
  await q(supabase.from('rascunhos_ia').update({ [`texto_editado_${qual}`]: texto, editada_em: new Date().toISOString() }).eq('id', rascunhoId))
}

export async function aprovarRascunho(r: Pick<RascunhoIA, 'id' | 'lead_id'>, qual: 'a' | 'b', texto: string, eu: Membro) {
  const agora = new Date().toISOString()
  await q(supabase.from('rascunhos_ia').update({ aprovada_variante: qual, aprovada_em: agora, aprovada_por: eu.email, [`texto_editado_${qual}`]: texto }).eq('id', r.id))
  await supabase.from('atividades').insert({ lead_id: r.lead_id, tipo: 'rascunho_aprovado', detalhe: { rascunho: r.id, variante: qual }, usuario: eu.email })
  invalidar('rascunhos_ia', 'atividades')
}

export async function registrarCopia(r: Pick<RascunhoIA, 'id' | 'lead_id'>, qual: 'a' | 'b', texto: string, eu: Membro) {
  await supabase.from('rascunhos_ia').update({ usada: qual, copiada_em: new Date().toISOString(), texto_final: texto }).eq('id', r.id)
  await supabase.from('atividades').insert({ lead_id: r.lead_id, tipo: 'rascunho_copiado', detalhe: { rascunho: r.id, variante: qual }, usuario: eu.email })
  invalidar('rascunhos_ia', 'atividades')
}

/** Avaliação humana da sugestão (boa/ruim). Alimenta a comparação de qualidade, não a temperatura. */
export async function avaliarRascunho(r: Pick<RascunhoIA, 'id'>, nota: -1 | 1 | null, comentario: string, eu: Membro) {
  await q(supabase.from('rascunhos_ia').update({ avaliacao_humana: nota, avaliacao_nota: comentario || null, avaliada_por: nota ? eu.email : null }).eq('id', r.id))
  invalidar('rascunhos_ia')
}

/* ---------- Correções manuais (a automação nunca sobrescreve) ---------- */

async function gravarManual(leadId: string, campos: Partial<LeadIntel>, eu: Membro, detalhe: Record<string, unknown>) {
  // Coluna nova sem a migration aplicada: erro claro, em vez de falhar calado.
  const { error } = await supabase.from('lead_inteligencia').upsert({ lead_id: leadId, ...campos, updated_at: new Date().toISOString() }, { onConflict: 'lead_id' })
  if (error) throw new Error(error.code === 'PGRST204' || error.code === '42P01' ? 'Falta aplicar as migrations 0004 e 0005 no banco.' : error.message)
  await supabase.from('lead_inteligencia_historico').insert({ lead_id: leadId, origem: 'manual', usuario: eu.email, detalhe, temperatura: campos.temperatura_manual ?? null })
  invalidar('lead_inteligencia')
}

export function definirTemperatura(leadId: string, t: Temperatura | null, nota: string, eu: Membro) {
  return gravarManual(leadId, {
    temperatura_manual: t, temperatura_manual_nota: t ? nota || null : null,
    temperatura_manual_por: t ? eu.email : null, temperatura_manual_em: t ? new Date().toISOString() : null,
  }, eu, { campo: 'temperatura_manual', valor: t, nota })
}

export function definirRetorno(leadId: string, em: string | null, nota: string, eu: Membro) {
  return gravarManual(leadId, { retorno_em: em, retorno_nota: em ? nota || null : null, retorno_por: em ? eu.email : null }, eu, { campo: 'retorno_em', valor: em, nota })
}

/** Correção da memória pela equipe: confirmar fato, marcar item como errado, horário de funcionamento. */
export async function salvarMemoriaEquipe(leadId: string, atual: MemoriaEquipe | null | undefined, mudar: (m: MemoriaEquipe) => MemoriaEquipe, eu: Membro, detalhe: Record<string, unknown>) {
  const nova = mudar({ fatos: [], ocultar: [], horario_funcionamento: null, ...(atual ?? {}) })
  await gravarManual(leadId, { memoria_equipe: nova, memoria_equipe_em: new Date().toISOString(), memoria_equipe_por: eu.email }, eu, { campo: 'memoria_equipe', ...detalhe })
}

/** Pedido para não receber mensagens: grava por telefone e place_id (vale para reimportações) e encerra o lead. */
export async function bloquearContato(lead: Pick<Lead, 'id' | 'whatsapp' | 'telefone' | 'place_id'>, motivo: string, origem: 'pedido_do_cliente' | 'equipe', eu: Membro) {
  const chave = telefoneChave(lead.whatsapp) ?? telefoneChave(lead.telefone)
  const { error } = await supabase.from('contatos_bloqueados').insert({ telefone_chave: chave, place_id: lead.place_id, lead_id: lead.id, motivo, origem, criado_por: eu.email })
  if (error && error.code !== '23505') throw error // 23505: já estava bloqueado
  await q(supabase.from('leads').update({ etapa: 'descartado', motivo_perda: 'Pediu para não ser contatado' }).eq('id', lead.id))
  await supabase.from('followups').update({ status: 'pulado' }).eq('lead_id', lead.id).eq('status', 'pendente')
  await supabase.from('atividades').insert({ lead_id: lead.id, tipo: 'bloqueio', detalhe: { motivo, origem }, usuario: eu.email })
  invalidar('contatos_bloqueados', 'leads', 'followups', 'atividades')
}

/** Só admin. Remove o bloqueio e registra a liberação, para pedidos antigos na conversa deixarem de bloquear. */
export async function liberarContato(bloqueio: BloqueioRow | null, leadId: string, eu: Membro) {
  if (bloqueio) await q(supabase.from('contatos_bloqueados').delete().eq('id', bloqueio.id))
  await gravarManual(leadId, { contato_liberado_em: new Date().toISOString(), contato_liberado_por: eu.email }, eu, { campo: 'contato_liberado' })
  await supabase.from('atividades').insert({ lead_id: leadId, tipo: 'desbloqueio', detalhe: {}, usuario: eu.email })
  invalidar('contatos_bloqueados', 'atividades')
}
