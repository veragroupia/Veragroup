import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { STATUS_PROPOSTA, type Proposta, type StatusProposta } from '../lib/gestao'
import { brl, cx, pct } from '../lib/util'
import { Erro, Kpi, Linhas, Pagina, Vazio } from '../components/ui'

type Linha = Proposta & { cliente: { nome: string } | null; lead: { nome: string } | null }

export default function Propostas() {
  const nav = useNavigate()
  const [status, setStatus] = useState<StatusProposta | ''>('')
  const dados = useConsulta('propostas:lista', () => q<Linha[]>(supabase.from('propostas').select('*, cliente:clientes(nome), lead:leads(nome)').order('created_at', { ascending: false })), ['propostas'])

  const todas = dados.data ?? []
  const lista = useMemo(() => todas.filter((p) => !status || p.status === status), [todas, status])
  const respondidas = todas.filter((p) => p.status === 'aceita' || p.status === 'recusada')
  const aceitas = todas.filter((p) => p.status === 'aceita')
  const abertas = todas.filter((p) => p.status === 'enviada')

  return (
    <Pagina titulo="Propostas" sub="Do orçamento ao contrato" acoes={<button className="btn-pri" onClick={() => nav('/propostas/nova')}><Plus size={16} /> Nova proposta</button>}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi rotulo="Esperando resposta" valor={abertas.length} detalhe={abertas.length ? brl(abertas.reduce((s, p) => s + +p.valor_setup, 0)) : undefined} />
        <Kpi rotulo="Aceitas" valor={aceitas.length} detalhe={brl(aceitas.reduce((s, p) => s + +p.valor_setup, 0))} />
        <Kpi rotulo="Taxa de aceite" valor={`${pct(aceitas.length, respondidas.length)}%`} detalhe={`de ${respondidas.length} respondidas`} />
        <Kpi rotulo="Mensal fechado" valor={brl(aceitas.reduce((s, p) => s + +p.valor_mensal, 0))} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {[{ id: '' as const, nome: 'Todas', cor: '' }, ...STATUS_PROPOSTA].map((s) => (
          <button key={s.id} onClick={() => setStatus(s.id)} className={cx('h-8 px-3 rounded-full border text-[13px] inline-flex items-center gap-2', status === s.id ? 'bg-tinta text-fundo border-tinta' : 'border-fio text-tinta-2 hover:border-tinta-3')}>
            {s.cor && <span className={cx('w-1.5 h-1.5 rounded-full', s.cor)} />}{s.nome}
            <span className="numero text-[11px] opacity-60">{s.id ? todas.filter((p) => p.status === s.id).length : todas.length}</span>
          </button>
        ))}
      </div>

      {dados.erro && <Erro msg={dados.erro} onTentar={dados.recarregar} />}
      {dados.carregando ? <Linhas n={4} /> : lista.length === 0 ? (
        <div className="folha"><Vazio titulo="Nenhuma proposta ainda." icone={<FileText size={18} />}>Crie aqui, pela ficha do cliente ou pela página do lead. Os pacotes do site já vêm prontos para adicionar.</Vazio></div>
      ) : (
        <ul className="folha divide-y divide-fio">
          {lista.map((p) => {
            const s = STATUS_PROPOSTA.find((x) => x.id === p.status)!
            const para = p.cliente?.nome ?? p.lead?.nome
            return (
              <li key={p.id}>
                <button onClick={() => nav(`/propostas/${p.id}`)} className="w-full text-left px-4 py-3 hover:bg-realce/50 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="numero text-xs text-tinta-3 w-10">nº {p.numero}</span>
                  <span className="flex-1 min-w-[180px]">
                    <span className="block font-medium truncate">{p.titulo}</span>
                    <span className="block text-[13px] text-tinta-3 truncate">{para ?? 'Sem destinatário'}{p.enviada_em && ` · enviada ${new Date(p.enviada_em).toLocaleDateString('pt-BR')}`}</span>
                  </span>
                  <span className="numero text-sm">{brl(p.valor_setup)}{+p.valor_mensal ? <span className="text-tinta-3"> + {brl(p.valor_mensal)}/mês</span> : null}</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider w-24 justify-end"><span className={cx('w-1.5 h-1.5 rounded-full', s.cor)} />{s.nome}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Pagina>
  )
}
