import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { salvarCliente, situacao, STATUS_CLIENTE, type Cliente, type Lancamento, type Projeto, type StatusCliente } from '../lib/gestao'
import { brl, cx, normalizar, telefoneBonito } from '../lib/util'
import { useExecutar } from '../components/Aviso'
import { Avatar, Campo, Erro, Kpi, Linhas, Modal, Pagina, Vazio } from '../components/ui'

type Resumo = { mensal: number; projetos: number; atrasado: number }

export default function Clientes() {
  const nav = useNavigate()
  const { nomeDe } = useSessao()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<StatusCliente | ''>('ativo')
  const [novo, setNovo] = useState(false)

  const dados = useConsulta('clientes:lista', async () => {
    const [clientes, recs, projetos, abertos] = await Promise.all([
      q<Cliente[]>(supabase.from('clientes').select('*').order('nome')),
      q<{ cliente_id: string; valor: number }[]>(supabase.from('fin_recorrencias').select('cliente_id, valor').eq('tipo', 'receita').eq('ativo', true).not('cliente_id', 'is', null)),
      q<Pick<Projeto, 'cliente_id' | 'etapa'>[]>(supabase.from('projetos').select('cliente_id, etapa')),
      q<Pick<Lancamento, 'cliente_id' | 'valor' | 'vencimento' | 'pago_em'>[]>(supabase.from('fin_lancamentos').select('cliente_id, valor, vencimento, pago_em').eq('tipo', 'receita').is('pago_em', null).not('cliente_id', 'is', null)),
    ])
    const resumo = new Map<string, Resumo>()
    const r = (id: string) => { if (!resumo.has(id)) resumo.set(id, { mensal: 0, projetos: 0, atrasado: 0 }); return resumo.get(id)! }
    recs.forEach((x) => (r(x.cliente_id).mensal += Number(x.valor)))
    projetos.filter((p) => !['no_ar', 'manutencao', 'pausado'].includes(p.etapa)).forEach((p) => r(p.cliente_id).projetos++)
    abertos.filter((l) => situacao(l) === 'atrasado').forEach((l) => (r(l.cliente_id!).atrasado += Number(l.valor)))
    return { clientes, resumo }
  }, ['clientes', 'fin', 'projetos'])

  const lista = useMemo(() => {
    const t = normalizar(busca.trim())
    return (dados.data?.clientes ?? []).filter((c) => (!status || c.status === status) && (!t || normalizar(`${c.nome} ${c.contato_nome ?? ''} ${c.cidade ?? ''}`).includes(t)))
  }, [dados.data, busca, status])

  const ativos = (dados.data?.clientes ?? []).filter((c) => c.status === 'ativo')
  const mrr = ativos.reduce((s, c) => s + (dados.data?.resumo.get(c.id)?.mensal ?? 0), 0)
  const atrasado = [...(dados.data?.resumo.values() ?? [])].reduce((s, r) => s + r.atrasado, 0)
  const emAndamento = [...(dados.data?.resumo.values() ?? [])].reduce((s, r) => s + r.projetos, 0)

  return (
    <Pagina titulo="Clientes" sub="Quem já fechou com a Vera" acoes={<button className="btn-pri" onClick={() => setNovo(true)}><Plus size={16} /> Novo cliente</button>}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi rotulo="Clientes ativos" valor={ativos.length} />
        <Kpi rotulo="Receita mensal" valor={brl(mrr)} detalhe="mensalidades ativas" />
        <Kpi rotulo="Projetos em andamento" valor={emAndamento} />
        <Kpi rotulo="Em atraso" valor={brl(atrasado)} destaque={atrasado > 0} detalhe="cobranças vencidas" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
          <input className="inp pl-9" placeholder="Buscar por nome, contato ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {[{ id: '' as const, nome: 'Todos' }, ...STATUS_CLIENTE].map((s) => (
            <button key={s.id} onClick={() => setStatus(s.id)} className={cx('h-9 px-3 rounded-full border text-[13px]', status === s.id ? 'bg-tinta text-fundo border-tinta' : 'border-fio text-tinta-2 hover:border-tinta-3')}>{s.nome}</button>
          ))}
        </div>
      </div>

      {dados.erro && <Erro msg={dados.erro} onTentar={dados.recarregar} />}
      {dados.carregando ? <Linhas n={4} /> : lista.length === 0 ? (
        <div className="folha"><Vazio titulo={dados.data?.clientes.length ? 'Nenhum cliente com esse filtro.' : 'Nenhum cliente ainda.'} icone={<Building2 size={18} />}>
          Cliente entra aqui de três jeitos: aceitando uma proposta, pelo botão "Virar cliente" na página do lead ou cadastrando direto.
        </Vazio></div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-3">
          {lista.map((c) => {
            const r = dados.data!.resumo.get(c.id)
            const st = STATUS_CLIENTE.find((s) => s.id === c.status)!
            return (
              <li key={c.id}>
                <button onClick={() => nav(`/clientes/${c.id}`)} className="folha w-full text-left p-4 hover:border-tinta-3 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar nome={c.nome} tamanho="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{c.nome}</div>
                      <div className="text-[13px] text-tinta-3 truncate">{[c.nicho, c.cidade, c.contato_nome].filter(Boolean).join(' · ') || telefoneBonito(c.whatsapp ?? c.telefone)}</div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-tinta-2"><span className={cx('w-1.5 h-1.5 rounded-full', st.cor)} />{st.nome}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 pt-3 border-t border-fio text-[13px]">
                    <span><span className="text-tinta-3">Mensal </span><span className="numero">{r?.mensal ? brl(r.mensal) : '-'}</span></span>
                    <span><span className="text-tinta-3">Projetos </span><span className="numero">{r?.projetos ?? 0}</span></span>
                    {r?.atrasado ? <span className="text-sinal">Atrasado <span className="numero">{brl(r.atrasado)}</span></span> : null}
                    {c.responsavel && <span className="ml-auto text-tinta-3">{nomeDe(c.responsavel).split(' ')[0]}</span>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {novo && <FormCliente onFechar={() => setNovo(false)} onSalvo={(id) => nav(`/clientes/${id}`)} />}
    </Pagina>
  )
}

export function FormCliente({ cliente, onFechar, onSalvo }: { cliente?: Cliente; onFechar: () => void; onSalvo?: (id: string) => void }) {
  const { eu, equipe } = useSessao()
  const executar = useExecutar()
  const [f, setF] = useState<Partial<Cliente>>(cliente ?? { status: 'ativo', responsavel: eu!.email, cliente_desde: new Date().toLocaleDateString('sv-SE') })
  const at = (k: keyof Cliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    let id = ''
    if (await executar(async () => { id = await salvarCliente(f) }, cliente ? 'Cliente atualizado' : 'Cliente cadastrado')) { onFechar(); onSalvo?.(id) }
  }

  return (
    <Modal largura="max-w-2xl" titulo={cliente ? 'Editar cliente' : 'Novo cliente'} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" form="form-cliente" disabled={!f.nome?.trim()}>Salvar</button></>}>
      <form id="form-cliente" onSubmit={salvar} className="grid grid-cols-2 gap-4">
        <Campo rotulo="Nome da empresa" className="col-span-2"><input className="inp" required autoFocus value={f.nome ?? ''} onChange={at('nome')} /></Campo>
        <Campo rotulo="Ramo"><input className="inp" value={f.nicho ?? ''} onChange={at('nicho')} placeholder="confeitaria, joalheria…" /></Campo>
        <Campo rotulo="Cidade"><input className="inp" value={f.cidade ?? ''} onChange={at('cidade')} /></Campo>
        <Campo rotulo="Pessoa de contato"><input className="inp" value={f.contato_nome ?? ''} onChange={at('contato_nome')} placeholder="Nome do dono ou responsável" /></Campo>
        <Campo rotulo="CNPJ ou CPF"><input className="inp numero" value={f.documento ?? ''} onChange={at('documento')} /></Campo>
        <Campo rotulo="WhatsApp"><input className="inp" inputMode="tel" value={f.whatsapp ?? ''} onChange={at('whatsapp')} placeholder="(11) 99999-9999" /></Campo>
        <Campo rotulo="E-mail"><input className="inp" type="email" value={f.email ?? ''} onChange={at('email')} /></Campo>
        <Campo rotulo="Site"><input className="inp" value={f.site_url ?? ''} onChange={at('site_url')} placeholder="https://" /></Campo>
        <Campo rotulo="Instagram"><input className="inp" value={f.instagram ?? ''} onChange={at('instagram')} placeholder="@perfil" /></Campo>
        <Campo rotulo="Endereço" className="col-span-2"><input className="inp" value={f.endereco ?? ''} onChange={at('endereco')} /></Campo>
        <Campo rotulo="Status">
          <select className="inp" value={f.status} onChange={at('status')}>{STATUS_CLIENTE.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
        </Campo>
        <Campo rotulo="Responsável na Vera">
          <select className="inp" value={f.responsavel ?? ''} onChange={at('responsavel')}><option value="">Ninguém</option>{equipe.filter((m) => m.ativo).map((m) => <option key={m.email} value={m.email}>{m.nome}</option>)}</select>
        </Campo>
        <Campo rotulo="Cliente desde"><input type="date" className="inp" value={f.cliente_desde ?? ''} onChange={at('cliente_desde')} /></Campo>
        <Campo rotulo="Observações" className="col-span-2"><textarea className="inp" rows={3} value={f.observacoes ?? ''} onChange={at('observacoes')} /></Campo>
      </form>
    </Modal>
  )
}
