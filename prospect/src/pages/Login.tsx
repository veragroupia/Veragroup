import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Marca } from '../components/Marca'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
    setEnviando(false)
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha não conferem.' : error.message)
  }

  return (
    <div className="min-h-full grid md:grid-cols-[1.1fr_1fr]">
      <section className="hidden md:flex flex-col justify-between p-12 bg-tinta text-fundo">
        <div className="flex items-center gap-3">
          <Marca />
          <span className="font-semibold" style={{ fontStretch: '115%' }}>Vera Prospect</span>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[.12em] text-fundo/50 mb-5">Painel comercial · Vera Group</p>
          <h1 className="text-[44px] leading-[1.05] font-semibold max-w-md" style={{ fontStretch: '118%' }}>
            Quem responder primeiro, fecha.
          </h1>
          <p className="mt-5 text-fundo/60 max-w-sm">
            O radar encontra os negócios, a fila do dia diz com quem falar e a avaliação mostra o que melhorar na conversa.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-fundo/50">
          <span className="w-2 h-2 rounded-full bg-sinal animate-pulsa" /> Itu · Salto · Sorocaba · Indaiatuba
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={entrar} className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-3 mb-10"><Marca /><span className="font-semibold">Vera Prospect</span></div>
          <h2 className="text-2xl font-semibold">Entrar</h2>
          <p className="text-sm text-tinta-3 mt-1 mb-8">Use o e-mail cadastrado pela equipe.</p>
          <div className="space-y-4">
            <label className="block"><span className="lbl">E-mail</span>
              <input className="inp h-11" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block"><span className="lbl">Senha</span>
              <input className="inp h-11" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            {erro && <p className="text-sm text-sinal" role="alert">{erro}</p>}
            <button className="btn-pri btn-lg w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : <>Entrar <ArrowRight size={16} /></>}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
