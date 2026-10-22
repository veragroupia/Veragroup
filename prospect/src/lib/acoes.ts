import { supabase } from './supabase'
import { invalidar, q } from './dados'
import type { Etapa, Lead, Membro, Mensagem } from './tipos'
import { numeroWa, preencher, soDigitos, waLink } from './util'

let leituraAtiva: boolean | null = null
/** Com a leitura do WhatsApp ligada, o webhook grava as mensagens; sem ela, gravamos à mão. */
export async function whatsappLeituraAtiva() {
  if (leituraAtiva !== null) return leituraAtiva
  const { data } = await supabase.from('radar_config').select('whatsapp_leitura_ativo').eq('id', 1).single()
  leituraAtiva = !!data?.whatsapp_leitura_ativo
  return leituraAtiva
}
export function esquecerLeitura() { leituraAtiva = null }

/**
 * Abre a conversa no WhatsApp com o texto pronto e registra o contato.
 * O banco cuida do resto: a mensagem enviada leva o lead de "novo" para
 * "contatado" e agenda o próximo follow-up (gatilho tg_mensagem_insert).
 */
export async function abrirWhatsApp(lead: Pick<Lead, 'id' | 'whatsapp' | 'telefone' | 'responsavel'>, texto: string, eu: Membro, followupId?: string) {
  const numero = numeroWa(lead.whatsapp, lead.telefone)
  if (!numero) throw new Error('Este lead não tem telefone.')
  const msg = preencher(texto, eu.nome)
  window.open(waLink(numero, msg), '_blank', 'noopener')

  const tarefas: PromiseLike<unknown>[] = [
    supabase.from('atividades').insert({ lead_id: lead.id, tipo: 'whatsapp_aberto', detalhe: { followup: followupId ?? null }, usuario: eu.email }),
  ]
  if (!lead.responsavel) tarefas.push(supabase.from('leads').update({ responsavel: eu.email }).eq('id', lead.id))
  if (followupId) {
    tarefas.push(supabase.from('followups').update({ status: 'feito', feito_em: new Date().toISOString(), feito_por: eu.email }).eq('id', followupId))
  }
  await Promise.all(tarefas)
  if (!(await whatsappLeituraAtiva()) && msg.trim()) {
    await supabase.from('mensagens').insert({ lead_id: lead.id, direcao: 'enviada', texto: msg, origem: 'manual', autor: eu.email })
  }
  invalidar('leads', 'mensagens', 'followups', 'atividades')
}

export async function atualizarLead(id: string, campos: Partial<Lead>) {
  await q(supabase.from('leads').update(campos).eq('id', id))
  invalidar('leads', 'atividades', 'followups')
}

export async function atualizarLeads(ids: string[], campos: Partial<Lead>) {
  if (!ids.length) return
  await q(supabase.from('leads').update(campos).in('id', ids))
  invalidar('leads', 'atividades', 'followups')
}

export const mudarEtapa = (id: string, etapa: Etapa, extra: Partial<Lead> = {}) => atualizarLead(id, { etapa, ...extra })

export async function pularFollowup(id: string) {
  await q(supabase.from('followups').update({ status: 'pulado' }).eq('id', id))
  invalidar('followups', 'leads')
}

export async function adiarFollowup(id: string, para: Date) {
  await q(supabase.from('followups').update({ agendado_para: para.toISOString() }).eq('id', id))
  invalidar('followups', 'leads')
}

export async function agendarFollowup(lead_id: string, agendado_para: Date, motivo: string, mensagem_sugerida?: string) {
  const { data } = await supabase.from('followups').select('tentativa').eq('lead_id', lead_id).order('tentativa', { ascending: false }).limit(1)
  await q(supabase.from('followups').insert({
    lead_id, agendado_para: agendado_para.toISOString(), motivo, mensagem_sugerida: mensagem_sugerida || null,
    tentativa: (data?.[0]?.tentativa ?? 0) + 1,
  }))
  invalidar('followups', 'leads')
}

export async function registrarMensagem(lead_id: string, direcao: 'enviada' | 'recebida', texto: string, autor: string, enviada_em?: string) {
  await q(supabase.from('mensagens').insert({ lead_id, direcao, texto, origem: 'manual', autor, ...(enviada_em ? { enviada_em } : {}) }))
  invalidar('mensagens', 'leads', 'followups')
}

export interface MensagemImportada { direcao: 'enviada' | 'recebida'; texto: string; enviada_em: string }
type Linha = { autor: string; texto: string; data: Date }

// Exportar conversa: "12/09/2026 14:03 - Fulano: oi" ou "[12/09/26, 14:03:10] Fulano: oi".
const EXPORTADA = /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4})[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\]?\s*[-–]?\s*([^:]+):\s?(.*)$/
// Copiar mensagens (WhatsApp Web e desktop): "[17:22, 21/10/2026] +55 15 98126-0118: oi".
const COPIADA = /^\[(\d{1,2}):(\d{2})(?::\d{2})?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]\s*([^:]+):\s?(.*)$/

/** Quebra o texto do WhatsApp em mensagens. Linha sem cabeçalho continua a mensagem anterior. */
export function lerWhatsApp(texto: string): Linha[] {
  const linhas: Linha[] = []
  for (const l of texto.split(/\r?\n/)) {
    let d: string, mes: string, a: string, h: string, min: string, autor: string, t: string
    let m = l.trim().match(COPIADA)
    if (m) [, h, min, d, mes, a, autor, t] = m
    else if ((m = l.trim().match(EXPORTADA))) [, d, mes, a, h, min, autor, t] = m
    if (m) {
      const ano = a!.length === 2 ? 2000 + Number(a!) : Number(a!)
      linhas.push({ autor: autor!.trim(), texto: t!, data: new Date(ano, Number(mes!) - 1, Number(d!), Number(h!), Number(min!)) })
    } else if (linhas.length && l.trim()) {
      linhas[linhas.length - 1].texto += '\n' + l
    }
  }
  return linhas.filter((b) => b.texto.trim() && !/^<(m[ií]dia oculta|media omitted)>$/i.test(b.texto.trim()))
}

/**
 * Lê o .txt de "Exportar conversa" do WhatsApp.
 * Quem fala como o lead é descoberto pelo nome; se não bater, é quem não abriu a conversa.
 */
export function parseConversa(texto: string, nomeLead: string): MensagemImportada[] {
  const brutas = lerWhatsApp(texto)
  const autores = [...new Set(brutas.map((b) => b.autor))]
  const alvo = nomeLead.toLowerCase()
  let doLead = autores.find((a) => alvo.includes(a.toLowerCase().split(' ')[0]) || a.toLowerCase().includes(alvo.split(' ')[0]))
  if (!doLead && brutas.length) doLead = autores.find((a) => a !== brutas[0].autor)
  return brutas.map((b) => ({ direcao: b.autor === doLead ? 'recebida' : 'enviada', texto: b.texto.trim(), enviada_em: b.data.toISOString() }))
}

/**
 * Mensagens coladas em "Registrar resposta". Quem tem o número ou o nome do lead é o lead;
 * quem tem o nome de alguém da equipe, "Vera" ou "Você" é a Vera; o resto conta como lead,
 * porque é uma resposta que está sendo registrada. A tela deixa trocar um a um.
 */
export function separarColadas(texto: string, lead: Pick<Lead, 'nome' | 'whatsapp' | 'telefone'>, equipe: string[]): (MensagemImportada & { autor: string })[] {
  const numLead = soDigitos(lead.whatsapp || lead.telefone).slice(-8)
  const nossos = ['vera', 'você', 'voce', ...equipe.map((n) => n.split(' ')[0].toLowerCase()).filter((n) => n.length > 2)]
  const doLead = (autor: string) => {
    const dig = soDigitos(autor)
    if (numLead && dig.length >= 8 && dig.slice(-8) === numLead) return true
    const a = autor.toLowerCase()
    if (a.includes(lead.nome.toLowerCase().split(' ')[0])) return true
    return !nossos.some((n) => a.includes(n))
  }
  return lerWhatsApp(texto).map((b) => ({ autor: b.autor, direcao: doLead(b.autor) ? 'recebida' : 'enviada', texto: b.texto.trim(), enviada_em: b.data.toISOString() }))
}

export async function registrarVarias(lead_id: string, msgs: MensagemImportada[], autor: string) {
  if (!msgs.length) return
  await q(supabase.from('mensagens').insert(msgs.map((m) => ({ ...m, lead_id, origem: 'manual', autor: m.direcao === 'enviada' ? autor : null }))))
  invalidar('mensagens', 'leads', 'followups')
}

/** Apaga e devolve a linha inteira, para o "Desfazer" poder recolocar igual. */
export async function excluirMensagem(id: string) {
  const { data, error } = await supabase.from('mensagens').delete().eq('id', id).select().single()
  if (error) throw error
  invalidar('mensagens', 'leads')
  return data as Mensagem
}

export async function restaurarMensagem(m: Mensagem) {
  await q(supabase.from('mensagens').insert(m))
  invalidar('mensagens', 'leads', 'followups')
}

/** Troca uma mensagem colada de uma vez pelas mensagens separadas. */
export async function separarMensagem(m: Mensagem, partes: MensagemImportada[], autor: string) {
  await registrarVarias(m.lead_id, partes, autor)
  await q(supabase.from('mensagens').delete().eq('id', m.id))
  invalidar('mensagens', 'leads')
}

export async function importarConversa(lead_id: string, msgs: MensagemImportada[], autor: string) {
  if (!msgs.length) return 0
  const { data: existentes } = await supabase.from('mensagens').select('enviada_em, texto').eq('lead_id', lead_id)
  const ja = new Set((existentes ?? []).map((m) => `${new Date(m.enviada_em).getTime()}|${m.texto}`))
  const novas = msgs.filter((m) => !ja.has(`${new Date(m.enviada_em).getTime()}|${m.texto}`))
  if (novas.length) {
    await q(supabase.from('mensagens').insert(novas.map((m) => ({ ...m, lead_id, origem: 'importada', autor: m.direcao === 'enviada' ? autor : null }))))
  }
  invalidar('mensagens', 'leads', 'followups')
  return novas.length
}
