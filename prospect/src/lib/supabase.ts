import { createClient } from '@supabase/supabase-js'

/* Sem as variáveis de ambiente o app não pode falar com o banco. Em vez de quebrar na importação
   (tela branca), o cliente é criado com um endereço inválido e o App mostra o que falta configurar. */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

/** O que falta no .env (vazio = tudo certo). */
export const CONFIG_FALTANDO: string[] = [
  ...(/^https?:\/\/.+/.test(url) ? [] : ['VITE_SUPABASE_URL']),
  ...(chave && !/cole-aqui|sua-chave|xxx/i.test(chave) ? [] : ['VITE_SUPABASE_ANON_KEY']),
]

export const SUPABASE_URL = url
export const supabase = createClient(CONFIG_FALTANDO.length ? 'http://configuracao-ausente.invalid' : url, chave || 'ausente', {
  auth: { persistSession: CONFIG_FALTANDO.length === 0 },
})

export async function chamarFuncao<T = any>(nome: string, body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nome, { body })
  if (error) {
    let msg = error.message
    try { const j = await (error as any).context?.json?.(); if (j?.erro) msg = j.erro } catch { /* resposta sem JSON */ }
    throw new Error(msg)
  }
  return data as T
}
