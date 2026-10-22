/* Preparação em lote: fila com concorrência limitada, parada no meio e parada automática quando o erro
   mostra que insistir não adianta (sem chave de IA, função fora do ar, banco sem migration). */

export type ResultadoLote = { id: string; estado: 'pronto' | 'sem_mensagem' | 'reaproveitado' | 'erro' | 'cancelado'; erro?: string }

/** Erros que valem para todos os leads: parar o lote em vez de repetir a mesma falha. */
export const ERRO_GERAL = /chave de ia|indispon|migration|não autorizado|failed to fetch|fetch failed/i

export async function prepararEmLote(
  ids: string[],
  preparar: (id: string) => Promise<{ rascunho: { mensagem_a: string | null } | null; rascunho_reaproveitado?: boolean }>,
  opcoes: { concorrencia?: number; limite?: number; parar?: () => boolean; aoMudar?: (id: string, estado: ResultadoLote['estado'] | 'preparando', erro?: string) => void } = {},
): Promise<ResultadoLote[]> {
  const fila = [...new Set(ids)].slice(0, opcoes.limite ?? ids.length)
  const resultados = new Map<string, ResultadoLote>()
  let abortar = false
  const deveParar = () => abortar || !!opcoes.parar?.()
  const trabalhador = async () => {
    while (fila.length && !deveParar()) {
      const id = fila.shift()!
      opcoes.aoMudar?.(id, 'preparando')
      try {
        const r = await preparar(id)
        const estado = r.rascunho_reaproveitado ? 'reaproveitado' : r.rascunho?.mensagem_a ? 'pronto' : 'sem_mensagem'
        resultados.set(id, { id, estado })
        opcoes.aoMudar?.(id, estado)
      } catch (e) {
        const erro = (e as Error).message
        resultados.set(id, { id, estado: 'erro', erro })
        opcoes.aoMudar?.(id, 'erro', erro)
        if (ERRO_GERAL.test(erro)) abortar = true
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, opcoes.concorrencia ?? 2) }, trabalhador))
  for (const id of fila) { resultados.set(id, { id, estado: 'cancelado' }); opcoes.aoMudar?.(id, 'cancelado') }
  return [...resultados.values()]
}
