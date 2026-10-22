import { Component, type ReactNode } from 'react'
import { Marca } from './Marca'

/* Telas de falha: nunca deixar o app em branco. */

function Caixa({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-fundo text-tinta">
      <div className="folha max-w-lg w-full p-6 md:p-8">
        <Marca />
        <h1 className="text-xl font-semibold mt-6">{titulo}</h1>
        <div className="mt-3 text-[15px] leading-relaxed text-tinta-2 space-y-3">{children}</div>
      </div>
    </div>
  )
}

/** Faltam variáveis de ambiente: explica o que configurar, em vez de tela branca. */
export function ConfigAusente({ faltando }: { faltando: string[] }) {
  return (
    <Caixa titulo="Falta configurar o acesso ao banco">
      <p>O painel não encontrou {faltando.length > 1 ? 'estas variáveis' : 'esta variável'} de ambiente:</p>
      <ul className="font-mono text-sm space-y-1">{faltando.map((f) => <li key={f}>{f}</li>)}</ul>
      <p>Para rodar no computador, copie <code className="font-mono text-sm">.env.example</code> para <code className="font-mono text-sm">.env</code> e preencha a URL e a chave pública (anon) do projeto Supabase. Na Vercel, cadastre as duas em Settings › Environment Variables e publique de novo.</p>
      <p className="text-sm text-tinta-3">A chave pública pode ficar no navegador. Nunca use a chave service_role aqui.</p>
    </Caixa>
  )
}

/** Erro inesperado em uma tela: mostra a mensagem e deixa recarregar, sem derrubar o app inteiro em branco. */
export class LimiteDeErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }
  static getDerivedStateFromError(erro: Error) { return { erro } }
  componentDidCatch(erro: Error) { console.error(erro) }
  render() {
    if (!this.state.erro) return this.props.children
    return (
      <Caixa titulo="Algo deu errado nesta tela">
        <p>O erro foi: <span className="font-mono text-sm">{this.state.erro.message}</span></p>
        <p>Os dados não foram afetados. Recarregue a página; se continuar, avise quem cuida do sistema com a mensagem acima.</p>
        <button className="btn-pri mt-2" onClick={() => location.reload()}>Recarregar</button>
      </Caixa>
    )
  }
}
