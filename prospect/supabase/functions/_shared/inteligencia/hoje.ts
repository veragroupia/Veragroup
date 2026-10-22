import type { Acao, Temperatura } from './tipos.ts'

/* Fila da tela Hoje. A ordem segue o que exige ação, não só a temperatura:
   um lead morno com retorno combinado vem antes de um quente que já foi respondido. */

export const GRUPOS_HOJE = ['compromisso', 'resposta', 'proposta', 'quente', 'acompanhar', 'primeiro', 'aguardar'] as const
export type GrupoHoje = (typeof GRUPOS_HOJE)[number]

export interface EntradaHoje {
  agora: Date
  fimDoDia: Date
  diasAguardar: number
  lead: { etapa: string; ultimo_contato_em: string | null; ultima_resposta_em: string | null; whatsapp: string | null; telefone: string | null }
  bloqueado: boolean
  temperatura: Temperatura | null
  proximaAcao: Acao | null
  retornoEm: string | null
  reuniaoHoje: { data_hora: string } | null
  followup: { agendado_para: string; tentativa: number; motivo: string | null } | null
  proposta: { status: string; enviada_em: string | null; created_at: string } | null
  /** Quem falou por último pela conversa registrada (mais confiável que as datas do lead, quando disponível). */
  ultimaDe?: 'lead' | 'vera' | null
}

export interface ItemHoje { grupo: GrupoHoje; motivo: string; quando: string | null }

const DIA = 86400e3
const fmtHora = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const dias = (de: string, ate: Date) => Math.floor((ate.getTime() - new Date(de).getTime()) / DIA)

export function classificarHoje(e: EntradaHoje): ItemHoje | null {
  const { lead: l } = e
  if (e.bloqueado) return null
  if (['fechado', 'perdido', 'descartado'].includes(l.etapa)) return null

  if (e.reuniaoHoje) return { grupo: 'compromisso', motivo: `Reunião às ${fmtHora(e.reuniaoHoje.data_hora)}`, quando: e.reuniaoHoje.data_hora }
  if (e.retornoEm && new Date(e.retornoEm) <= e.fimDoDia) {
    const venceu = new Date(e.retornoEm) < e.agora && dias(e.retornoEm, e.agora) >= 1
    return { grupo: 'compromisso', motivo: venceu ? 'Retorno combinado (atrasado)' : 'Retorno combinado para hoje', quando: e.retornoEm }
  }
  if (e.followup && e.followup.motivo === 'Agendado manualmente' && new Date(e.followup.agendado_para) <= e.fimDoDia) {
    return { grupo: 'compromisso', motivo: 'Retorno agendado pela equipe', quando: e.followup.agendado_para }
  }

  // Promessa da Vera ainda não entregue (a regra mandou apresentar a solução sem o cliente ter falado por último).
  if (e.proximaAcao === 'apresentar_solucao' && e.ultimaDe === 'vera') return { grupo: 'compromisso', motivo: 'Você prometeu mandar algo ao cliente', quando: null }

  const leadFalouPorUltimo = e.ultimaDe !== undefined && e.ultimaDe !== null ? e.ultimaDe === 'lead'
    : !!l.ultima_resposta_em && (!l.ultimo_contato_em || new Date(l.ultima_resposta_em) > new Date(l.ultimo_contato_em))
  if (leadFalouPorUltimo) return { grupo: 'resposta', motivo: e.temperatura === 'quente' ? 'Pedido do cliente esperando resposta' : 'Cliente respondeu e espera retorno', quando: l.ultima_resposta_em }

  if (e.proposta?.status === 'enviada' && e.proposta.enviada_em && dias(e.proposta.enviada_em, e.agora) >= e.diasAguardar) {
    return { grupo: 'proposta', motivo: `Proposta sem resposta há ${dias(e.proposta.enviada_em, e.agora)} dias`, quando: e.proposta.enviada_em }
  }
  if (e.proposta?.status === 'rascunho' && dias(e.proposta.created_at, e.agora) >= 1) {
    return { grupo: 'proposta', motivo: 'Proposta em rascunho, ainda não enviada', quando: e.proposta.created_at }
  }

  const espera = e.proximaAcao === 'aguardar' || e.proximaAcao === 'retomar_na_data' || e.proximaAcao === 'encerrar'
  if (e.temperatura === 'quente' && !espera) return { grupo: 'quente', motivo: 'Oportunidade quente com próximo passo', quando: null }

  if (e.followup && new Date(e.followup.agendado_para) <= e.fimDoDia) {
    if (espera) return { grupo: 'aguardar', motivo: 'Follow-up do dia, mas a recomendação é aguardar', quando: e.followup.agendado_para }
    const venceu = new Date(e.followup.agendado_para) < e.agora && dias(e.followup.agendado_para, e.agora) >= 1
    return { grupo: 'acompanhar', motivo: `${e.followup.tentativa}ª tentativa${venceu ? ' (atrasada)' : ''}`, quando: e.followup.agendado_para }
  }

  if (e.proximaAcao === 'fazer_followup') return { grupo: 'acompanhar', motivo: 'Sem resposta: retomar só com algo útil', quando: l.ultimo_contato_em }

  if (l.etapa === 'novo' && (l.whatsapp || l.telefone) && !l.ultimo_contato_em) return { grupo: 'primeiro', motivo: 'Novo no radar', quando: null }

  if (l.ultimo_contato_em && (e.temperatura === 'quente' || e.temperatura === 'morno' || e.temperatura === 'desconhecido')) {
    return { grupo: 'aguardar', motivo: `Aguardando resposta desde ${new Date(l.ultimo_contato_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}`, quando: l.ultimo_contato_em }
  }
  return null
}

/** Ordem dentro do grupo: compromisso pelo horário, o resto pelo mais antigo primeiro (quem espera há mais tempo). */
export function ordenarHoje<T extends { item: ItemHoje; score?: number }>(lista: T[]): T[] {
  const peso = (g: GrupoHoje) => GRUPOS_HOJE.indexOf(g)
  return [...lista].sort((a, b) => {
    const g = peso(a.item.grupo) - peso(b.item.grupo)
    if (g) return g
    if (a.item.grupo === 'primeiro') return (b.score ?? 0) - (a.score ?? 0)
    return (a.item.quando ? +new Date(a.item.quando) : Infinity) - (b.item.quando ? +new Date(b.item.quando) : Infinity)
  })
}
