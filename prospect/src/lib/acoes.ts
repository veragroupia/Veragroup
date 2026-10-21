import { supabase } from './supabase'
import { invalidar, q } from './dados'
import type { Etapa, Lead, Membro } from './tipos'
import { numeroWa, preencher, waLink } from './util'

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

/**
 * Lê o .txt de "Exportar conversa" do WhatsApp. Aceita os dois formatos:
 * "12/09/2026 14:03 - Fulano: oi" e "[12/09/26, 14:03:10] Fulano: oi".
 * Quem fala como o lead é descoberto pelo nome; se não bater, é quem não abriu a conversa.
 */
export function parseConversa(texto: string, nomeLead: string): MensagemImportada[] {
  const linha = /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4})[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\]?\s*[-–]?\s*([^:]+):\s?(.*)$/
  const brutas: { autor: string; texto: string; data: Date }[] = []
  const contagem = new Map<string, number>()
  for (const l of texto.split(/\r?\n/)) {
    const m = l.match(linha)
    if (m) {
      const [, d, mes, a, h, min, autor, t] = m
      const ano = a.length === 2 ? 2000 + Number(a) : Number(a)
      brutas.push({ autor: autor.trim(), texto: t, data: new Date(ano, Number(mes) - 1, Number(d), Number(h), Number(min)) })
      contagem.set(autor.trim(), (contagem.get(autor.trim()) ?? 0) + 1)
    } else if (brutas.length && l.trim()) {
      brutas[brutas.length - 1].texto += '\n' + l
    }
  }
  const autores = [...contagem.keys()]
  const alvo = nomeLead.toLowerCase()
  let doLead = autores.find((a) => alvo.includes(a.toLowerCase().split(' ')[0]) || a.toLowerCase().includes(alvo.split(' ')[0]))
  if (!doLead && brutas.length) doLead = autores.find((a) => a !== brutas[0].autor)
  return brutas
    .filter((b) => b.texto.trim() && !/^<(m[ií]dia oculta|media omitted)>$/i.test(b.texto.trim()))
    .map((b) => ({ direcao: b.autor === doLead ? 'recebida' : 'enviada', texto: b.texto.trim(), enviada_em: b.data.toISOString() }))
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
