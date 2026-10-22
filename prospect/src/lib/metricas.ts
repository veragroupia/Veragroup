/* Métricas comerciais honestas: só envio confirmado conta como envio, resposta negativa não é conversão,
   variante só ganha crédito pelo contato que ela mesma originou, e amostra pequena é dita como pequena. */

export const AMOSTRA_MINIMA = 5

export interface MsgM { id: string; lead_id: string; direcao: 'enviada' | 'recebida'; confirmada?: boolean | null; origem: string; enviada_em: string; autor: string | null }
export interface EnvioM { status: string; aberto_em: string }
export interface LeadM { id: string; etapa: string; created_at: string; fechado_em: string | null; valor_setup: number | null; valor_mensal: number | null; nicho: string | null; whatsapp?: string | null; telefone?: string | null }
export interface IntelM { lead_id: string; estagio: string | null; necessidade: string | null; sinais: { codigo: string }[]; analisado_em?: string | null }
export interface HistM { lead_id: string; temperatura: string | null; created_at: string }
export interface RascM { lead_id: string; usada: 'a' | 'b' | null; enviada_confirmada_em: string | null; acao?: string | null; avaliacao_humana?: -1 | 1 | null; created_at?: string }
export interface RecebidoM { valor: number; pago_em: string | null }
export interface PropostaM { status: string; enviada_em: string | null }

/** Envio comprovado: confirmado pela equipe, lido do WhatsApp ou exportado dele. */
export const enviada = (m: MsgM) => m.direcao === 'enviada' && (m.confirmada === true || m.origem === 'whatsapp' || m.origem === 'importada')
/** Registro antigo de "abriu o WhatsApp", sem prova de envio. */
export const legado = (m: MsgM) => m.direcao === 'enviada' && m.confirmada == null && m.origem === 'manual'

const CONTEUDO = ['compartilhou_operacao', 'relatou_dificuldade', 'perguntou_servico', 'pediu_preco', 'pediu_exemplo', 'pediu_demonstracao', 'pediu_proposta', 'discutiu_prazo_ou_condicoes', 'quer_iniciar', 'objecao']
const QUALIFICADA = ['diagnostico', 'demonstracao', 'proposta', 'negociacao', 'fechado']
/** Resposta que fecha a porta: conta como resposta humana, nunca como sucesso comercial. */
const NEGATIVA = ['sem_interesse', 'pediu_para_parar', 'sem_necessidade_agora', 'resposta_educada_sem_interesse']

export interface Taxa { n: number; sim: number; pct: number | null }
const taxa = (sim: number, n: number): Taxa => ({ n, sim, pct: n >= AMOSTRA_MINIMA ? Math.round((sim / n) * 100) : null })

function mediana(xs: number[]) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function calcular(p: {
  desde: Date; mensagens: MsgM[]; envios: EnvioM[]; leads: LeadM[]; intel: IntelM[]; historico: HistM[]; rascunhos: RascM[]; propostas: PropostaM[]
  recebidos?: RecebidoM[]
}) {
  const noPeriodo = (s?: string | null) => !!s && new Date(s) >= p.desde
  const porLead = new Map<string, MsgM[]>()
  for (const m of [...p.mensagens].sort((a, b) => +new Date(a.enviada_em) - +new Date(b.enviada_em))) {
    const l = porLead.get(m.lead_id) ?? []; l.push(m); porLead.set(m.lead_id, l)
  }
  const respondeuDepois = (leadId: string, quando: string) => (porLead.get(leadId) ?? []).some((m) => m.direcao === 'recebida' && new Date(m.enviada_em) > new Date(quando))

  const enviosConfirmados = p.mensagens.filter((m) => enviada(m) && noPeriodo(m.enviada_em))
  const semConfirmacao = p.envios.filter((e) => e.status === 'aberto' && noPeriodo(e.aberto_em)).length
  const naoEnviados = p.envios.filter((e) => e.status === 'nao_enviado' && noPeriodo(e.aberto_em)).length
  const legados = p.mensagens.filter(legado).length

  // Primeiro contato confirmado de cada lead.
  const primeiro = new Map<string, string>()
  for (const [id, msgs] of porLead) { const m = msgs.find(enviada); if (m) primeiro.set(id, m.enviada_em) }
  const primeiros = [...primeiro].filter(([, em]) => noPeriodo(em))
  const responderam = primeiros.filter(([id, em]) => respondeuDepois(id, em))

  // Tempo até a resposta: envio confirmado seguido de resposta do cliente.
  const horas: number[] = []
  for (const msgs of porLead.values()) {
    for (let i = 0; i < msgs.length - 1; i++) {
      if (!enviada(msgs[i]) || !noPeriodo(msgs[i].enviada_em)) continue
      const r = msgs.slice(i + 1).find((m) => m.direcao === 'recebida')
      const outraNossa = msgs.slice(i + 1).find((m) => m.direcao === 'enviada')
      if (r && (!outraNossa || new Date(r.enviada_em) <= new Date(outraNossa.enviada_em))) horas.push((+new Date(r.enviada_em) - +new Date(msgs[i].enviada_em)) / 3600e3)
    }
  }

  const intelDe = new Map(p.intel.map((i) => [i.lead_id, i]))
  const uteis = responderam.filter(([id]) => intelDe.get(id)?.sinais?.some((s) => CONTEUDO.includes(s.codigo))).length
  const negativas = responderam.filter(([id]) => intelDe.get(id)?.sinais?.some((s) => NEGATIVA.includes(s.codigo))).length
  const qualificadas = p.intel.filter((i) => QUALIFICADA.includes(i.estagio ?? '') || !!i.necessidade).length
  const demonstracoes = p.intel.filter((i) => i.sinais?.some((s) => s.codigo === 'pediu_demonstracao')).length

  const fechados = p.leads.filter((l) => l.etapa === 'fechado' && noPeriodo(l.fechado_em))
  const comValor = fechados.filter((l) => (l.valor_setup ?? 0) > 0 || (l.valor_mensal ?? 0) > 0)

  // Variante: só sugestões cujo envio foi confirmado, e resposta depois desse envio.
  const variante = (v: 'a' | 'b') => {
    const usadas = p.rascunhos.filter((r) => r.usada === v && r.enviada_confirmada_em && noPeriodo(r.enviada_confirmada_em))
    return taxa(usadas.filter((r) => respondeuDepois(r.lead_id, r.enviada_confirmada_em!)).length, usadas.length)
  }

  // Temperatura na primeira classificação do lead: o que aconteceu depois (resposta e fechamento).
  const inicial = new Map<string, string>()
  for (const h of [...p.historico].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))) if (h.temperatura && !inicial.has(h.lead_id)) inicial.set(h.lead_id, h.temperatura)
  const leadDe = new Map(p.leads.map((l) => [l.id, l]))
  const porTemperatura = ['frio', 'desconhecido', 'morno', 'quente'].map((t) => {
    const ids = [...inicial].filter(([, x]) => x === t).map(([id]) => id)
    return { temperatura: t, resposta: taxa(ids.filter((id) => (porLead.get(id) ?? []).some((m) => m.direcao === 'recebida')).length, ids.length), fechados: ids.filter((id) => leadDe.get(id)?.etapa === 'fechado').length }
  })

  const segmentos = new Map<string, { n: number; sim: number }>()
  for (const [id, em] of primeiros) {
    const nicho = leadDe.get(id)?.nicho
    if (!nicho || nicho.length > 40) continue
    const x = segmentos.get(nicho) ?? { n: 0, sim: 0 }
    x.n++; if (respondeuDepois(id, em)) x.sim++
    segmentos.set(nicho, x)
  }

  // Por abordagem (ação recomendada quando a mensagem foi preparada): só envios confirmados, resposta depois do envio.
  const porAcao = new Map<string, { n: number; sim: number }>()
  for (const r of p.rascunhos) {
    if (!r.acao || !r.enviada_confirmada_em || !noPeriodo(r.enviada_confirmada_em)) continue
    const x = porAcao.get(r.acao) ?? { n: 0, sim: 0 }
    x.n++; if (respondeuDepois(r.lead_id, r.enviada_confirmada_em)) x.sim++
    porAcao.set(r.acao, x)
  }
  const avaliadas = p.rascunhos.filter((r) => r.avaliacao_humana && noPeriodo(r.created_at))

  return {
    analisados: p.intel.filter((i) => noPeriodo(i.analisado_em)).length,
    respostasNegativas: negativas,
    respostaPositiva: taxa(responderam.length - negativas, primeiros.length),
    receitaRecebida: (p.recebidos ?? []).filter((x) => noPeriodo(x.pago_em)).reduce((s, x) => s + (Number(x.valor) || 0), 0),
    abordagens: [...porAcao].map(([acao, x]) => ({ acao, ...taxa(x.sim, x.n) })).sort((a, b) => b.n - a.n),
    avaliacaoHumana: { boas: avaliadas.filter((r) => r.avaliacao_humana === 1).length, ruins: avaliadas.filter((r) => r.avaliacao_humana === -1).length },
    pesquisados: p.leads.filter((l) => noPeriodo(l.created_at)).length,
    aptos: p.leads.filter((l) => !['fechado', 'perdido', 'descartado'].includes(l.etapa) && (l.whatsapp || l.telefone)).length,
    enviosConfirmados: enviosConfirmados.length, semConfirmacao, naoEnviados, legados,
    primeirosContatos: primeiros.length,
    respostaHumana: taxa(responderam.length, primeiros.length),
    respostasUteis: uteis,
    medianaHorasResposta: mediana(horas), amostraTempo: horas.length,
    conversasQualificadas: qualificadas,
    demonstracoes,
    propostas: p.propostas.filter((x) => x.enviada_em && noPeriodo(x.enviada_em)).length,
    ganhas: fechados.length,
    perdidas: p.leads.filter((l) => l.etapa === 'perdido').length,
    receitaSetup: comValor.reduce((s, l) => s + (l.valor_setup ?? 0), 0),
    receitaMensal: comValor.reduce((s, l) => s + (l.valor_mensal ?? 0), 0),
    fechadosSemValor: fechados.length - comValor.length,
    variantes: { a: variante('a'), b: variante('b') },
    porTemperatura,
    segmentos: [...segmentos].map(([nome, x]) => ({ nome, ...taxa(x.sim, x.n) })).sort((a, b) => b.n - a.n).slice(0, 8),
    porDia: enviosConfirmados,
  }
}
