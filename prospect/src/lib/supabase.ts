import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const supabase = createClient(SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY as string)

export async function chamarFuncao<T = any>(nome: string, body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nome, { body })
  if (error) {
    let msg = error.message
    try { const j = await (error as any).context?.json?.(); if (j?.erro) msg = j.erro } catch { /* resposta sem JSON */ }
    throw new Error(msg)
  }
  return data as T
}
