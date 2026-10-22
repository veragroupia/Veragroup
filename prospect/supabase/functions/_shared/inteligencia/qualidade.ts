import type { Oferta } from './catalogo.ts'
import { normalizar, perguntasDoTexto } from './conversa.ts'
import type { Diretrizes } from './diretrizes.ts'
import { expressoesProibidas, perguntas, semelhanca } from './texto.ts'
import type { Acao } from './tipos.ts'

/* Avaliação objetiva de cada mensagem, sem IA: o que dá para verificar por regra.
   Não substitui a leitura humana (a equipe marca boa/ruim no painel) nem os testes de regressão.
   Linguagem coloquial não é punida; o que pesa é inventar fato, preço, repetir pergunta ou ignorar o pedido do cliente. */

export type Criterio = 'naturalidade' | 'personalizacao' | 'qualificacao' | 'pertinencia' | 'clareza' | 'objetivo' | 'nao_repeticao' | 'veracidade' | 'adequacao'

export const NOME_CRITERIO: Record<Criterio, string> = {
  naturalidade: 'Naturalidade', personalizacao: 'Personalização', qualificacao: 'Qualificação', pertinencia: 'Pertinência',
  clareza: 'Clareza', objetivo: 'Objetivo', nao_repeticao: 'Não repetição', veracidade: 'Veracidade', adequacao: 'Adequação comercial',
}

export interface ResultadoCriterio { ok: boolean; nota: string | null; grave: boolean }
export interface AvaliacaoMensagem {
  criterios: Record<Criterio, ResultadoCriterio>
  /** Problema grave (fato ou preço inventado, pedido ignorado, pergunta repetida): exige revisão humana. */
  revisar: boolean
  alertas: string[]
}

export interface ContextoQualidade {
  acao: Acao
  diretrizes: Diretrizes | null
  lead: { nome: string; nicho: string | null; cidade: string | null; rating?: number | null; avaliacoes?: number | null; site?: string | null; instagram?: string | null }
  /** Texto que a equipe viu e anotou (observação do vendedor, observações do lead, fatos confirmados). */
  fatosDaEquipe: string
  catalogo: Oferta[]
  /** Mensagens que a Vera já mandou e perguntas já respondidas. */
  mensagensAnteriores: string[]
  perguntasAnteriores: string[]
  /** Rascunhos recentes que não foram enviados (para não sugerir a mesma pergunta de novo). */
  rascunhosAnteriores?: string[]
  primeiroContato: boolean
  solucao: string
}

/** Jargão de agência: deixa o texto com cara de propaganda. */
const JARGAO = [
  'presenca digital', 'posicionamento', 'alavanc', 'otimiz', 'potencializ', 'impulsion', 'maximiz', 'sinergia', 'solucao completa',
  'solucoes inovadoras', 'inovador', 'transformar a experiencia', 'experiencia do cliente', 'engajamento', 'conversao', 'conversoes',
  'roi', 'funil de vendas', 'jornada do cliente', 'escalar o negocio', 'elevar', 'patamar', 'next level', 'disruptiv',
]
const ABERTURAS_GASTAS = ['vi o instagram de voces e fiquei curioso', 'espero que esteja bem', 'espero que esteja tudo bem', 'venho por meio desta', 'prezado', 'sou especialista']
const PROMESSA = /\b(garant|aumentar (suas |as )?vendas|vender mais|mais clientes|dobrar|triplicar|primeira pagina do google|primeiro lugar no google|resultado garantido)/
const PERDA_INVENTADA = /\b(esta(o)? perdendo|voce perde|voces perdem|deixando de vender|perdendo (clientes|vendas|pedidos|dinheiro))\b/
const ELOGIO = /\b(elogio|avaliac|avaliad|estrelas|nota (alta|boa|otima|4|5)|comentarios|bem avaliad|depoimento)/
const VISITOU = /\b(vi|olhei|entrei|visitei|dei uma olhada)( (no|o|na|a|nos|nas))? (site|instagram|insta|perfil|pagina|cardapio|catalogo|stories|destaques|feed|post)/
const PRODUTO: Record<string, RegExp> = {
  cardapio_digital: /cardapio|catalogo|vitrine/, landing_page: /\blanding\b|\buma pagina\b|pagina unica|\bpagina so\b/,
  site_institucional: /\bsite (completo|institucional)\b|\bvarias paginas\b/, solucao_pedidos: /sistema de pedido|automac|agendamento|\bsistema\b/,
}

function precosDoTexto(t: string) {
  return [...t.matchAll(/r\$ ?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+)/gi)].map((m) => m[1].replace(/\./g, '').replace(/,\d{2}$/, ''))
}
function precosDoCatalogo(c: Oferta[]) {
  return new Set(c.flatMap((o) => precosDoTexto(o.preco)))
}

export function avaliarMensagem(texto: string, ctx: ContextoQualidade): AvaliacaoMensagem {
  const t = normalizar(texto)
  const r = (ok: boolean, nota: string | null = null, grave = false): ResultadoCriterio => ({ ok, nota: ok ? null : nota, grave: !ok && grave })
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length
  const frases = texto.split(/(?<=[.!?])\s+/).filter((f) => f.trim())
  const nPerguntas = perguntas(texto)
  const d = ctx.diretrizes

  // Naturalidade: frases de propaganda, jargão, abertura gasta, excesso de informalidade.
  const proibidas = expressoesProibidas(texto)
  const jargao = JARGAO.filter((j) => t.includes(j))
  const gasta = ABERTURAS_GASTAS.find((a) => t.includes(a))
  const emojis = (texto.match(/\p{Extended_Pictographic}/gu) ?? []).length
  const risada = /\b(k{3,}|rsrs|haha)/.test(t)
  const naturalidade = r(!proibidas.length && jargao.length === 0 && !gasta && emojis <= 1 && !risada,
    proibidas[0] ? `Frase de propaganda: "${proibidas[0]}"` : jargao[0] ? `Jargão: "${jargao[0]}"` : gasta ? `Abertura gasta: "${gasta}"` : emojis > 1 ? 'Emojis demais' : 'Informalidade forçada')

  // Personalização: primeiro contato precisa de algo específico do lead.
  const tokens = [ctx.lead.nome, ctx.lead.nicho, ctx.lead.cidade].filter(Boolean).flatMap((x) => normalizar(x).split(/\s+/)).filter((p) => p.length > 3)
  const fatos = normalizar(ctx.fatosDaEquipe).split(/\W+/).filter((p) => p.length > 4)
  const especifico = tokens.some((p) => t.includes(p)) || fatos.some((p) => t.includes(p))
  const personalizacao = r(!ctx.primeiroContato || especifico, 'Mensagem genérica: nada nela é deste lead')

  // Qualificação: no máximo uma pergunta principal; nenhuma quando a regra diz que não é hora.
  const muitas = nPerguntas > 1 && !(nPerguntas === 2 && palavras < 40)
  const foraDeHora = !!d && !d.pode_perguntar && nPerguntas > 0 && ctx.acao !== 'encerrar'
  const qualificacao = r(!muitas && !foraDeHora, muitas ? `Faz ${nPerguntas} perguntas. O ideal é uma.` : 'Faz pergunta num momento em que o melhor é não perguntar')

  // Pertinência: pediu preço, a mensagem tem de responder o preço.
  const pediuPreco = !!d?.informar_preco || /quanto|valor|preco|custa|orcamento/.test(normalizar(d?.responder_primeiro))
  const respondePreco = /r\$|sob consulta|reais|\d+ ?mil/.test(t)
  const pertinencia = r(!pediuPreco || respondePreco || ['encerrar', 'nao_contatar'].includes(ctx.acao), 'O cliente perguntou o preço e a mensagem não responde', true)

  // Clareza: curta o bastante para WhatsApp.
  const limite = ctx.primeiroContato ? 80 : 110
  const longa = frases.some((f) => f.split(/\s+/).length > 40)
  const clareza = r(palavras <= limite && !longa && texto.length <= 650, palavras > limite ? `Longa para WhatsApp (${palavras} palavras)` : 'Frase longa demais')

  // Objetivo: fora encerrar, a mensagem leva a algum próximo passo (pergunta, oferta, entrega).
  const passo = nPerguntas > 0 || /(posso|quer que|te mando|te passo|segue|mando|envio|vou te|fica|sai|link|proposta|valor|r\$)/.test(t)
  const objetivo = r(ctx.acao === 'encerrar' || passo, 'Sem próximo passo claro')

  // Não repetição: mensagem ou pergunta igual a algo já dito ou já sugerido.
  const minhaPergunta = texto.split(/(?<=[?.!])\s+/).filter((f) => f.trim().endsWith('?'))
  const repetePergunta = minhaPergunta.find((q) => ctx.perguntasAnteriores.some((p) => semelhanca(q, p) >= 0.55))
  const repeteMensagem = ctx.mensagensAnteriores.some((m) => semelhanca(texto, m) >= 0.6)
  const perguntasDosRascunhos = (ctx.rascunhosAnteriores ?? []).flatMap((r) => perguntasDoTexto(r))
  const repeteRascunho = minhaPergunta.find((q) => perguntasDosRascunhos.some((p) => semelhanca(q, p) >= 0.55))
  const nao_repeticao = r(!repetePergunta && !repeteMensagem && !repeteRascunho,
    repetePergunta ? `Pergunta parecida com uma já feita: "${repetePergunta.slice(0, 80)}"` : repeteMensagem ? 'Quase igual a uma mensagem já enviada' : 'Mesma pergunta de uma sugestão anterior não usada',
    !!repetePergunta || repeteMensagem)

  // Veracidade: preço fora do catálogo, elogio sem nota no cadastro, "vi seu site" sem anotação da equipe, promessa ou perda inventada.
  const precosCat = precosDoCatalogo(ctx.catalogo)
  const precoInventado = precosDoTexto(texto).find((p) => !precosCat.has(p))
  const elogioSemBase = ELOGIO.test(t) && !(ctx.lead.rating && (ctx.lead.avaliacoes ?? 0) > 0) && !ELOGIO.test(normalizar(ctx.fatosDaEquipe))
  const visitouSemBase = VISITOU.test(t) && !normalizar(ctx.fatosDaEquipe).trim()
  const veracidade = r(!precoInventado && !elogioSemBase && !visitouSemBase && !PROMESSA.test(t) && !PERDA_INVENTADA.test(t),
    precoInventado ? `Preço que não está no catálogo: R$ ${precoInventado}` : elogioSemBase ? 'Cita avaliações ou elogios que não estão verificados'
      : visitouSemBase ? 'Diz que viu o site ou o Instagram, mas ninguém anotou o que foi visto' : PROMESSA.test(t) ? 'Promete resultado' : 'Afirma que o cliente está perdendo vendas sem ele ter dito', true)

  // Adequação: não oferecer produto quando não há necessidade; não oferecer produto diferente do diagnosticado.
  const ofereceAlgo = /(posso te mostrar|quer que eu te mostre|te mando (um|uma) (exemplo|proposta)|fazemos|a gente faz|nos fazemos)/.test(t)
  const outroProduto = ctx.solucao in PRODUTO && Object.entries(PRODUTO).some(([k, re]) => k !== ctx.solucao && re.test(t) && !PRODUTO[ctx.solucao].test(t)) && ofereceAlgo
  const adequacao = r(!((ctx.solucao === 'nenhuma' || ctx.acao === 'encerrar') && ofereceAlgo) && !outroProduto,
    outroProduto ? 'Oferece um produto diferente do que a análise indicou' : 'Oferece algo quando não há necessidade', true)

  const criterios = { naturalidade, personalizacao, qualificacao, pertinencia, clareza, objetivo, nao_repeticao, veracidade, adequacao }
  const alertas = (Object.entries(criterios) as [Criterio, ResultadoCriterio][]).filter(([, v]) => !v.ok).map(([k, v]) => `${NOME_CRITERIO[k]}: ${v.nota}`)
  return { criterios, revisar: Object.values(criterios).some((v) => v.grave), alertas }
}
