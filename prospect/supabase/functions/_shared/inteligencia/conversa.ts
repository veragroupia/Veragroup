import type { Bloqueio, LeadBase, Msg } from './tipos.ts'

/* Leitura determinística da conversa: quem falou por último, se há pergunta pendente,
   pedido para parar, promessa do vendedor e retorno combinado. Nada aqui chama IA. */

export function normalizar(s: string | null | undefined) {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
}

/* Interpretação de falas do cliente. Não decide por palavra solta: "já tenho site, mas quero melhorar"
   não é desinteresse, "não preciso agora" não é pedido para parar, "não quero perder tempo mandando foto"
   é uma dificuldade. Só o que é explícito vira regra; o resto fica para a análise da IA, validada depois. */

// Pedido explícito para não receber mais mensagens. Bloqueia qualquer recomendação comercial.
const PARAR = [
  /\bnao (me |nos )?(chame|chamem|chama|procure|procurem|contate|contatem|ligue|liguem|mande|mandem|manda|envie|enviem) mais\b/,
  /\bnunca mais (me |nos )?(chame|chamem|procure|procurem|mande|mandem|envie|enviem|ligue|liguem)\b/,
  /\bnao (me |nos )?(procure|procurem|contate|contatem)\b/,
  /\bnao (me |nos )?(mande|mandem|envie|enviem) (mais )?(mensage|propaganda|promoc|oferta)/,
  /\b(pare|parem|para) de (me |nos )?(mandar|enviar|chamar|ligar|encher|perturbar)/,
  /\bnao (quero|queremos) (mais )?(receber|ser contatad|ser incomodad|que (me|nos) (chame|chamem|mande|mandem|ligue|liguem|procure))/,
  /\b(me |nos )?(tira|tire|tirar|remove|remova|remover|exclui|exclua|excluir)( (meu|o meu|nosso|o nosso) (numero|contato))? d(a|essa|esta) (sua |de )?lista/,
  /\bsair da lista\b/,
  /\bdescadastr/,
  /\bvou (te )?bloquear\b/,
  /\bisso (e|eh) spam\b/,
  /\bnao entre(m)? (mais )?em contato/,
]
const CONTRASTE = /\b(mas|porem|so que|entretanto|contudo|no entanto|agora)\b(.*)$/
const QUER_MUDAR = /\b(quero|queria|quer|queremos|gostaria|gostariamos|preciso|precisava|precisamos|pensando em) (melhorar|atualizar|refazer|mudar|trocar|reformular|um novo|uma nova|outro|outra|arrumar|modernizar|deixar melhor)|\bdesatualizad|\b(antig|ultrapassad|feio|fraco|ruim|largad|abandonad|parad)[oa]s?\b|\bnao (funciona|atende|ta bom|esta bom|ta legal|gosto)\b|\bquanto (fica|custa|sai|seria|cobra)|\bvalor|\bpreco|\borcamento|\bcomo funciona/
const JA_TEM = /\bja (tenho|temos|tem|uso|usamos|fazemos|possuo|possuimos)\b.{0,30}\b(site|cardapio|catalogo|alguem|quem faz|empresa|sistema|pagina|app|aplicativo|landing|loja)/
const SATISFEITO = /\b(atende|funciona|resolve|serve|da conta|ta otimo|esta otimo|ta bom|esta bom|ta de boa|gosto|gostamos|satisfeit|suficiente|tranquilo)\b/
const DIFICULDADE = /\bnao (quero|aguento|consigo|da (mais )?pra) (mais )?(perder|ficar perdendo|gastar|ficar gastando|ficar mandando|mandar (foto|tudo)|responder tudo)|\b(perco|perde|perdemos|gasto|gastamos|toma|tomando) (muito )?tempo\b|\bcorreria\b|\bnao (dou|damos) conta\b|\bmuita (gente|mensagem|demanda)\b/
const SEM_NECESSIDADE_AGORA = [
  /\bnao (preciso|precisamos|e (o |um bom )?momento|vai dar|da)\b.{0,40}\b(agora|no momento|por enquanto|ainda|esse mes|este mes|esse ano|este ano|nesse momento|neste momento)\b/,
  /\b(agora|no momento|por enquanto|nesse momento|neste momento),? (nao|ainda nao)\b/,
  /\bmais (pra|para) frente\b/,
  /\bnao (e|eh) (o|um bom) momento\b/,
  /\bfica (pra|para) (depois|outra hora|a proxima|uma proxima)\b/,
  /\bsem (verba|dinheiro|orcamento) (agora|no momento|por enquanto)/,
]
const RECUSA = [
  /\bnao (tenho|temos|ha) (nenhum )?interesse\b/,
  /\bsem interesse\b/,
  /\bnao (me |nos )?interessa\b/,
  /\b(obrigad[oa]|valeu|agradeco),? mas nao\b/,
  /^nao,? obrigad[oa]/,
  /^nao (quero|queremos)( nao)?[.!]*$/,
  /^nao (preciso|precisamos)( nao| disso| de nada)?[,.!]*( obrigad[oa])?[.!]*$/,
  /\bnao (precisamos|preciso) de (site|cardapio|catalogo|pagina|landing|sistema|nada disso)\b(?!.*\b(agora|momento|ainda)\b)/,
]
const SEM_DIFICULDADE = /\b(funciona|ta funcionando|esta funcionando|da|ta|esta|fica|vai) (bem|tranquilo|de boa|certinho|direitinho)\b|\b(nao|sem) (temos |tenho )?(problema|dificuldade)s?\b|\bda conta\b|\batende (bem|direitinho|tranquilo)\b/
const PEDIU_TEMPO = /\b(vou|vamos) (pensar|ver|analisar|avaliar|conversar|falar com|decidir|dar uma olhada|ver direitinho)\b|\bdeixa (eu|a gente) (ver|pensar)\b|\b(te|lhe) (falo|aviso|retorno|dou (um )?retorno)\b|\bdepois (te |a gente )?(falo|vejo|retorno|conversa)\b|\bpreciso (pensar|ver com|conversar com|falar com)\b/

/** Pergunta de preço explícita: dá para afirmar sem IA (e a resposta precisa trazer o valor). */
const PRECO = /\bquanto (custa|fica|sai|cobra|cobram|seria|e|eh|ficaria|sairia)\b|\bqual (e |eh )?(o )?(valor|preco|investimento)\b|\b(me passa|manda|tem) (os |o )?(valores|valor|precos|preco|orcamento)\b|\bvalores\?|\bpreco\?|\borcamento\b/

export type TipoFala = 'parar' | 'quer_melhorar' | 'dificuldade' | 'sem_necessidade_agora' | 'recusa' | 'ja_tem_satisfeito' | 'sem_dificuldade' | 'ja_tem' | 'pediu_tempo'

/** O que uma fala do cliente quer dizer, quando é claro. null = nada explícito (a IA analisa). */
export function interpretarFala(texto: string | null | undefined): TipoFala | null {
  const t = normalizar(texto).replace(/[“”"]/g, '')
  if (!t) return null
  if (PARAR.some((r) => r.test(t))) return 'parar'
  const contraste = t.match(CONTRASTE)
  const jaTem = JA_TEM.test(t)
  // "já tenho, mas quero melhorar", "está desatualizado", "quanto fica?": interesse, não recusa.
  if ((contraste && QUER_MUDAR.test(contraste[2])) || (jaTem && QUER_MUDAR.test(t)) || /\bdesatualizad/.test(t)) return 'quer_melhorar'
  if (DIFICULDADE.test(t)) return 'dificuldade'
  if (SEM_NECESSIDADE_AGORA.some((r) => r.test(t))) return 'sem_necessidade_agora'
  if (RECUSA.some((r) => r.test(t))) return 'recusa'
  if (jaTem && SATISFEITO.test(t)) return 'ja_tem_satisfeito'
  if (SEM_DIFICULDADE.test(t)) return 'sem_dificuldade'
  if (jaTem) return 'ja_tem'
  if (PEDIU_TEMPO.test(t)) return 'pediu_tempo'
  return null
}

// O vendedor prometeu entregar algo.
const PROMESSA = /\b(vou (te |lhe |)?(mandar|enviar|passar|preparar|montar|separar|fazer)|te (mando|envio|passo)|ja (te )?(mando|envio|passo)|preparo (uma|um|o|a))\b/
// Intenção de combinar retorno ("me chama", "fala comigo"...)
const RETORNO = /\b(me chama|chama (a gente|nos|de novo)|pode chamar|fala comigo|falamos|conversamos|volt(a|amos|e) a falar|retorna|me procura|entra em contato|me liga|chama ai|me lembra|te (chamo|falo|aviso|procuro|retorno)|a gente (se )?fala|vejo isso|vemos isso|decido|resolvo isso)\b/
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
  /** Recusa clara na fala mais recente do cliente. */
  semInteresse: Msg | null
  /** Interpretação do que o cliente disse desde a nossa última mensagem (o "bloco" atual). */
  falaAtual: { tipo: TipoFala; msg: Msg } | null
  /** Ids das mensagens do cliente desde a nossa última mensagem. */
  blocoAtual: string[]
  /** Nossa última mensagem fez uma pergunta que ainda não teve resposta. */
  perguntaNossaPendente: string | null
  /** Perguntas que a Vera já fez na conversa (para não repetir). */
  perguntasFeitas: string[]
  /** Mensagem mais recente do cliente perguntando preço. */
  pediuPreco: Msg | null
  compromissoVendedor: string | null
  /** `exato` = o cliente disse o dia ("amanhã", "dia 12", "quinta"). "Semana que vem" não é dia combinado. */
  retornoPedido: { em: string; texto: string; mensagem_id: string; exato: boolean } | null
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
  const pediuParaParar = recebidas.slice().reverse().find((m) => +new Date(m.enviada_em) > liberado && interpretarFala(m.texto) === 'parar') ?? null

  // O bloco atual é lido junto ("Já temos cardápio." + "Mas tá desatualizado") e mensagem por mensagem.
  let falaAtual: Leitura['falaAtual'] = null
  if (trechoLead.length) {
    const junto = interpretarFala(trechoLead.map((m) => m.texto ?? '').join('. '))
    const individual = [...trechoLead].reverse().map((m) => ({ tipo: interpretarFala(m.texto), msg: m })).find((x) => x.tipo)
    if (junto) falaAtual = { tipo: junto, msg: individual?.tipo === junto ? individual.msg : trechoLead[trechoLead.length - 1] }
    else if (individual?.tipo) falaAtual = individual as { tipo: TipoFala; msg: Msg }
  } else if (ultimaDoLead) {
    const tipo = interpretarFala(ultimaDoLead.texto)
    if (tipo) falaAtual = { tipo, msg: ultimaDoLead }
  }
  const semInteresse = falaAtual?.tipo === 'recusa' ? falaAtual.msg : null

  const pediuPreco = recebidas.slice().reverse().find((m) => PRECO.test(normalizar(m.texto))) ?? null
  const perguntasFeitas = msgs.filter((m) => m.direcao === 'enviada').flatMap((m) => perguntasDoTexto(m.texto))
  const ultimaNossa = ultimaDe === 'vera' ? ultima : null
  const perguntaNossaPendente = ultimaNossa ? perguntasDoTexto(ultimaNossa.texto).pop() ?? null : null

  // Promessa só conta se a Vera falou por último (ainda não entregou nada depois).
  let compromissoVendedor: string | null = null
  if (ultimaDe === 'vera') {
    const nossas = msgs.slice(msgs.length - nossasSemResposta)
    const p = nossas.reverse().find((m) => PROMESSA.test(normalizar(m.texto)))
    if (p) compromissoVendedor = (p.texto ?? '').slice(0, 200)
  }

  let retornoPedido: Leitura['retornoPedido'] = null
  for (const m of recebidas.slice().reverse()) {
    const r = lerRetorno(m.texto, new Date(m.enviada_em))
    if (r) { retornoPedido = { em: r.em.toISOString(), texto: (m.texto ?? '').slice(0, 200), mensagem_id: m.id, exato: r.exato }; break }
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
    semInteresse, falaAtual, blocoAtual: trechoLead.map((m) => m.id), perguntaNossaPendente, perguntasFeitas, pediuPreco,
    compromissoVendedor, retornoPedido, respostas,
  }
}

/* ---------- Retorno combinado ("me chama semana que vem") ---------- */

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** Perguntas de um texto (frases terminadas em "?"). */
export function perguntasDoTexto(texto: string | null | undefined): string[] {
  return (texto ?? '').split(/(?<=[?.!])\s+|\n+/).map((x) => x.trim()).filter((x) => x.endsWith('?') && x.length > 3)
}

/** Data que o cliente pediu e se ele disse o dia de fato. */
export function lerRetorno(texto: string | null, base: Date): { em: Date; exato: boolean } | null {
  const em = dataDeRetorno(texto, base)
  if (!em) return null
  return { em, exato: !/(semana que vem|proxima semana|mes que vem|proximo mes)/.test(normalizar(texto)) }
}

/** Lê a data que o cliente pediu, relativa a quando ele escreveu. Devolve 09:00 no fuso de Brasília.
    "Semana que vem" vira a segunda seguinte só como referência: não é horário combinado (ver lerRetorno). */
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
