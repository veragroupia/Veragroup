import { supabase } from './supabase'
import { invalidar, q } from './dados'
import type { Etapa, Lead, Membro, Mensagem } from './tipos'
import { numeroWa, preencher, soDigitos, waLink } from './util'
import { telefoneChave } from '../../supabase/functions/_shared/inteligencia/conversa.ts'

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
 * Grava mensagens marcadas como confirmadas. Se a coluna `confirmada` ainda não existir
 * (migration 0004 não aplicada), grava sem ela, como antes.
 */
async function inserirMensagens(linhas: Record<string, unknown>[]) {
  const { data, error } = await supabase.from('mensagens').insert(linhas.map((l) => ({ ...l, confirmada: true }))).select('id')
  if (!error) return (data ?? []) as { id: string }[]
  if (error.code !== 'PGRST204' && !/confirmada/.test(error.message)) throw error
  return await q<{ id: string }[]>(supabase.from('mensagens').insert(linhas).select('id'))
}

/**
 * Abre a conversa no WhatsApp com o texto pronto.
 * Abrir o link não prova que a mensagem foi enviada: aqui só registramos a abertura (tabela `envios`).
 * A mensagem entra no histórico, conta nas métricas e agenda follow-up só quando alguém confirma o envio
 * (confirmarEnvio), ou quando a leitura automática do WhatsApp grava a mensagem real.
 */
export async function abrirWhatsApp(
  lead: Pick<Lead, 'id' | 'whatsapp' | 'telefone' | 'responsavel'>, texto: string, eu: Membro, followupId?: string,
  origem: { rascunhoId?: string; variante?: 'a' | 'b' } = {},
): Promise<{ id: string } | { id: null; semRegistro: true } | null> {
  const numero = numeroWa(lead.whatsapp, lead.telefone)
  if (!numero) throw new Error('Este lead não tem telefone.')
  await garantirNaoBloqueado(lead)
  const msg = preencher(texto, eu.nome)
  window.open(waLink(numero, msg), '_blank', 'noopener')

  const leitura = await whatsappLeituraAtiva()
  const tarefas: PromiseLike<unknown>[] = [
    supabase.from('atividades').insert({ lead_id: lead.id, tipo: 'whatsapp_aberto', detalhe: { followup: followupId ?? null }, usuario: eu.email }),
  ]
  if (!lead.responsavel) tarefas.push(supabase.from('leads').update({ responsavel: eu.email }).eq('id', lead.id))
  await Promise.all(tarefas)

  const { data, error } = await supabase.from('envios').insert({
    lead_id: lead.id, texto: msg, followup_id: followupId ?? null, rascunho_id: origem.rascunhoId ?? null, variante: origem.variante ?? null,
    status: leitura ? 'leitura_automatica' : 'aberto', autor: eu.email,
  }).select('id').single()

  if (error) {
    // Sem a tabela `envios` (migration 0004 não aplicada) não há como pedir a confirmação depois.
    // Abrir o WhatsApp não prova envio: nada é gravado como enviado. Quem enviou registra na Conversa ("Minha mensagem").
    invalidar('leads', 'atividades')
    return { id: null, semRegistro: true }
  }
  invalidar('leads', 'envios', 'atividades')
  return leitura ? null : (data as { id: string })
}

/** Lead de contato bloqueado não abre o WhatsApp por engano. */
async function garantirNaoBloqueado(lead: Pick<Lead, 'id' | 'whatsapp' | 'telefone'>) {
  const chaves = [telefoneChave(lead.whatsapp), telefoneChave(lead.telefone)].filter(Boolean) as string[]
  const filtro = [`lead_id.eq.${lead.id}`, ...chaves.map((c) => `telefone_chave.eq.${c}`)].join(',')
  const { data, error } = await supabase.from('contatos_bloqueados').select('motivo').or(filtro).limit(1)
  // Tabela ainda não criada (migration 0004 não aplicada): não há bloqueio registrado. Qualquer outra falha: não arrisca.
  if (error && !['42P01', 'PGRST205'].includes(error.code ?? '')) throw new Error('Não deu para conferir se o contato pediu para não receber mensagens. Tente de novo em instantes.')
  if (data?.length) throw new Error(`Contato bloqueado: ${data[0].motivo}. Nenhuma mensagem comercial.`)
}

/** A pessoa confirmou que enviou: agora sim a mensagem entra no histórico (e o banco agenda o follow-up). */
export async function confirmarEnvio(envio: { id: string; lead_id: string; texto: string; followup_id: string | null; rascunho_id: string | null; variante: 'a' | 'b' | null }, eu: Membro, texto?: string) {
  const final = (texto ?? envio.texto).trim()
  const agora = new Date().toISOString()
  const [m] = final ? await inserirMensagens([{ lead_id: envio.lead_id, direcao: 'enviada', texto: final, origem: 'manual', autor: eu.email }]) : [null]
  await q(supabase.from('envios').update({ status: 'confirmado', confirmado_em: agora, mensagem_id: m?.id ?? null, texto: final }).eq('id', envio.id))
  if (envio.followup_id) await supabase.from('followups').update({ status: 'feito', feito_em: agora, feito_por: eu.email }).eq('id', envio.followup_id)
  if (envio.rascunho_id) {
    await supabase.from('rascunhos_ia').update({ usada: envio.variante, texto_final: final, enviada_confirmada_em: agora, mensagem_id: m?.id ?? null }).eq('id', envio.rascunho_id)
  }
  invalidar('envios', 'mensagens', 'leads', 'followups', 'rascunhos_ia')
}

export async function marcarNaoEnviado(envioId: string) {
  await q(supabase.from('envios').update({ status: 'nao_enviado' }).eq('id', envioId))
  invalidar('envios')
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

/** Registro feito pela equipe ("Resposta do lead" ou "Minha mensagem"): é declaração de quem viu, conta como confirmada. */
export async function registrarMensagem(lead_id: string, direcao: 'enviada' | 'recebida', texto: string, autor: string, enviada_em?: string) {
  await inserirMensagens([{ lead_id, direcao, texto, origem: 'manual', autor, ...(enviada_em ? { enviada_em } : {}) }])
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
 * quem tem o nome de alguém da equipe, "Vera" ou "Você" é a Vera. O resto segue `padrao`:
 * lead em "Resposta do lead", Vera em "Minha mensagem". A tela deixa trocar um a um.
 */
export function separarColadas(texto: string, lead: Pick<Lead, 'nome' | 'whatsapp' | 'telefone'>, equipe: string[], padrao: 'enviada' | 'recebida' = 'recebida'): (MensagemImportada & { autor: string })[] {
  const numLead = soDigitos(lead.whatsapp || lead.telefone).slice(-8)
  const nossos = ['vera', 'você', 'voce', ...equipe.map((n) => n.split(' ')[0].toLowerCase()).filter((n) => n.length > 2)]
  const doLead = (autor: string) => {
    const dig = soDigitos(autor)
    if (numLead && dig.length >= 8 && dig.slice(-8) === numLead) return true
    const a = autor.toLowerCase()
    if (a.includes(lead.nome.toLowerCase().split(' ')[0])) return true
    if (nossos.some((n) => a.includes(n))) return false
    return padrao === 'recebida'
  }
  return lerWhatsApp(texto).map((b) => ({ autor: b.autor, direcao: doLead(b.autor) ? 'recebida' : 'enviada', texto: b.texto.trim(), enviada_em: b.data.toISOString() }))
}

export async function registrarVarias(lead_id: string, msgs: MensagemImportada[], autor: string) {
  if (!msgs.length) return
  await inserirMensagens(msgs.map((m) => ({ ...m, lead_id, origem: 'manual', autor: m.direcao === 'enviada' ? autor : null })))
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
    // Exportação do próprio WhatsApp: o envio é comprovado.
    await inserirMensagens(novas.map((m) => ({ ...m, lead_id, origem: 'importada', autor: m.direcao === 'enviada' ? autor : null })))
  }
  invalidar('mensagens', 'leads', 'followups')
  return novas.length
}

/** Aviso depois de abrir o WhatsApp sem tabela de envios: nada foi registrado como enviado. */
export const AVISO_SEM_REGISTRO = 'WhatsApp aberto. O envio não foi registrado: se você mandou, registre na Conversa em "Minha mensagem".'
export function semRegistro(r: unknown): boolean {
  return !!r && typeof r === 'object' && 'semRegistro' in r
}
