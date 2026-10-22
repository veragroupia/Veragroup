import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, FileText, MessageCircle, Pencil, Plus, Repeat } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { etapaProjeto, nomeTipoProjeto, situacao, STATUS_CLIENTE, STATUS_PROPOSTA, type Cliente, type Lancamento, type Projeto, type Proposta, type Recorrencia } from '../lib/gestao'
import { brl, cx, data as dataCurta, numeroWa, telefoneBonito, waLink } from '../lib/util'
import { Abas, Avatar, Erro, Esqueleto, Kpi, Vazio } from '../components/ui'
import { FormCliente } from './Clientes'
import { FormLancamento, FormProjeto, FormRecorrencia } from '../components/gestao/Formularios'
import { LinhaLancamento } from './Financeiro'

type Aba = 'resumo' | 'projetos' | 'financeiro' | 'propostas'

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { nomeDe } = useSessao()
  const [aba, setAba] = useState<Aba>('resumo')
  const [editar, setEditar] = useState(false)
  const [projeto, setProjeto] = useState<Projeto | 'novo' | null>(null)
  const [lanc, setLanc] = useState<Lancamento | 'novo' | null>(null)
  const [rec, setRec] = useState<Recorrencia | 'novo' | null>(null)

  const dados = useConsulta(`cliente:${id}`, async () => {
    const [cliente, projetos, lancs, recs, propostas] = await Promise.all([
      q<Cliente>(supabase.from('clientes').select('*').eq('id', id!).single()),
      q<Projeto[]>(supabase.from('projetos').select('*').eq('cliente_id', id!).order('created_at', { ascending: false })),
      q<Lancamento[]>(supabase.from('fin_lancamentos').select('*').eq('cliente_id', id!).order('vencimento', { ascending: false })),
      q<Recorrencia[]>(supabase.from('fin_recorrencias').select('*').eq('cliente_id', id!).order('created_at')),
      q<Proposta[]>(supabase.from('propostas').select('*').eq('cliente_id', id!).order('created_at', { ascending: false })),
    ])
    return { cliente, projetos, lancs, recs, propostas }
  }, ['clientes', 'projetos', 'fin', 'propostas'])

  if (dados.erro) return <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8"><Erro msg={dados.erro} onTentar={dados.recarregar} /></div>
  if (!dados.data) return <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 space-y-3"><Esqueleto className="h-10 w-72" /><Esqueleto className="h-64" /></div>

  const { cliente: c, projetos, lancs, recs, propostas } = dados.data
  const st = STATUS_CLIENTE.find((s) => s.id === c.status)!
  const wa = numeroWa(c.whatsapp, c.telefone)
  const mensal = recs.filter((r) => r.ativo && r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0)
  const recebido = lancs.filter((l) => l.tipo === 'receita' && l.pago_em).reduce((s, l) => s + Number(l.valor), 0)
  const atrasado = lancs.filter((l) => l.tipo === 'receita' && situacao(l) === 'atrasado').reduce((s, l) => s + Number(l.valor), 0)

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-12 animate-entra">
      <button onClick={() => nav('/clientes')} className="inline-flex items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta mb-3"><ArrowLeft size={15} /> Clientes</button>
      <header className="flex flex-wrap items-start gap-4">
        <Avatar nome={c.nome} tamanho="lg" />
        <div className="flex-1 min-w-[220px]">
          <h1 className="text-2xl md:text-[28px] font-semibold leading-tight">{c.nome}</h1>
          <p className="text-sm text-tinta-3 mt-1 flex flex-wrap items-center gap-x-3">
            <span className="inline-flex items-center gap-1.5"><span className={cx('w-1.5 h-1.5 rounded-full', st.cor)} />{st.nome}</span>
            {[c.nicho, c.cidade].filter(Boolean).join(' · ')}
            <span>cliente desde {new Date(c.cliente_desde + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-sec" onClick={() => setEditar(true)}><Pencil size={14} /> Editar</button>
          <button className="btn-sec" onClick={() => nav(`/propostas/nova?cliente=${c.id}`)}><FileText size={14} /> Proposta</button>
          {wa && <a className="btn-wa" href={waLink(wa)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <Kpi rotulo="Mensalidade" valor={mensal ? brl(mensal) : '-'} />
        <Kpi rotulo="Já recebido" valor={brl(recebido)} />
        <Kpi rotulo="Em atraso" valor={brl(atrasado)} destaque={atrasado > 0} />
        <Kpi rotulo="Projetos" valor={projetos.length} detalhe={`${projetos.filter((p) => p.etapa === 'no_ar' || p.etapa === 'manutencao').length} no ar`} />
      </div>

      <div className="mt-6">
        <Abas valor={aba} onChange={setAba} abas={[
          { id: 'resumo', nome: 'Dados' }, { id: 'projetos', nome: `Projetos ${projetos.length || ''}` },
          { id: 'financeiro', nome: `Financeiro ${lancs.length || ''}` }, { id: 'propostas', nome: `Propostas ${propostas.length || ''}` },
        ]} />
        <div className="pt-4">
          {aba === 'resumo' && (
            <div className="grid md:grid-cols-2 gap-4">
              <dl className="folha divide-y divide-fio">
                {([
                  ['Contato', c.contato_nome], ['WhatsApp', c.whatsapp ? telefoneBonito(c.whatsapp) : null], ['Telefone', c.telefone ? telefoneBonito(c.telefone) : null],
                  ['E-mail', c.email], ['CNPJ/CPF', c.documento], ['Endereço', c.endereco],
                ] as const).map(([k, v]) => (
                  <div key={k} className="flex gap-3 px-4 py-2.5 text-sm"><dt className="rotulo w-24 shrink-0 pt-0.5">{k}</dt><dd className="min-w-0 break-words">{v || <span className="text-tinta-3">-</span>}</dd></div>
                ))}
              </dl>
              <div className="space-y-4">
                <dl className="folha divide-y divide-fio">
                  {([['Site', c.site_url], ['Instagram', c.instagram]] as const).map(([k, v]) => (
                    <div key={k} className="flex gap-3 px-4 py-2.5 text-sm"><dt className="rotulo w-24 shrink-0 pt-0.5">{k}</dt>
                      <dd className="min-w-0 break-all">{v ? <a className="underline underline-offset-2 inline-flex items-center gap-1" href={v.startsWith('http') ? v : k === 'Instagram' ? `https://instagram.com/${v.replace('@', '')}` : `https://${v}`} target="_blank" rel="noreferrer">{v.replace(/^https?:\/\//, '')} <ExternalLink size={12} /></a> : <span className="text-tinta-3">-</span>}</dd></div>
                  ))}
                  <div className="flex gap-3 px-4 py-2.5 text-sm"><dt className="rotulo w-24 shrink-0 pt-0.5">Responsável</dt><dd>{c.responsavel ? nomeDe(c.responsavel) : '-'}</dd></div>
                  {c.lead_id && <div className="flex gap-3 px-4 py-2.5 text-sm"><dt className="rotulo w-24 shrink-0 pt-0.5">Origem</dt><dd><Link className="underline underline-offset-2" to={`/leads/${c.lead_id}`}>Lead da prospecção (conversa e avaliações)</Link></dd></div>}
                </dl>
                <div className="folha p-4"><div className="rotulo mb-2">Observações</div><p className="text-sm whitespace-pre-wrap">{c.observacoes || <span className="text-tinta-3">Nada anotado.</span>}</p></div>
              </div>
            </div>
          )}

          {aba === 'projetos' && (
            <div className="space-y-3">
              <div className="flex justify-end"><button className="btn-pri" onClick={() => setProjeto('novo')}><Plus size={15} /> Novo projeto</button></div>
              {projetos.length === 0 ? <div className="folha"><Vazio titulo="Nenhum projeto ainda." /></div> : (
                <ul className="folha divide-y divide-fio">
                  {projetos.map((p) => {
                    const e = etapaProjeto(p.etapa)
                    const feitos = p.checklist.filter((i) => i.feito).length
                    return (
                      <li key={p.id}><button className="w-full text-left px-4 py-3 hover:bg-realce/50 flex items-center gap-3" onClick={() => setProjeto(p)}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.nome}</div>
                          <div className="text-[13px] text-tinta-3">{nomeTipoProjeto(p.tipo)}{p.prazo && ` · prazo ${dataCurta(p.prazo + 'T12:00')}`}{p.checklist.length > 0 && ` · ${feitos}/${p.checklist.length}`}</div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"><span className={cx('w-1.5 h-1.5 rounded-full', e.cor)} />{e.nome}</span>
                      </button></li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {aba === 'financeiro' && (
            <div className="space-y-5">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="rotulo flex items-center gap-1.5"><Repeat size={12} /> Mensalidades</h3>
                  <button className="btn-sec btn-sm" onClick={() => setRec('novo')}><Plus size={13} /> Mensalidade</button>
                </div>
                {recs.length === 0 ? <p className="text-sm text-tinta-3">Sem mensalidade.</p> : (
                  <ul className="folha divide-y divide-fio">
                    {recs.map((r) => (
                      <li key={r.id}><button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-realce/50" onClick={() => setRec(r)}>
                        <span className="flex-1 text-sm">{r.descricao}<span className="text-tinta-3"> · todo dia {r.dia_vencimento}</span></span>
                        <span className={cx('numero text-sm', !r.ativo && 'text-tinta-3 line-through')}>{brl(r.valor)}</span>
                      </button></li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="rotulo">Lançamentos</h3>
                  <button className="btn-sec btn-sm" onClick={() => setLanc('novo')}><Plus size={13} /> Lançamento</button>
                </div>
                {lancs.length === 0 ? <p className="text-sm text-tinta-3">Nada lançado.</p> : (
                  <ul className="folha divide-y divide-fio">{lancs.map((l) => <LinhaLancamento key={l.id} l={l} onAbrir={() => setLanc(l)} />)}</ul>
                )}
              </section>
            </div>
          )}

          {aba === 'propostas' && (
            <div className="space-y-3">
              <div className="flex justify-end"><button className="btn-pri" onClick={() => nav(`/propostas/nova?cliente=${c.id}`)}><Plus size={15} /> Nova proposta</button></div>
              {propostas.length === 0 ? <div className="folha"><Vazio titulo="Nenhuma proposta." /></div> : (
                <ul className="folha divide-y divide-fio">
                  {propostas.map((p) => {
                    const s = STATUS_PROPOSTA.find((x) => x.id === p.status)!
                    return (
                      <li key={p.id}><button className="w-full text-left px-4 py-3 hover:bg-realce/50 flex items-center gap-3" onClick={() => nav(`/propostas/${p.id}`)}>
                        <span className="numero text-xs text-tinta-3 w-10">nº {p.numero}</span>
                        <span className="flex-1 min-w-0 truncate font-medium">{p.titulo}</span>
                        <span className="numero text-sm">{brl(p.valor_setup)}{p.valor_mensal ? ` + ${brl(p.valor_mensal)}/mês` : ''}</span>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider w-20"><span className={cx('w-1.5 h-1.5 rounded-full', s.cor)} />{s.nome}</span>
                      </button></li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {editar && <FormCliente cliente={c} onFechar={() => setEditar(false)} />}
      {projeto && <FormProjeto projeto={projeto === 'novo' ? undefined : projeto} clienteId={c.id} onFechar={() => setProjeto(null)} />}
      {lanc && <FormLancamento lanc={lanc === 'novo' ? undefined : lanc} padrao={{ cliente_id: c.id, tipo: 'receita', categoria: 'Projeto avulso' }} onFechar={() => setLanc(null)} />}
      {rec && <FormRecorrencia rec={rec === 'novo' ? undefined : rec} padrao={{ cliente_id: c.id, descricao: `Mensalidade · ${c.nome}` }} onFechar={() => setRec(null)} />}
    </div>
  )
}
