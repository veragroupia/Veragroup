import type { Bloqueio, LeadBase, Msg } from './tipos.ts'

/* Leitura determinística da conversa: quem falou por último, se há pergunta pendente,
   pedido para parar, promessa do vendedor e retorno combinado. Nada aqui chama IA. */

export function normalizar(s: string | null | undefined) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

// Pedido explícito para não receber mais mensagens. Bloqueia qualquer recomendação comercial.
const PARAR = [
  /nao (me |nos )?(chame|chamem|mande|mandem|procure|procurem|contate|contatem|liguem?|envie|enviem)( mais)?/,
  /\b(pare|para|parem) de (me |nos )?(mandar|enviar|chamar|ligar)/,
  /nao (quero|queremos) (mais )?(receber|ser contatad|que (me|nos) chame)/,
  /(me |nos )?(tira|tire|remove|remova|exclui|exclua)( (meu|o meu|nosso) (numero|contato))? da (sua |de )?lista/,
  /\bsair da lista\b/,
  /\bdescadastr/,
  /\bvou (te )?bloquear\b/,
  /\bisso (e|eh) spam\b/,
  /nao entre(m)? (mais )?em contato/,
]
// Sem interesse, mas sem pedir para parar: encerra a oportunidade, não bloqueia o contato.
const SEM_INTERESSE = [
  /\bnao (tenho|temos|ha) interesse\b/,
  /\bsem interesse\b/,
  /\bnao (preciso|precisamos)\b/,
  /\bnao (quero|queremos)( nao)?[.!]?$/,
  /\b(obrigad[oa]|valeu),? mas nao\b/,
  /\bja (tenho|temos) (site|cardapio|catalogo|alguem|quem faz|uma empresa)/,
  /\bnao e (o )?momento\b/,
]
// O vendedor prometeu entregar algo.
const PROMESSA = /\b(vou (te |lhe |)?(mandar|enviar|passar|preparar|montar|separar|fazer)|te (mando|envio|passo)|ja (te )?(mando|envio|passo)|preparo (uma|um|o|a))\b/
// Intenção de combinar retorno ("me chama", "fala comigo"...)
const RETORNO = /\b(me chama|chama (a gente|nos|de novo)|pode chamar|fala comigo|falamos|conversamos|volt(a|amos|e) a falar|retorna|me procura|entra em contato|me liga|chama ai|me lembra)\b/
const INTERROGATIVA = /^(quanto|qual|quais|como|onde|quando|por ?que|voces (fazem|tem|trabalham)|tem como|da pra|pode|poderia|manda|me (manda|envia|passa)|consegue)\b/

export interface Leitura {
  total: number
  doLead: number
  nossas: number
  ultimaDe: 'lead' | 'vera' | null
  ultima: Msg | null
  /** Mensagens seguidas da Vera desde a última fala do lead. */
  nossasSemResposta: number
  /** O lead falou por último e há pergunta ou pedido no que ele disse. */
  perguntaPendente: string | null
  horasDesdeUltima: number | null
  pediuParaParar: Msg | null
  semInteresse: Msg | null
  compromissoVendedor: string | null
  retornoPedido: { em: string; texto: string; mensagem_id: string } | null
  /** Horários em que o lead respondeu a uma mensagem nossa. */
  respostas: { em: string; aposHoras: number }[]
}

export function ordenar(msgs: Msg[]) {
  return [...msgs].sort((a, b) => +new Date(a.enviada_em) - +new Date(b.enviada_em))
}

/**
 * `liberadoEm`: a equipe liberou o contato depois de um pedido para parar. Pedidos anteriores a essa data deixam de bloquear.
 */
export function lerConversa(msgsEntrada: Msg[], agora = new Date(), opcoes: { liberadoEm?: string | null } = {}): Leitura {
  const msgs = ordenar(msgsEntrada)
  const ultima = msgs[msgs.length - 1] ?? null
  const ultimaDe = ultima ? (ultima.direcao === 'recebida' ? 'lead' : 'vera') : null

  let nossasSemResposta = 0
  for (let i = msgs.length - 1; i >= 0 && msgs[i].direcao === 'enviada'; i--) nossasSemResposta++

  // O que o lead disse desde a nossa última mensagem.
  const trechoLead: Msg[] = []
  for (let i = msgs.length - 1; i >= 0 && msgs[i].direcao === 'recebida'; i--) trechoLead.unshift(msgs[i])
  const pergunta = trechoLead.map((m) => m.texto ?? '').find((t) => t.includes('?') || INTERROGATIVA.test(normalizar(t)))
  const perguntaPendente = ultimaDe === 'lead' ? (pergunta || trechoLead.map((m) => m.texto).filter(Boolean).join(' ').slice(0, 300) || '[mídia]') : null

  const recebidas = msgs.filter((m) => m.direcao === 'recebida')
  // Só a fala mais recente do lead decide parar/sem interesse; um "não" antigo seguido de conversa não vale mais.
  const ultimaDoLead = recebidas[recebidas.length - 1] ?? null
  // Pedido para parar vale para sempre, até a equipe liberar o contato de propósito.
  const liberado = opcoes.liberadoEm ? +new Date(opcoes.liberadoEm) : -Infinity
  const pediuParaParar = recebidas.slice().reverse().find((m) => +new Date(m.enviada_em) > liberado && PARAR.some((r) => r.test(normalizar(m.texto)))) ?? null
  const semInteresse = ultimaDoLead && SEM_INTERESSE.some((r) => r.test(normalizar(ultimaDoLead.texto))) ? ultimaDoLead : null

  // Promessa só conta se a Vera falou por último (ainda não entregou nada depois).
  let compromissoVendedor: string | null = null
  if (ultimaDe === 'vera') {
    const nossas = msgs.slice(msgs.length - nossasSemResposta)
    const p = nossas.reverse().find((m) => PROMESSA.test(normalizar(m.texto)))
    if (p) compromissoVendedor = (p.texto ?? '').slice(0, 200)
  }

  let retornoPedido: Leitura['retornoPedido'] = null
  for (const m of recebidas.slice().reverse()) {
    const em = dataDeRetorno(m.texto, new Date(m.enviada_em))
    if (em) { retornoPedido = { em: em.toISOString(), texto: (m.texto ?? '').slice(0, 200), mensagem_id: m.id }; break }
  }

  const respostas: Leitura['respostas'] = []
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i].direcao === 'recebida' && msgs[i - 1].direcao === 'enviada') {
      respostas.push({ em: msgs[i].enviada_em, aposHoras: (+new Date(msgs[i].enviada_em) - +new Date(msgs[i - 1].enviada_em)) / 3600e3 })
    }
  }

  return {
    total: msgs.length,
    doLead: recebidas.length,
    nossas: msgs.length - recebidas.length,
    ultimaDe, ultima, nossasSemResposta, perguntaPendente,
    horasDesdeUltima: ultima ? (agora.getTime() - new Date(ultima.enviada_em).getTime()) / 3600e3 : null,
    pediuParaParar,
    semInteresse, compromissoVendedor, retornoPedido, respostas,
  }
}

/* ---------- Retorno combinado ("me chama semana que vem") ---------- */

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** Lê a data que o cliente pediu, relativa a quando ele escreveu. Devolve 09:00 no fuso de Brasília. */
export function dataDeRetorno(texto: string | null, base: Date): Date | null {
  const t = normalizar(texto)
  if (!t || !RETORNO.test(t)) return null
  const local = paraLocal(base)
  let d: { y: number; m: number; dia: number } | null = null
  const soma = (n: number) => {
    const x = new Date(Date.UTC(local.y, local.m - 1, local.dia + n))
    return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, dia: x.getUTCDate() }
  }
  const diaSemana = new Date(Date.UTC(local.y, local.m - 1, local.dia)).getUTCDay()

  let m: RegExpMatchArray | null
  if (/depois de amanha/.test(t)) d = soma(2)
  else if (/\bamanha\b/.test(t)) d = soma(1)
  else if ((m = t.match(/daqui a (\d{1,2}) dias?/))) d = soma(Number(m[1]))
  else if (/(semana que vem|proxima semana)/.test(t)) d = soma(((8 - diaSemana) % 7) || 7) // próxima segunda
  else if (/(mes que vem|proximo mes)/.test(t)) d = { y: local.m === 12 ? local.y + 1 : local.y, m: local.m === 12 ? 1 : local.m + 1, dia: 1 }
  else if ((m = t.match(/\bdia (\d{1,2})(?:\/(\d{1,2}))?/))) {
    const dia = Number(m[1]); let mes = m[2] ? Number(m[2]) : local.m; let ano = local.y
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null
    if (!m[2] && dia <= local.dia) { mes++; if (mes > 12) { mes = 1; ano++ } }
    else if (m[2] && (mes < local.m || (mes === local.m && dia <= local.dia))) ano++
    d = { y: ano, m: mes, dia }
  } else {
    const i = DIAS_SEMANA.findIndex((n) => new RegExp(`\\b${n}(-feira)?\\b`).test(t))
    if (i >= 0) d = soma(((i - diaSemana + 7) % 7) || 7)
  }
  if (!d) return null
  return new Date(`${d.y}-${String(d.m).padStart(2, '0')}-${String(d.dia).padStart(2, '0')}T09:00:00-03:00`)
}

/** Data no fuso de Brasília (sem horário de verão desde 2019). */
export function paraLocal(d: Date, fuso = 'America/Sao_Paulo') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(d).map((x) => [x.type, x.value]))
  return { y: Number(p.year), m: Number(p.month), dia: Number(p.day), h: Number(p.hour), min: Number(p.minute), semana: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) }
}

/* ---------- Bloqueio por telefone ou place_id ---------- */

/** DDD + últimos 8 dígitos: o mesmo critério do webhook do WhatsApp. */
export function telefoneChave(s: string | null | undefined): string | null {
  let d = (s ?? '').replace(/\D/g, '').replace(/^0+/, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length < 10) return null
  return d.slice(0, 2) + d.slice(-8)
}

export function bloqueioDoLead(lead: Pick<LeadBase, 'id' | 'telefone' | 'whatsapp' | 'place_id'>, bloqueios: Bloqueio[]): Bloqueio | null {
  const chaves = new Set([telefoneChave(lead.whatsapp), telefoneChave(lead.telefone)].filter(Boolean))
  return bloqueios.find((b) =>
    (b.lead_id && b.lead_id === lead.id) ||
    (b.telefone_chave && chaves.has(b.telefone_chave)) ||
    (b.place_id && lead.place_id && b.place_id === lead.place_id)) ?? null
}
