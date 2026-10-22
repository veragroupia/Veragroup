import { z } from 'zod'
import { validarOferta, type Oferta } from './catalogo.ts'
import { interpretarFala, normalizar } from './conversa.ts'
import { expressoesProibidas, LIMITE_SEMELHANCA, perguntas, semelhanca } from './texto.ts'
import { ACOES_DE_RESPOSTA, CODIGOS_SINAL, SINAIS, SOLUCOES, type CodigoSinal, type Sinal } from './tipos.ts'

/* Contrato de saída da IA. Nada do que o modelo devolve é usado sem passar por aqui:
   enums conferidos, ids de evidência e de oferta checados contra o que foi enviado,
   campos ausentes com padrão seguro. JSON quebrado vira erro tratável, não tela quebrada. */

export class ErroContrato extends Error {
  constructor(msg: string, readonly bruto?: string) { super(msg); this.name = 'ErroContrato' }
}

const texto = (max: number) => z.preprocess((v) => {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t && t.toLowerCase() !== 'null' ? t.slice(0, max) : null
}, z.string().nullable())

const EvidIA = z.object({ texto: z.string(), evidencia_id: z.string().nullable().optional() })
const EvidOpcional = EvidIA.nullable().catch(null)
const MemoriaIASchema = z.object({
  perguntas_respondidas: z.array(z.object({ pergunta: z.string(), resposta: z.string(), evidencia_id: z.string().nullable().optional() })).max(20).catch([]),
  necessidades: z.array(EvidIA).max(10).catch([]),
  objecoes: z.array(EvidIA.extend({ resolvida: z.boolean().catch(false) })).max(10).catch([]),
  compromissos: z.array(EvidIA.extend({ quem: z.enum(['vera', 'cliente']).catch('vera'), prazo: z.string().nullable().catch(null), cumprido: z.boolean().catch(false) })).max(10).catch([]),
  ofertas: z.array(z.object({ oferta: z.string(), reacao: z.enum(['positiva', 'neutra', 'negativa', 'sem_resposta']).catch('sem_resposta'), evidencia_id: z.string().nullable().optional() })).max(10).catch([]),
  spin: z.object({ situacao: EvidOpcional, problema: EvidOpcional, implicacao: EvidOpcional, valor: EvidOpcional }).partial().catch({}),
  champ: z.object({ desafio: EvidOpcional, autoridade: EvidOpcional, condicoes: EvidOpcional, prioridade: EvidOpcional }).partial().catch({}),
}).partial()

const SinalIA = z.object({ codigo: z.string(), evidencia_id: z.string().nullable().optional(), detalhe: z.string().optional() })
const FatoIA = z.object({
  fato: z.string(),
  fonte: z.enum(['cliente', 'pesquisa', 'equipe', 'hipotese']).catch('hipotese'),
  evidencia_id: z.string().nullable().optional(),
})

export const AnaliseIASchema = z.object({
  sinais: z.array(SinalIA).max(30).catch([]),
  necessidade_identificada: texto(300).optional(),
  solucao: z.enum(SOLUCOES).catch('indefinida'),
  oferta_id: texto(60).optional(),
  conhecido: z.array(FatoIA).max(20).catch([]),
  desconhecido: z.array(z.string()).max(10).catch([]),
  pergunta_prioritaria: texto(300).optional(),
  assuntos_resolvidos: z.array(z.string()).max(12).catch([]),
  pergunta_pendente_do_cliente: texto(300).optional(),
  objecao_aberta: texto(300).optional(),
  mudou_de_assunto: z.boolean().catch(false),
  mencionar_assunto_anterior: z.boolean().catch(false),
  acao_sugerida: z.enum(ACOES_DE_RESPOSTA).nullable().catch(null),
  dados_suficientes: z.boolean().catch(false),
  estilo_cliente: z.enum(['formal', 'informal', 'neutro']).catch('neutro'),
  resumo: z.string().catch('').transform((s) => s.slice(0, 600)),
  memoria: MemoriaIASchema.optional().catch(undefined),
})

export { ANALISE_VAZIA, type Analise, type Fato } from './analise.ts'
import { MEMORIA_VAZIA, type Analise, type Evidenciado, type Fato, type MemoriaComercial } from './analise.ts'

/** Sinais que só as regras podem afirmar (contagem de mensagens), nunca a IA. */
const SO_REGRA: CodigoSinal[] = ['respondeu', 'conversa_continua']

/** Tira o primeiro objeto JSON do texto do modelo. */
export function lerJson(bruto: string): unknown {
  const m = bruto.match(/\{[\s\S]*\}/)
  if (!m) throw new ErroContrato('A IA não devolveu JSON.', bruto.slice(0, 500))
  try { return JSON.parse(m[0]) } catch { throw new ErroContrato('A IA devolveu um JSON inválido.', bruto.slice(0, 500)) }
}

/** Uma evidência enviada à IA. `direcao` diz de quem é a mensagem; dados do cadastro e da equipe não têm direção. */
export interface Evidencia { direcao: 'recebida' | 'enviada' | null; texto: string; em: string | null }

export interface CtxAnalise {
  /** Tudo o que foi enviado como evidência (msg_*, lead.*, observacao_vendedor, equipe.*), pelo id. */
  evidencias: Map<string, Evidencia>
  catalogo: Oferta[]
}

/** O texto da evidência tem a ver com o sinal? Barreira contra a IA prender um sinal forte numa mensagem qualquer. */
const PERTINENCIA: Partial<Record<CodigoSinal, RegExp>> = {
  pediu_preco: /quanto|valor|preco|custa|cobra|orcamento|investimento|r\$|tabela/,
  pediu_proposta: /proposta|orcamento|valores|preco|quanto|manda|envia|passa|fechar|contrat|quero|queria|faz|fazer|monta/,
  quer_iniciar: /vamos|bora|fechado|fechar|fecha|pode (fazer|comecar|seguir|mandar)|quero|queremos|contrat|comecar|iniciar|topo|aceito|contrato|pix|pagamento|pagar/,
  discutiu_prazo_ou_condicoes: /prazo|dias|semana|quando|pagamento|pagar|parcel|entrada|pix|cartao|data|fica pronto|demora/,
  pediu_demonstracao: /mostra|ver|exemplo|demonstra|como fica|como ficaria|modelo|link|video|apresenta|testar/,
  pediu_para_parar: /nao|pare|para|spam|bloque|lista|incomod|chega/,
}
/** Sinais negativos que a regra desmente quando a fala é claramente de interesse ("mas quero melhorar"). */
const NEGATIVOS: CodigoSinal[] = ['sem_interesse', 'resposta_educada_sem_interesse', 'ja_tem_solucao_satisfatoria', 'sem_necessidade_agora']

export function validarAnalise(raw: unknown, ctx: CtxAnalise): { analise: Analise; descartados: string[] } {
  const p = AnaliseIASchema.safeParse(raw)
  if (!p.success) throw new ErroContrato('A análise da IA veio fora do formato esperado.')
  const a = p.data
  const descartados: string[] = []
  const ev = (id: string | null | undefined) => (id ? ctx.evidencias.get(id) ?? null : null)
  const doCliente = (id: string | null | undefined) => ev(id)?.direcao === 'recebida'

  const solucao = a.solucao
  const oferta_id = validarOferta(a.oferta_id, solucao, ctx.catalogo)
  if (a.oferta_id && !oferta_id) descartados.push(`oferta "${a.oferta_id}" fora do catálogo ou incompatível com ${solucao}`)

  const sinais: Sinal[] = []
  for (const s of a.sinais) {
    const codigo = s.codigo as CodigoSinal
    if (!CODIGOS_SINAL.includes(codigo) || SO_REGRA.includes(codigo)) { descartados.push(`sinal "${s.codigo}" não permitido`); continue }
    const id = s.evidencia_id ?? null
    const e = ev(id)
    if (!e) { descartados.push(`sinal "${codigo}" com evidência inexistente`); continue }
    // Interesse só existe se o cliente disse algo: a evidência tem de ser mensagem DELE, não do vendedor.
    if (SINAIS[codigo].grupo === 'interesse' && e.direcao !== 'recebida') { descartados.push(`sinal "${codigo}" apoiado em mensagem que não é do cliente`); continue }
    if (e.direcao === 'enviada') { descartados.push(`sinal "${codigo}" apoiado em mensagem do vendedor`); continue }
    const t = normalizar(e.texto)
    const pert = PERTINENCIA[codigo]
    if (pert && !pert.test(t)) { descartados.push(`sinal "${codigo}" sem relação com a mensagem citada`); continue }
    if (NEGATIVOS.includes(codigo) && e.direcao === 'recebida' && ['quer_melhorar', 'dificuldade'].includes(interpretarFala(e.texto) ?? '')) {
      descartados.push(`sinal "${codigo}" contrariado pela própria fala do cliente`); continue
    }
    if (codigo === 'oferta_no_catalogo' && !oferta_id) { descartados.push('oferta_no_catalogo sem oferta válida'); continue }
    if (sinais.some((x) => x.codigo === codigo)) continue
    sinais.push({ codigo, fonte: id!.startsWith('msg_') ? 'conversa' : id === 'observacao_vendedor' || id!.startsWith('equipe.') ? 'equipe' : 'cadastro', evidencia_id: id, detalhe: (s.detalhe ?? '').slice(0, 200), em: e.em })
  }

  // Fato só fica com a fonte declarada se a evidência for daquela fonte; senão vira hipótese.
  const conhecido: Fato[] = a.conhecido.map((f) => {
    const id = f.evidencia_id ?? null
    const e = ev(id)
    const ok = !!e && (
      f.fonte === 'cliente' ? e.direcao === 'recebida'
        : f.fonte === 'equipe' ? !!id && (id === 'observacao_vendedor' || id === 'lead.observacoes' || id.startsWith('equipe.'))
        : f.fonte === 'pesquisa' ? !!id && id.startsWith('lead.')
        : false)
    return { fato: f.fato.slice(0, 200), fonte: ok ? f.fonte : 'hipotese', evidencia_id: ok ? id : null }
  })

  // Memória: só entra o que tem evidência do lado certo.
  const mem = a.memoria ?? {}
  const evid = (x: { texto: string; evidencia_id?: string | null } | null | undefined, aceitaVendedor = false): Evidenciado | null => {
    if (!x?.texto?.trim()) return null
    const e = ev(x.evidencia_id)
    if (!e || (!aceitaVendedor && e.direcao === 'enviada')) return null
    return { texto: x.texto.trim().slice(0, 200), evidencia_id: x.evidencia_id ?? null }
  }
  const lista = <T,>(xs: T[] | undefined, f: (x: T) => unknown) => {
    const ok = (xs ?? []).map(f).filter(Boolean)
    if ((xs?.length ?? 0) > ok.length) descartados.push(`${(xs?.length ?? 0) - ok.length} item(ns) da memória sem evidência válida`)
    return ok
  }
  const memoria: MemoriaComercial = {
    perguntas_respondidas: lista(mem.perguntas_respondidas, (x) => doCliente(x.evidencia_id) && x.pergunta.trim() && x.resposta.trim()
      ? { pergunta: x.pergunta.trim().slice(0, 160), resposta: x.resposta.trim().slice(0, 160), evidencia_id: x.evidencia_id ?? null } : null) as MemoriaComercial['perguntas_respondidas'],
    necessidades: lista(mem.necessidades, (x) => (doCliente(x.evidencia_id) ? evid(x) : null)) as Evidenciado[],
    objecoes: lista(mem.objecoes, (x) => { const e = doCliente(x.evidencia_id) ? evid(x) : null; return e ? { ...e, resolvida: x.resolvida } : null }) as MemoriaComercial['objecoes'],
    compromissos: lista(mem.compromissos, (x) => { const e = evid(x, x.quem === 'vera'); return e ? { ...e, quem: x.quem, prazo: x.prazo?.slice(0, 60) ?? null, cumprido: x.cumprido } : null }) as MemoriaComercial['compromissos'],
    ofertas: lista(mem.ofertas, (x) => (ev(x.evidencia_id) && x.oferta.trim() ? { oferta: x.oferta.trim().slice(0, 120), reacao: x.reacao, evidencia_id: x.evidencia_id ?? null } : null)) as MemoriaComercial['ofertas'],
    spin: {
      situacao: evid(mem.spin?.situacao), problema: doCliente(mem.spin?.problema?.evidencia_id) ? evid(mem.spin?.problema) : null,
      implicacao: doCliente(mem.spin?.implicacao?.evidencia_id) ? evid(mem.spin?.implicacao) : null,
      valor: doCliente(mem.spin?.valor?.evidencia_id) ? evid(mem.spin?.valor) : null,
    },
    champ: {
      desafio: evid(mem.champ?.desafio), autoridade: evid(mem.champ?.autoridade),
      condicoes: evid(mem.champ?.condicoes), prioridade: evid(mem.champ?.prioridade),
    },
  }

  return {
    analise: {
      sinais, necessidade: a.necessidade_identificada ?? null, solucao, oferta_id, conhecido,
      desconhecido: a.desconhecido.map((x) => x.slice(0, 200)).filter(Boolean),
      pergunta_prioritaria: a.pergunta_prioritaria ?? null,
      assuntos_resolvidos: a.assuntos_resolvidos.map((x) => x.slice(0, 200)),
      pergunta_pendente_do_cliente: a.pergunta_pendente_do_cliente ?? null,
      objecao_aberta: a.objecao_aberta ?? null,
      mudou_de_assunto: a.mudou_de_assunto, mencionar_assunto_anterior: a.mencionar_assunto_anterior,
      acao_sugerida: a.acao_sugerida, dados_suficientes: a.dados_suficientes,
      estilo_cliente: a.estilo_cliente, resumo: a.resumo,
      memoria: a.memoria ? memoria : MEMORIA_VAZIA,
    },
    descartados,
  }
}

export const RedacaoIASchema = z.object({
  mensagem_a: texto(1200).optional(),
  mensagem_b: texto(1200).optional(),
  melhor_opcao: z.enum(['A', 'B']).nullable().catch(null),
  justificativa: z.string().catch('').transform((s) => s.slice(0, 500)),
  objetivo: z.string().catch('').transform((s) => s.slice(0, 200)),
})

export interface Redacao {
  mensagem_a: string | null
  mensagem_b: string | null
  melhor_opcao: 'A' | 'B' | null
  justificativa: string
  objetivo: string
  alertas: string[]
}

export function validarRedacao(raw: unknown, ctx: { permitido: boolean; maxOpcoes: 1 | 2; permitirRetomada: boolean }): Redacao {
  const p = RedacaoIASchema.safeParse(raw)
  if (!p.success) throw new ErroContrato('A redação da IA veio fora do formato esperado.')
  const r = p.data
  const alertas: string[] = []
  if (!ctx.permitido) return { mensagem_a: null, mensagem_b: null, melhor_opcao: null, justificativa: r.justificativa, objetivo: r.objetivo, alertas }

  let a = r.mensagem_a ?? null, b = r.mensagem_b ?? null
  if (!a && b) [a, b] = [b, null]
  if (ctx.maxOpcoes === 1) b = null
  if (a && b && semelhanca(a, b) >= LIMITE_SEMELHANCA) { b = null; alertas.push('A opção B era quase igual à A e foi descartada.') }
  for (const [nome, m] of [['A', a], ['B', b]] as const) {
    if (!m) continue
    const proibidas = expressoesProibidas(m, ctx.permitirRetomada)
    if (proibidas.length) alertas.push(`Opção ${nome} usa expressão de robô: "${proibidas[0]}". Ajuste antes de enviar.`)
    if (perguntas(m) > 2) alertas.push(`Opção ${nome} faz várias perguntas. O ideal é uma.`)
    if (m.length > 600) alertas.push(`Opção ${nome} está longa para WhatsApp.`)
  }
  let melhor = r.melhor_opcao
  if (!a) melhor = null
  else if (!b || !melhor) melhor = 'A'
  return { mensagem_a: a, mensagem_b: b, melhor_opcao: melhor, justificativa: r.justificativa, objetivo: r.objetivo, alertas }
}
