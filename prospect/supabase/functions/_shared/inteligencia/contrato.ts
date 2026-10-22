import { z } from 'zod'
import { validarOferta, type Oferta } from './catalogo.ts'
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
})

export { ANALISE_VAZIA, type Analise, type Fato } from './analise.ts'
import type { Analise, Fato } from './analise.ts'

/** Sinais que só as regras podem afirmar (contagem de mensagens), nunca a IA. */
const SO_REGRA: CodigoSinal[] = ['respondeu', 'conversa_continua']

/** Tira o primeiro objeto JSON do texto do modelo. */
export function lerJson(bruto: string): unknown {
  const m = bruto.match(/\{[\s\S]*\}/)
  if (!m) throw new ErroContrato('A IA não devolveu JSON.', bruto.slice(0, 500))
  try { return JSON.parse(m[0]) } catch { throw new ErroContrato('A IA devolveu um JSON inválido.', bruto.slice(0, 500)) }
}

export interface CtxAnalise {
  /** Ids que foram enviados como evidência (msg_*, lead.*, observacao_vendedor). */
  evidencias: Set<string>
  catalogo: Oferta[]
}

export function validarAnalise(raw: unknown, ctx: CtxAnalise): { analise: Analise; descartados: string[] } {
  const p = AnaliseIASchema.safeParse(raw)
  if (!p.success) throw new ErroContrato('A análise da IA veio fora do formato esperado.')
  const a = p.data
  const descartados: string[] = []

  const solucao = a.solucao
  const oferta_id = validarOferta(a.oferta_id, solucao, ctx.catalogo)
  if (a.oferta_id && !oferta_id) descartados.push(`oferta "${a.oferta_id}" fora do catálogo ou incompatível com ${solucao}`)

  const sinais: Sinal[] = []
  for (const s of a.sinais) {
    const codigo = s.codigo as CodigoSinal
    if (!CODIGOS_SINAL.includes(codigo) || SO_REGRA.includes(codigo)) { descartados.push(`sinal "${s.codigo}" não permitido`); continue }
    const ev = s.evidencia_id ?? null
    const valida = ev !== null && ctx.evidencias.has(ev)
    // Interesse só existe se o cliente disse algo: a evidência tem de ser mensagem.
    if (SINAIS[codigo].grupo === 'interesse' && !(valida && ev!.startsWith('msg_'))) { descartados.push(`sinal "${codigo}" sem mensagem do cliente como evidência`); continue }
    if (SINAIS[codigo].grupo === 'adequacao' && !valida) { descartados.push(`sinal "${codigo}" com evidência inexistente`); continue }
    if (codigo === 'oferta_no_catalogo' && !oferta_id) { descartados.push('oferta_no_catalogo sem oferta válida'); continue }
    if (sinais.some((x) => x.codigo === codigo)) continue
    sinais.push({ codigo, fonte: ev!.startsWith('msg_') ? 'conversa' : ev === 'observacao_vendedor' ? 'equipe' : 'cadastro', evidencia_id: ev, detalhe: (s.detalhe ?? '').slice(0, 200) })
  }

  // Fato atribuído ao cliente sem evidência real vira hipótese.
  const conhecido: Fato[] = a.conhecido.map((f) => {
    const ev = f.evidencia_id ?? null
    const ok = ev !== null && ctx.evidencias.has(ev)
    return { fato: f.fato.slice(0, 200), fonte: ok ? f.fonte : 'hipotese', evidencia_id: ok ? ev : null }
  })

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
