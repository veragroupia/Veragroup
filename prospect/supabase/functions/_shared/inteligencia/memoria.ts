import { MEMORIA_VAZIA, type Analise, type MemoriaEquipe } from './analise.ts'
import { normalizar } from './conversa.ts'

/* Memória comercial do lead, como a equipe e a IA enxergam: o que a análise registrou (com evidência),
   o que as regras leram da conversa e as correções da equipe, que sempre vencem. */

export type OrigemItem = 'cliente' | 'pesquisa' | 'equipe' | 'hipotese' | 'regra'
export interface ItemMemoria { chave: string; texto: string; origem: OrigemItem; evidencia_id: string | null; detalhe?: string }

export interface MemoriaVisivel {
  confirmados: ItemMemoria[]
  hipoteses: ItemMemoria[]
  desconhecido: ItemMemoria[]
  perguntas_respondidas: ItemMemoria[]
  necessidades: ItemMemoria[]
  objecoes: ItemMemoria[]
  objecoes_resolvidas: ItemMemoria[]
  compromissos: ItemMemoria[]
  ofertas: ItemMemoria[]
}

export type SecaoMemoria = keyof MemoriaVisivel

export const NOME_SECAO: Record<SecaoMemoria, string> = {
  confirmados: 'Informações confirmadas', hipoteses: 'Hipóteses (a confirmar)', desconhecido: 'Ainda não sabemos',
  perguntas_respondidas: 'Já respondido', necessidades: 'Necessidades', objecoes: 'Objeções em aberto',
  objecoes_resolvidas: 'Objeções resolvidas', compromissos: 'Compromissos', ofertas: 'Ofertas apresentadas',
}

export const chaveMemoria = (secao: SecaoMemoria, texto: string) => `${secao}:${normalizar(texto).slice(0, 80)}`

const REACAO = { positiva: 'gostou', neutra: 'sem posição', negativa: 'não gostou', sem_resposta: 'sem resposta' } as const

export function montarMemoria(
  analise: Analise | null | undefined,
  equipe: MemoriaEquipe | null | undefined,
  leitura?: { compromissoVendedor: string | null; retornoPedido?: { em: string; texto: string; mensagem_id: string } | null },
): MemoriaVisivel {
  const m = analise?.memoria ?? MEMORIA_VAZIA
  const ocultar = new Set(equipe?.ocultar ?? [])
  const item = (secao: SecaoMemoria, texto: string, origem: OrigemItem, evidencia_id: string | null, detalhe?: string): ItemMemoria =>
    ({ chave: chaveMemoria(secao, texto), texto, origem, evidencia_id, detalhe })
  const v: MemoriaVisivel = {
    confirmados: [
      ...(equipe?.fatos ?? []).map((f) => item('confirmados', f.texto, 'equipe', null, f.por ? `confirmado por ${f.por}` : undefined)),
      ...(analise?.conhecido ?? []).filter((f) => f.fonte !== 'hipotese').map((f) => item('confirmados', f.fato, f.fonte, f.evidencia_id)),
    ],
    hipoteses: (analise?.conhecido ?? []).filter((f) => f.fonte === 'hipotese').map((f) => item('hipoteses', f.fato, 'hipotese', null)),
    desconhecido: (analise?.desconhecido ?? []).map((t) => item('desconhecido', t, 'hipotese', null)),
    perguntas_respondidas: m.perguntas_respondidas.map((p) => item('perguntas_respondidas', `${p.pergunta} → ${p.resposta}`, 'cliente', p.evidencia_id)),
    necessidades: m.necessidades.map((n) => item('necessidades', n.texto, 'cliente', n.evidencia_id)),
    objecoes: m.objecoes.filter((o) => !o.resolvida).map((o) => item('objecoes', o.texto, 'cliente', o.evidencia_id)),
    objecoes_resolvidas: m.objecoes.filter((o) => o.resolvida).map((o) => item('objecoes_resolvidas', o.texto, 'cliente', o.evidencia_id)),
    compromissos: [
      ...(leitura?.compromissoVendedor ? [item('compromissos', `Vera prometeu: ${leitura.compromissoVendedor}`, 'regra', null)] : []),
      ...(leitura?.retornoPedido ? [item('compromissos', `Cliente pediu retorno: "${leitura.retornoPedido.texto}"`, 'regra', null)] : []),
      ...m.compromissos.filter((c) => !c.cumprido).map((c) => item('compromissos', `${c.quem === 'vera' ? 'Vera' : 'Cliente'}: ${c.texto}${c.prazo ? ` (${c.prazo})` : ''}`, c.quem === 'vera' ? 'regra' : 'cliente', c.evidencia_id)),
    ],
    ofertas: m.ofertas.map((o) => item('ofertas', `${o.oferta} · ${REACAO[o.reacao]}`, 'cliente', o.evidencia_id)),
  }
  // Correção da equipe: item marcado como errado some (inclusive para a IA, que recebe esta lista).
  for (const k of Object.keys(v) as SecaoMemoria[]) v[k] = v[k].filter((i) => !ocultar.has(i.chave))
  // Itens repetidos (mesma chave) aparecem uma vez.
  for (const k of Object.keys(v) as SecaoMemoria[]) v[k] = v[k].filter((i, n, a) => a.findIndex((x) => x.chave === i.chave) === n)
  return v
}

/** Fatos confirmados pela equipe viram evidência com id próprio ("equipe.1"...), para a IA citar. */
export function evidenciasDaEquipe(equipe: MemoriaEquipe | null | undefined) {
  return (equipe?.fatos ?? []).slice(0, 20).map((f, i) => ({ id: `equipe.${i + 1}`, fonte: 'confirmado pela equipe', fato: f.texto.slice(0, 300) }))
}

/** O que a IA precisa saber para não repetir: perguntas respondidas e itens que a equipe disse estarem errados. */
export function memoriaParaIA(v: MemoriaVisivel) {
  const textos = (xs: ItemMemoria[]) => xs.map((i) => i.texto)
  return {
    confirmado: textos(v.confirmados), hipoteses_nao_confirmadas: textos(v.hipoteses), ainda_nao_sabemos: textos(v.desconhecido),
    ja_respondido: textos(v.perguntas_respondidas), necessidades: textos(v.necessidades),
    objecoes_abertas: textos(v.objecoes), objecoes_resolvidas: textos(v.objecoes_resolvidas),
    compromissos: textos(v.compromissos), ofertas_ja_apresentadas: textos(v.ofertas),
  }
}
