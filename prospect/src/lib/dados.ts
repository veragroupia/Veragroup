import { useCallback, useEffect, useSyncExternalStore } from 'react'

/* Cache de consultas, bem pequeno: cada chave guarda o último resultado e as
   tabelas de que depende. Quando o Realtime (ou uma ação nossa) mexe numa
   tabela, só as chaves que dependem dela são buscadas de novo, e a tela
   continua mostrando o dado anterior enquanto isso. */

type Entrada = {
  data?: unknown
  erro?: string
  carregando: boolean
  em: number
  fn: () => Promise<unknown>
  tabelas: string[]
  ouvintes: Set<() => void>
  snap: Estado<unknown>
}
export interface Estado<T> { data: T | undefined; erro?: string; carregando: boolean }

const cache = new Map<string, Entrada>()
const VALIDADE = 30_000

function avisar(e: Entrada) {
  e.snap = { data: e.data, erro: e.erro, carregando: e.carregando }
  e.ouvintes.forEach((f) => f())
}

async function buscar(chave: string) {
  const e = cache.get(chave)
  if (!e || e.carregando) return
  e.carregando = true
  avisar(e)
  try {
    e.data = await e.fn()
    e.erro = undefined
  } catch (err: any) {
    e.erro = err?.message ?? String(err)
  } finally {
    e.carregando = false
    e.em = Date.now()
    avisar(e)
  }
}

const VAZIO: Estado<never> = { data: undefined, carregando: true }

export function useConsulta<T>(chave: string | null, fn: () => Promise<T>, tabelas: string[] = []) {
  if (chave) {
    let e = cache.get(chave)
    if (!e) {
      e = { carregando: false, em: 0, fn, tabelas, ouvintes: new Set(), snap: VAZIO }
      cache.set(chave, e)
    } else {
      e.fn = fn
      e.tabelas = tabelas
    }
  }

  const assinar = useCallback(
    (cb: () => void) => {
      if (!chave) return () => {}
      const e = cache.get(chave)!
      e.ouvintes.add(cb)
      return () => e.ouvintes.delete(cb)
    },
    [chave],
  )
  const estado = useSyncExternalStore(assinar, () => (chave ? cache.get(chave)!.snap : VAZIO)) as Estado<T>

  useEffect(() => {
    if (!chave) return
    const e = cache.get(chave)!
    if (e.data === undefined || Date.now() - e.em > VALIDADE) buscar(chave)
  }, [chave])

  return { ...estado, carregando: estado.carregando && estado.data === undefined, atualizando: estado.carregando, recarregar: () => chave && buscar(chave) }
}

let pendentes = new Set<string>()
let timer: ReturnType<typeof setTimeout> | undefined

/** Busca de novo tudo que depende dessas tabelas. Agrupa avisos em rajada. */
export function invalidar(...tabelas: string[]) {
  tabelas.forEach((t) => pendentes.add(t))
  clearTimeout(timer)
  timer = setTimeout(() => {
    const alvo = pendentes
    pendentes = new Set()
    for (const [chave, e] of cache) {
      if (!e.tabelas.some((t) => alvo.has(t))) continue
      if (e.ouvintes.size) buscar(chave)
      else e.em = 0
    }
  }, 250)
}

export function limparCache() { cache.clear() }

/** Desembrulha a resposta do supabase-js e lança o erro, se houver. */
export async function q<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data as T
}
