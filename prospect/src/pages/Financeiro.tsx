import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invalidar, q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { gerarMes, marcarPago, RETIRADA, situacao, type Lancamento, type Recorrencia } from '../lib/gestao'
import { brl, cx, pct } from '../lib/util'
import { useExecutar } from '../components/Aviso'
import { Abas, Avatar, Erro, Esqueleto, Kpi, Pagina, Secao, Segmentos, Vazio } from '../components/ui'
import { FormLancamento, FormRecorrencia, useClientesSelect } from '../components/gestao/Formularios'

type Aba = 'visao' | 'lancamentos' | 'recorrencias' | 'socios'
const iso = (d: Date) => d.toLocaleDateString('sv-SE')
function limites(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  return { inicio: iso(new Date(a, m - 1, 1)), fim: iso(new Date(a, m, 0)), data: new Date(a, m - 1, 15) }
}
const somarMes = (mes: string, n: number) => { const [a, m] = mes.split('-').map(Number); return iso(new Date(a, m - 1 + n, 1)).slice(0, 7) }
const nomeMes = (mes: string, curto = false) => {
  const [a, m] = mes.split('-').map(Number)
  const t = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1).replace('.', '')
}

export default function Financeiro() {
  const [mes, setMes] = useState(() => iso(new Date()).slice(0, 7))
  const [aba, setAba] = useState<Aba>('visao')
  const [lanc, setLanc] = useState<Lancamento | Partial<Lancamento> | null>(null)
  const [rec, setRec] = useState<Recorrencia | Partial<Recorrencia> | null>(null)
  const { inicio, fim, data } = limites(mes)

  // Mensalidades e despesas fixas do mês aberto passam a existir aqui.
  useEffect(() => { gerarMes(data).then(() => invalidar('fin')).catch(() => { /* sem recorrências ou sem acesso: a tela mostra o que tiver */ }) }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  const dados = useConsulta(`fin:${mes}`, async () => {
    const seisAtras = limites(somarMes(mes, -5)).inicio
    const [doMes, atrasados, historico, recs] = await Promise.all([
      q<Lancamento[]>(supabase.from('fin_lancamentos').select('*').or(`and(vencimento.gte.${inicio},vencimento.lte.${fim}),and(pago_em.gte.${inicio},pago_em.lte.${fim})`).order('vencimento')),
      q<Lancamento[]>(supabase.from('fin_lancamentos').select('*').lt('vencimento', inicio).is('pago_em', null).order('vencimento')),
      q<Pick<Lancamento, 'tipo' | 'valor' | 'pago_em' | 'categoria'>[]>(supabase.from('fin_lancamentos').select('tipo, valor, pago_em, categoria').gte('pago_em', seisAtras).lte('pago_em', fim)),
      q<Recorrencia[]>(supabase.from('fin_recorrencias').select('*').order('tipo').order('descricao')),
    ])
    return { doMes, atrasados, historico, recs }
  }, ['fin'])

  const m = useMemo(() => {
    if (!dados.data) return null
    const { doMes, historico } = dados.data
    const noMes = (d: string | null) => !!d && d >= inicio && d <= fim
    const recebido = doMes.filter((l) => l.tipo === 'receita' && noMes(l.pago_em)).reduce((s, l) => s + +l.valor, 0)
    const pago = doMes.filter((l) => l.tipo === 'despesa' && l.categoria !== RETIRADA && noMes(l.pago_em)).reduce((s, l) => s + +l.valor, 0)
    const aReceber = doMes.filter((l) => l.tipo === 'receita' && !l.pago_em && noMes(l.vencimento)).reduce((s, l) => s + +l.valor, 0)
    const aPagar = doMes.filter((l) => l.tipo === 'despesa' && !l.pago_em && noMes(l.vencimento)).reduce((s, l) => s + +l.valor, 0)
    const previstoEntrada = doMes.filter((l) => l.tipo === 'receita' && noMes(l.vencimento)).reduce((s, l) => s + +l.valor, 0)
    const meses = Array.from({ length: 6 }, (_, i) => somarMes(mes, i - 5)).map((mm) => {
      const { inicio: a, fim: b } = limites(mm)
      const doM = historico.filter((l) => l.pago_em! >= a && l.pago_em! <= b)
      return {
        mes: mm,
        entrada: doM.filter((l) => l.tipo === 'receita').reduce((s, l) => s + +l.valor, 0),
        saida: doM.filter((l) => l.tipo === 'despesa' && l.categoria !== RETIRADA).reduce((s, l) => s + +l.valor, 0),
      }
    })
    const porCategoria = new Map<string, number>()
    doMes.filter((l) => l.tipo === 'despesa' && l.categoria !== RETIRADA && noMes(l.vencimento)).forEach((l) => porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + +l.valor))
    return { recebido, pago, lucro: recebido - pago, aReceber, aPagar, previstoEntrada, meses, porCategoria: [...porCategoria].sort((a, b) => b[1] - a[1]) }
  }, [dados.data, inicio, fim, mes])

  const atrasoTotal = (dados.data?.atrasados ?? []).filter((l) => l.tipo === 'receita').reduce((s, l) => s + +l.valor, 0)
    + (dados.data?.doMes ?? []).filter((l) => l.tipo === 'receita' && situacao(l) === 'atrasado').reduce((s, l) => s + +l.valor, 0)

  return (
    <Pagina titulo="Financeiro" sub="Entradas, saídas e quanto sobra para a Vera"
      acoes={<>
        <button className="btn-sec" onClick={() => setRec({ tipo: 'receita', categoria: 'Mensalidade' })}><Repeat size={15} /> Recorrência</button>
        <button className="btn-pri" onClick={() => setLanc({ tipo: 'receita' })}><Plus size={16} /> Lançamento</button>
      </>}>
      <div className="flex items-center gap-2 mb-4">
        <button className="btn-icone border border-fio" onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
        <h2 className="text-xl font-semibold min-w-[190px] text-center">{nomeMes(mes)}</h2>
        <button className="btn-icone border border-fio" onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={18} /></button>
        {mes !== iso(new Date()).slice(0, 7) && <button className="btn-fantasma btn-sm" onClick={() => setMes(iso(new Date()).slice(0, 7))}>Mês atual</button>}
      </div>

      <Abas valor={aba} onChange={setAba} abas={[{ id: 'visao', nome: 'Visão do mês' }, { id: 'lancamentos', nome: 'Lançamentos' }, { id: 'recorrencias', nome: 'Mensalidades e fixas' }, { id: 'socios', nome: 'Sócios' }]} />
      <div className="pt-5">
        {dados.erro && <Erro msg={dados.erro} onTentar={dados.recarregar} />}
        {!m || !dados.data ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <Esqueleto key={i} className="h-24" />)}</div> : (
          <>
            {aba === 'visao' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Kpi rotulo="Recebido" valor={brl(m.recebido)} detalhe={m.previstoEntrada ? `${pct(m.recebido, m.previstoEntrada)}% do previsto (${brl(m.previstoEntrada)})` : 'nada previsto'} />
                  <Kpi rotulo="Pago" valor={brl(m.pago)} detalhe={m.aPagar ? `${brl(m.aPagar)} ainda a pagar` : 'contas em dia'} />
                  <Kpi rotulo="Lucro do mês" valor={brl(m.lucro)} destaque={m.lucro < 0} detalhe="recebido menos pago, sem retiradas" />
                  <Kpi rotulo="A receber" valor={brl(m.aReceber)} destaque={atrasoTotal > 0} detalhe={atrasoTotal ? `${brl(atrasoTotal)} em atraso` : 'nada em atraso'} />
                </div>

                <Secao titulo="Últimos 6 meses (o que entrou e saiu de verdade)">
                  <Barras meses={m.meses} atual={mes} />
                </Secao>

                <div className="grid md:grid-cols-2 gap-6">
                  <Secao titulo="Próximos vencimentos">
                    <ProximosVencimentos lancs={[...dados.data.atrasados, ...dados.data.doMes].filter((l) => !l.pago_em)} onAbrir={setLanc} />
                  </Secao>
                  <Secao titulo="Saídas por categoria">
                    {m.porCategoria.length === 0 ? <p className="text-sm text-tinta-3">Nenhuma saída no mês.</p> : (
                      <ul className="space-y-3">{m.porCategoria.map(([cat, v]) => (
                        <li key={cat}>
                          <div className="flex justify-between text-sm"><span>{cat}</span><span className="numero">{brl(v)}</span></div>
                          <div className="h-1 rounded-full bg-realce mt-1.5 overflow-hidden"><div className="h-full bg-sinal rounded-full" style={{ width: `${(v / m.porCategoria[0][1]) * 100}%` }} /></div>
                        </li>
                      ))}</ul>
                    )}
                  </Secao>
                </div>
              </div>
            )}
            {aba === 'lancamentos' && <ListaLancamentos doMes={dados.data.doMes} atrasados={dados.data.atrasados} onAbrir={setLanc} />}
            {aba === 'recorrencias' && <Recorrencias recs={dados.data.recs} onAbrir={setRec} />}
            {aba === 'socios' && <Socios lucro={m.lucro} doMes={dados.data.doMes} inicio={inicio} fim={fim} onRetirada={(socio) => setLanc({ tipo: 'despesa', categoria: RETIRADA, socio, descricao: 'Retirada de sócio', pago_em: iso(new Date()) })} />}
          </>
        )}
      </div>

      {lanc && <FormLancamento lanc={'id' in lanc && lanc.id ? (lanc as Lancamento) : undefined} padrao={lanc} onFechar={() => setLanc(null)} />}
      {rec && <FormRecorrencia rec={'id' in rec && rec.id ? (rec as Recorrencia) : undefined} padrao={rec} onFechar={() => setRec(null)} />}
    </Pagina>
  )
}

function Barras({ meses, atual }: { meses: { mes: string; entrada: number; saida: number }[]; atual: string }) {
  const max = Math.max(1, ...meses.flatMap((x) => [x.entrada, x.saida]))
  return (
    <div>
      <div className="flex items-end gap-3 h-40">
        {meses.map((x) => (
          <div key={x.mes} className="flex-1 h-full flex items-end justify-center gap-1" title={`${nomeMes(x.mes)}: entrou ${brl(x.entrada)}, saiu ${brl(x.saida)}`}>
            <div className="w-1/3 max-w-[22px] rounded-t-sm bg-ok min-h-[2px]" style={{ height: `${(x.entrada / max) * 100}%` }} />
            <div className="w-1/3 max-w-[22px] rounded-t-sm bg-sinal/70 min-h-[2px]" style={{ height: `${(x.saida / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {meses.map((x) => <div key={x.mes} className={cx('flex-1 text-center font-mono text-[11px]', x.mes === atual ? 'text-tinta font-medium' : 'text-tinta-3')}>{nomeMes(x.mes, true)}</div>)}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-tinta-3">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-ok" />Entradas</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sinal/70" />Saídas (sem retiradas)</span>
      </div>
    </div>
  )
}

function ProximosVencimentos({ lancs, onAbrir }: { lancs: Lancamento[]; onAbrir: (l: Lancamento) => void }) {
  const lista = [...lancs].sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 8)
  if (!lista.length) return <p className="text-sm text-tinta-3">Nada em aberto.</p>
  return <ul className="-mx-4 -my-4 divide-y divide-fio">{lista.map((l) => <LinhaLancamento key={l.id} l={l} onAbrir={() => onAbrir(l)} compacto />)}</ul>
}

const ROTULO_SIT = { pago: 'pago', atrasado: 'atrasado', hoje: 'vence hoje', aberto: 'em aberto' } as const
const COR_SIT = { pago: 'text-ok', atrasado: 'text-sinal', hoje: 'text-alerta', aberto: 'text-tinta-3' } as const

export function LinhaLancamento({ l, onAbrir, compacto }: { l: Lancamento; onAbrir: () => void; compacto?: boolean }) {
  const executar = useExecutar()
  const clientes = useClientesSelect()
  const { nomeDe } = useSessao()
  const sit = situacao(l)
  const entrada = l.tipo === 'receita'
  const cliente = l.cliente_id ? clientes.data?.find((c) => c.id === l.cliente_id)?.nome : null
  const venc = new Date(l.vencimento + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-realce/40">
      <span className={cx('w-8 h-8 rounded-full grid place-items-center shrink-0', entrada ? 'bg-ok/10 text-ok' : 'bg-sinal/10 text-sinal')}>
        {entrada ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
      </span>
      <button className="flex-1 min-w-0 text-left" onClick={onAbrir}>
        <div className="text-sm truncate">{l.descricao}</div>
        <div className="text-xs text-tinta-3 truncate">
          {venc} · <span className={COR_SIT[sit]}>{ROTULO_SIT[sit]}</span>
          {!compacto && ` · ${l.categoria}`}{cliente && ` · ${cliente}`}{l.socio && ` · ${nomeDe(l.socio)}`}
        </div>
      </button>
      <span className={cx('numero text-sm whitespace-nowrap', entrada ? 'text-ok' : 'text-tinta')}>{entrada ? '+' : '−'} {brl(l.valor)}</span>
      {!l.pago_em ? (
        <button className="btn-sec btn-sm" onClick={() => executar(() => marcarPago(l.id, true), entrada ? 'Recebido' : 'Pago')} title={entrada ? 'Marcar como recebido' : 'Marcar como pago'}>
          <Check size={13} /> <span className="hidden sm:inline">{entrada ? 'Recebi' : 'Paguei'}</span>
        </button>
      ) : <span className="w-[74px] hidden sm:block" />}
    </li>
  )
}

function ListaLancamentos({ doMes, atrasados, onAbrir }: { doMes: Lancamento[]; atrasados: Lancamento[]; onAbrir: (l: Lancamento) => void }) {
  const [tipo, setTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [soAbertos, setSoAbertos] = useState(false)
  const filtrar = (ls: Lancamento[]) => ls.filter((l) => (tipo === 'todos' || l.tipo === tipo) && (!soAbertos || !l.pago_em))
  const lista = filtrar(doMes)
  const antigos = filtrar(atrasados)
  const entradas = lista.filter((l) => l.tipo === 'receita').reduce((s, l) => s + +l.valor, 0)
  const saidas = lista.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + +l.valor, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmentos valor={tipo} onChange={setTipo} opcoes={[{ id: 'todos', nome: 'Tudo' }, { id: 'receita', nome: 'Entradas' }, { id: 'despesa', nome: 'Saídas' }]} />
        <label className="inline-flex items-center gap-2 text-sm text-tinta-2"><input type="checkbox" className="accent-[rgb(var(--tinta))]" checked={soAbertos} onChange={(e) => setSoAbertos(e.target.checked)} /> Só em aberto</label>
        <span className="ml-auto text-sm numero"><span className="text-ok">+ {brl(entradas)}</span> <span className="text-tinta-3 mx-1">·</span> − {brl(saidas)}</span>
      </div>
      {antigos.length > 0 && (
        <section>
          <h3 className="rotulo text-sinal mb-2">Em atraso de meses anteriores</h3>
          <ul className="folha divide-y divide-fio">{antigos.map((l) => <LinhaLancamento key={l.id} l={l} onAbrir={() => onAbrir(l)} />)}</ul>
        </section>
      )}
      {lista.length === 0 ? <div className="folha"><Vazio titulo="Nada lançado neste mês.">Use "Lançamento" para uma entrada ou saída avulsa, ou "Recorrência" para mensalidades e contas fixas.</Vazio></div> : (
        <ul className="folha divide-y divide-fio">{lista.map((l) => <LinhaLancamento key={l.id} l={l} onAbrir={() => onAbrir(l)} />)}</ul>
      )}
    </div>
  )
}

function Recorrencias({ recs, onAbrir }: { recs: Recorrencia[]; onAbrir: (r: Recorrencia | Partial<Recorrencia>) => void }) {
  const clientes = useClientesSelect()
  const grupo = (t: 'receita' | 'despesa') => recs.filter((r) => r.tipo === t)
  const total = (t: 'receita' | 'despesa') => grupo(t).filter((r) => r.ativo).reduce((s, r) => s + +r.valor, 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Kpi rotulo="Entra todo mês" valor={brl(total('receita'))} detalhe="mensalidades ativas" />
        <Kpi rotulo="Sai todo mês" valor={brl(total('despesa'))} detalhe="contas fixas" />
        <Kpi rotulo="Sobra fixa" valor={brl(total('receita') - total('despesa'))} destaque={total('receita') < total('despesa')} />
      </div>
      {(['receita', 'despesa'] as const).map((t) => (
        <section key={t}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="rotulo">{t === 'receita' ? 'Mensalidades de clientes' : 'Despesas fixas da Vera'}</h3>
            <button className="btn-sec btn-sm" onClick={() => onAbrir(t === 'receita' ? { tipo: 'receita', categoria: 'Mensalidade' } : { tipo: 'despesa', categoria: 'Ferramentas e software' })}><Plus size={13} /> Adicionar</button>
          </div>
          {grupo(t).length === 0 ? (
            <p className="text-sm text-tinta-3 folha p-4">{t === 'receita' ? 'Nenhuma mensalidade. Elas aparecem sozinhas quando uma proposta com mensalidade é aceita.' : 'Cadastre aqui Vercel, Supabase, domínio, IA, contador: o que sai todo mês.'}</p>
          ) : (
            <ul className="folha divide-y divide-fio">
              {grupo(t).map((r) => (
                <li key={r.id}><button className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-realce/40', !r.ativo && 'opacity-50')} onClick={() => onAbrir(r)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.descricao}</div>
                    <div className="text-xs text-tinta-3">todo dia {r.dia_vencimento} · {r.categoria}{r.cliente_id && ` · ${clientes.data?.find((c) => c.id === r.cliente_id)?.nome ?? ''}`}{!r.ativo && ' · pausada'}</div>
                  </div>
                  <span className="numero text-sm">{brl(r.valor)}/mês</span>
                </button></li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function Socios({ lucro, doMes, inicio, fim, onRetirada }: { lucro: number; doMes: Lancamento[]; inicio: string; fim: string; onRetirada: (email: string) => void }) {
  const { equipe, ehAdmin, nomeDe } = useSessao()
  const executar = useExecutar()
  const socios = useConsulta('fin:socios', () => q<{ email: string; percentual: number }[]>(supabase.from('fin_socios').select('*')), ['fin_socios'])
  const [editando, setEditando] = useState<Record<string, string> | null>(null)
  const pessoas = equipe.filter((m) => m.ativo && m.email !== 'veragroup.ia@gmail.com')
  const definidos = socios.data ?? []
  const pctDe = (email: string) => Number(definidos.find((s) => s.email === email)?.percentual ?? 0)
  const soma = definidos.reduce((s, x) => s + Number(x.percentual), 0)

  function abrirEdicao() {
    const igual = (100 / Math.max(1, pessoas.length)).toFixed(2)
    setEditando(Object.fromEntries(pessoas.map((p) => [p.email, definidos.length ? String(pctDe(p.email)) : igual])))
  }
  async function salvar() {
    const linhas = Object.entries(editando!).map(([email, v]) => ({ email, percentual: Number(String(v).replace(',', '.')) || 0 }))
    const total = linhas.reduce((s, l) => s + l.percentual, 0)
    if (Math.abs(total - 100) > 0.1) { alert(`A soma precisa dar 100%. Hoje dá ${total.toFixed(1)}%.`); return }
    if (await executar(async () => {
      await q(supabase.from('fin_socios').delete().neq('email', ''))
      await q(supabase.from('fin_socios').insert(linhas.filter((l) => l.percentual > 0)))
      invalidar('fin_socios')
    }, 'Divisão salva')) setEditando(null)
  }

  const retirado = (email: string) => doMes.filter((l) => l.categoria === RETIRADA && l.socio === email && l.pago_em && l.pago_em >= inicio && l.pago_em <= fim).reduce((s, l) => s + +l.valor, 0)

  if (socios.carregando) return <Esqueleto className="h-40" />
  return (
    <div className="space-y-5">
      <div className="folha p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="rotulo">Lucro do mês para dividir</div>
          <div className={cx('numero text-3xl mt-1.5', lucro < 0 && 'text-sinal')}>{brl(lucro)}</div>
          <p className="text-xs text-tinta-3 mt-1">Tudo que entrou menos tudo que saiu no mês, sem contar as retiradas.</p>
        </div>
        {ehAdmin && !editando && <button className="btn-sec" onClick={abrirEdicao}>{definidos.length ? 'Mudar divisão' : 'Definir divisão'}</button>}
      </div>

      {editando ? (
        <div className="folha p-4 space-y-3">
          <p className="text-sm text-tinta-2">Quanto do lucro é de cada um. Precisa somar 100%.</p>
          {pessoas.map((p) => (
            <label key={p.email} className="flex items-center gap-3">
              <Avatar nome={p.nome} tamanho="sm" /><span className="flex-1 text-sm">{p.nome}</span>
              <input className="inp w-24 numero text-right" inputMode="decimal" value={editando[p.email] ?? ''} onChange={(e) => setEditando({ ...editando, [p.email]: e.target.value })} /><span className="text-sm text-tinta-3">%</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-2"><button className="btn-fantasma" onClick={() => setEditando(null)}>Cancelar</button><button className="btn-pri" onClick={salvar}>Salvar divisão</button></div>
        </div>
      ) : definidos.length === 0 ? (
        <div className="folha"><Vazio titulo="Divisão ainda não definida.">{ehAdmin ? 'Toque em "Definir divisão" para dizer quanto do lucro é de cada sócio.' : 'Um admin precisa definir a divisão.'}</Vazio></div>
      ) : (
        <ul className="folha divide-y divide-fio">
          {definidos.map((s) => {
            const parte = lucro > 0 ? (lucro * Number(s.percentual)) / 100 : 0
            const ja = retirado(s.email)
            return (
              <li key={s.email} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar nome={nomeDe(s.email)} />
                <div className="flex-1 min-w-[140px]">
                  <div className="font-medium">{nomeDe(s.email)}</div>
                  <div className="text-xs text-tinta-3">{Number(s.percentual).toLocaleString('pt-BR')}% do lucro</div>
                </div>
                <div className="text-right text-sm">
                  <div><span className="text-tinta-3">Parte </span><span className="numero">{brl(parte)}</span></div>
                  <div><span className="text-tinta-3">Já retirou </span><span className="numero">{brl(ja)}</span></div>
                </div>
                <div className="text-right min-w-[110px]">
                  <div className="rotulo">Saldo</div>
                  <div className={cx('numero font-medium', parte - ja < 0 ? 'text-sinal' : 'text-ok')}>{brl(parte - ja)}</div>
                </div>
                <button className="btn-sec btn-sm" onClick={() => onRetirada(s.email)}>Registrar retirada</button>
              </li>
            )
          })}
          {Math.abs(soma - 100) > 0.1 && <li className="px-4 py-2 text-xs text-sinal">A divisão soma {soma.toFixed(1)}%, não 100%.</li>}
        </ul>
      )}
    </div>
  )
}
