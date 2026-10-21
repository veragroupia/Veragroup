import { supabase } from './supabase'
import { invalidar, q } from './dados'
import type { Etapa, Followup, Lead, Reuniao } from './tipos'
import { nomeCurto } from './util'

export type TipoItem = 'post' | 'story' | 'tarefa' | 'reuniao'
export type StatusItem = 'a fazer' | 'gravado' | 'editado' | 'postado' | 'feito'

export interface ItemAgenda {
  id: string; data: string; hora: string | null; tipo: TipoItem; plataforma: string | null
  titulo: string; objetivo: string; roteiro: string; status: StatusItem
  responsavel: string | null; lead_id: string | null; created_at: string; updated_at: string
}

type LeadDoCompromisso = Pick<Lead, 'id' | 'nome' | 'whatsapp' | 'telefone' | 'responsavel' | 'etapa' | 'mensagem_inicial'>
export type FollowupDia = Followup & { lead: LeadDoCompromisso | null }
export type ReuniaoDia = Reuniao & { lead: Pick<Lead, 'id' | 'nome'> | null }

export const PLATAFORMAS = ['Reels + TikTok', 'Instagram', 'TikTok', 'Carrossel', 'Story']
export const TIPOS: { id: TipoItem; nome: string }[] = [
  { id: 'post', nome: 'Post' }, { id: 'story', nome: 'Story' }, { id: 'tarefa', nome: 'Tarefa' }, { id: 'reuniao', nome: 'Reunião da equipe' },
]

// Post anda pela produção; o resto é só feito ou não.
const FLUXO_POST: StatusItem[] = ['a fazer', 'gravado', 'editado', 'postado']
export const ehConteudo = (t: TipoItem) => t === 'post' || t === 'story'
export const statusDe = (t: TipoItem): StatusItem[] => (ehConteudo(t) ? FLUXO_POST : ['a fazer', 'feito'])
export const concluido = (i: Pick<ItemAgenda, 'status'>) => i.status === 'postado' || i.status === 'feito'

export function proximoStatus(i: Pick<ItemAgenda, 'tipo' | 'status'>): StatusItem | null {
  const fluxo = statusDe(i.tipo)
  const n = fluxo.indexOf(i.status)
  return n >= 0 && n < fluxo.length - 1 ? fluxo[n + 1] : null
}

// ----- Datas. Sempre 'YYYY-MM-DD' montado à mão: new Date('2026-10-26') é
// meia-noite em UTC, que no Brasil vira o dia 25 às 21h. -----

export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hojeIso = () => isoLocal(new Date())
export const mesDe = (data: string) => data.slice(0, 7)

export function somarMes(mes: string, n: number) {
  const [a, m] = mes.split('-').map(Number)
  return isoLocal(new Date(a, m - 1 + n, 1)).slice(0, 7)
}
export function nomeDoMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const t = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}
export function rotuloDia(data: string, opcoes: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const [a, m, d] = data.split('-').map(Number)
  const t = new Date(a, m - 1, d).toLocaleDateString('pt-BR', opcoes)
  return t.charAt(0).toUpperCase() + t.slice(1)
}
/** Semanas do mês, de domingo a sábado, com null nos buracos. */
export function montarSemanas(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const celulas: (string | null)[] = Array(new Date(a, m - 1, 1).getDay()).fill(null)
  const total = new Date(a, m, 0).getDate()
  for (let d = 1; d <= total; d++) celulas.push(`${mes}-${String(d).padStart(2, '0')}`)
  while (celulas.length % 7) celulas.push(null)
  return celulas
}
export const limitesDoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return { inicio: `${mes}-01`, fim: `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}` }
}

// ----- Banco -----

const COLUNAS = ['data', 'hora', 'tipo', 'plataforma', 'titulo', 'objetivo', 'roteiro', 'status', 'responsavel', 'lead_id'] as const

function paraOBanco(i: Partial<ItemAgenda>) {
  const limpo: Record<string, unknown> = {}
  for (const c of COLUNAS) if (i[c] !== undefined) limpo[c] = i[c]
  if ('titulo' in limpo) limpo.titulo = String(limpo.titulo ?? '').trim()
  // Campo vazio no formulário vira null, não string vazia: o banco recusa
  // '' em hora, plataforma e responsável.
  for (const c of ['hora', 'plataforma', 'responsavel', 'lead_id']) if (c in limpo && !limpo[c]) limpo[c] = null
  if ('tipo' in limpo && !ehConteudo(limpo.tipo as TipoItem)) limpo.plataforma = null
  return limpo
}

export async function salvarItem(i: Partial<ItemAgenda>, autor: string) {
  const campos = paraOBanco(i)
  if (i.id) await q(supabase.from('agenda').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', i.id))
  else await q(supabase.from('agenda').insert({ ...campos, criado_por: autor }))
  invalidar('agenda')
}
export async function mudarStatus(id: string, status: StatusItem) {
  await q(supabase.from('agenda').update({ status, updated_at: new Date().toISOString() }).eq('id', id))
  invalidar('agenda')
}
export async function excluirItem(id: string) {
  await q(supabase.from('agenda').delete().eq('id', id))
  invalidar('agenda')
}

const LEAD_CAMPOS = 'id, nome, whatsapp, telefone, responsavel, etapa, mensagem_inicial'

export async function carregarMes(mes: string) {
  const { inicio, fim } = limitesDoMes(mes)
  // Fim do dia no fuso local, para pegar o follow-up das 23h do último dia.
  const [a, m, d] = fim.split('-').map(Number)
  const de = new Date(a, m - 1, 1).toISOString()
  const ate = new Date(a, m - 1, d, 23, 59, 59).toISOString()
  const [itens, followups, reunioes] = await Promise.all([
    q<ItemAgenda[]>(supabase.from('agenda').select('*').gte('data', inicio).lte('data', fim).order('data').order('hora', { nullsFirst: true })),
    q<FollowupDia[]>(supabase.from('followups').select(`*, lead:leads(${LEAD_CAMPOS})`).eq('status', 'pendente').gte('agendado_para', de).lte('agendado_para', ate).order('agendado_para')),
    q<ReuniaoDia[]>(supabase.from('reunioes').select('*, lead:leads(id, nome)').gte('data_hora', de).lte('data_hora', ate).neq('status', 'cancelada').order('data_hora')),
  ])
  return { itens, followups: followups.filter((f) => f.lead), reunioes }
}

/** Itens de hoje de uma pessoa, para a tela Hoje. */
export async function carregarHoje(email: string) {
  return q<ItemAgenda[]>(supabase.from('agenda').select('*').eq('data', hojeIso()).or(`responsavel.eq.${email},responsavel.is.null`).order('hora', { nullsFirst: true }))
}

// Mensagem padrão para follow-up que a IA ainda não sugeriu.
export function textoFollowup(tentativa: number, nome: string) {
  const n = nomeCurto(nome)
  if (tentativa <= 1) return `Oi, tudo bem? Passando pra saber se você conseguiu ver minha mensagem sobre a ${n}. Posso te mostrar em 2 minutos como ficaria?`
  if (tentativa === 2) return `Oi! Separei um exemplo de site que fizemos pra um negócio parecido com a ${n}. Quer que eu te mande aqui?`
  return `Última vez que te chamo por aqui, prometo. Se fizer sentido conversar sobre a ${n} aparecer melhor no Google, é só me responder. Se não for o momento, tudo bem também!`
}

export const etapaAtiva = (e: Etapa) => !['fechado', 'perdido', 'descartado'].includes(e)
