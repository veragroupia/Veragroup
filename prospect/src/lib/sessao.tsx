import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { limparCache } from './dados'
import type { Membro } from './tipos'

interface Ctx {
  sessao: Session | null
  eu: Membro | null
  equipe: Membro[]
  carregando: boolean
  ehAdmin: boolean
  nomeDe: (email?: string | null) => string
  sair: () => void
}
const C = createContext<Ctx>(null!)
export const useSessao = () => useContext(C)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [equipe, setEquipe] = useState<Membro[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      if (!data.session) setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) { setEquipe([]); return }
    supabase.from('equipe').select('*').order('nome').then(({ data }) => {
      setEquipe((data as Membro[]) ?? [])
      setCarregando(false)
    })
  }, [sessao?.user.id])

  const eu = equipe.find((m) => m.email === sessao?.user.email?.toLowerCase() && m.ativo) ?? null
  const nomeDe = (email?: string | null) => {
    if (!email) return 'Ninguém'
    if (email === 'sistema') return 'Sistema'
    return equipe.find((m) => m.email === email)?.nome ?? email.split('@')[0]
  }
  const sair = () => { limparCache(); supabase.auth.signOut() }

  return (
    <C.Provider value={{ sessao, eu, equipe, carregando, ehAdmin: eu?.papel === 'admin', nomeDe, sair }}>
      {children}
    </C.Provider>
  )
}
