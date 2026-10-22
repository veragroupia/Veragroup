import { useState } from 'react'
import { Check, ExternalLink, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { q, useConsulta } from '../../lib/dados'
import { useSessao } from '../../lib/sessao'
import {
  CATEGORIAS, checklistDe, ETAPAS_PROJETO, excluirLancamento, FORMAS, RETIRADA, salvarLancamento, salvarProjeto, salvarRecorrencia, TIPOS_PROJETO,
  type Cliente, type Lancamento, type Projeto, type Recorrencia, type TipoLanc, type TipoProjeto,
} from '../../lib/gestao'
import { cx } from '../../lib/util'
import { useExecutar } from '../Aviso'
import { Campo, Interruptor, Modal, Segmentos } from '../ui'

const hojeLocal = () => new Date().toLocaleDateString('sv-SE')
const num = (s: unknown) => Number(String(s ?? '').replace(/\./g, '').replace(',', '.')) || 0

/** Lista curta de clientes para os selects. */
export function useClientesSelect() {
  return useConsulta('clientes:select', () => q<Pick<Cliente, 'id' | 'nome' | 'status'>[]>(supabase.from('clientes').select('id, nome, status').order('nome')), ['clientes'])
}

// ------------------------------------------------------------- Projeto

export function FormProjeto({ projeto, clienteId, onFechar }: { projeto?: Projeto; clienteId?: string; onFechar: () => void }) {
  const { eu, equipe } = useSessao()
  const executar = useExecutar()
  const clientes = useClientesSelect()
  const [f, setF] = useState<Partial<Projeto>>(projeto ?? {
    tipo: 'landing', etapa: 'briefing', cliente_id: clienteId, inicio: hojeLocal(), responsavel: eu!.email, checklist: checklistDe('landing'), valor: 0,
  })
  const [novoItem, setNovoItem] = useState('')
  const at = <K extends keyof Projeto>(k: K, v: Projeto[K] | string | null) => setF((x) => ({ ...x, [k]: v }))
  const lista = f.checklist ?? []
  const feitos = lista.filter((i) => i.feito).length

  function trocarTipo(t: TipoProjeto) {
    // Projeto novo, ou checklist ainda intocado: troca pelo padrão do tipo.
    const intocado = !lista.some((i) => i.feito)
    setF((x) => ({ ...x, tipo: t, nome: x.nome || TIPOS_PROJETO.find((y) => y.id === t)?.nome, ...(intocado && !projeto ? { checklist: checklistDe(t) } : {}) }))
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (await executar(() => salvarProjeto({ ...f, valor: num(f.valor) }), projeto ? 'Projeto salvo' : 'Projeto criado')) onFechar()
  }
  async function excluir() {
    if (!projeto || !confirm(`Excluir o projeto "${projeto.nome}"?`)) return
    if (await executar(async () => { await q(supabase.from('projetos').delete().eq('id', projeto.id)); }, 'Projeto excluído')) onFechar()
  }

  return (
    <Modal largura="max-w-2xl" titulo={projeto ? projeto.nome : 'Novo projeto'} onFechar={onFechar}
      rodape={<>
        {projeto && <button className="btn-fantasma text-sinal mr-auto" onClick={excluir}><Trash2 size={14} /> Excluir</button>}
        <button className="btn-fantasma" onClick={onFechar}>Cancelar</button>
        <button className="btn-pri" form="form-projeto" disabled={!f.nome?.trim() || !f.cliente_id}>Salvar</button>
      </>}>
      <form id="form-projeto" onSubmit={salvar} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Campo rotulo="Cliente" className="col-span-2 sm:col-span-1">
            <select className="inp" required value={f.cliente_id ?? ''} onChange={(e) => at('cliente_id', e.target.value)} disabled={!!clienteId && !projeto}>
              <option value="">Escolha…</option>
              {(clientes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Tipo" className="col-span-2 sm:col-span-1">
            <select className="inp" value={f.tipo} onChange={(e) => trocarTipo(e.target.value as TipoProjeto)}>{TIPOS_PROJETO.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
          </Campo>
          <Campo rotulo="Nome do projeto" className="col-span-2"><input className="inp" required value={f.nome ?? ''} onChange={(e) => at('nome', e.target.value)} placeholder="Ex.: Site da Doce Encanto" /></Campo>
        </div>

        <div className="flex flex-wrap gap-1">
          {ETAPAS_PROJETO.map((e) => (
            <button key={e.id} type="button" onClick={() => at('etapa', e.id)}
              className={cx('h-8 px-3 rounded-full border text-[13px] inline-flex items-center gap-1.5', f.etapa === e.id ? 'bg-tinta text-fundo border-tinta' : 'border-fio text-tinta-2 hover:border-tinta-3')}>
              <span className={cx('w-1.5 h-1.5 rounded-full', e.cor)} />{e.nome}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Campo rotulo="Início"><input type="date" className="inp" value={f.inicio ?? ''} onChange={(e) => at('inicio', e.target.value)} /></Campo>
          <Campo rotulo="Prazo"><input type="date" className="inp" value={f.prazo ?? ''} onChange={(e) => at('prazo', e.target.value)} /></Campo>
          <Campo rotulo="Valor (R$)"><input className="inp numero" inputMode="decimal" value={f.valor ?? ''} onChange={(e) => at('valor', e.target.value)} /></Campo>
          <Campo rotulo="Responsável">
            <select className="inp" value={f.responsavel ?? ''} onChange={(e) => at('responsavel', e.target.value)}><option value="">Ninguém</option>{equipe.filter((m) => m.ativo).map((m) => <option key={m.email} value={m.email}>{m.nome.split(' ')[0]}</option>)}</select>
          </Campo>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Campo rotulo="Link da prévia"><Link valor={f.url_previa} onChange={(v) => at('url_previa', v)} /></Campo>
          <Campo rotulo="Link no ar"><Link valor={f.url_producao} onChange={(v) => at('url_producao', v)} /></Campo>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="lbl !mb-0">Checklist · {feitos}/{lista.length}</span>
            {lista.length > 0 && <span className="h-1 w-32 rounded-full bg-realce overflow-hidden"><span className="block h-full bg-ok" style={{ width: `${(feitos / lista.length) * 100}%` }} /></span>}
          </div>
          <ul className="folha divide-y divide-fio">
            {lista.map((i, n) => (
              <li key={n} className="group flex items-center gap-3 px-3 py-2">
                <button type="button" onClick={() => at('checklist', lista.map((x, k) => (k === n ? { ...x, feito: !x.feito } : x)) as never)}
                  className={cx('w-5 h-5 rounded border grid place-items-center shrink-0', i.feito ? 'bg-ok border-ok text-white' : 'border-tinta-3')}>{i.feito && <Check size={13} strokeWidth={3} />}</button>
                <span className={cx('flex-1 text-sm', i.feito && 'line-through text-tinta-3')}>{i.texto}</span>
                <button type="button" className="opacity-0 group-hover:opacity-100 text-tinta-3 hover:text-sinal" onClick={() => at('checklist', lista.filter((_, k) => k !== n) as never)} aria-label="Remover item"><X size={14} /></button>
              </li>
            ))}
            <li className="flex gap-2 p-2">
              <input className="inp h-8" value={novoItem} placeholder="Adicionar item" onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (novoItem.trim()) { at('checklist', [...lista, { texto: novoItem.trim(), feito: false }] as never); setNovoItem('') } } }} />
              <button type="button" className="btn-sec btn-sm" disabled={!novoItem.trim()} onClick={() => { at('checklist', [...lista, { texto: novoItem.trim(), feito: false }] as never); setNovoItem('') }}><Plus size={14} /></button>
            </li>
          </ul>
        </div>
        <Campo rotulo="Observações"><textarea className="inp" rows={3} value={f.observacoes ?? ''} onChange={(e) => at('observacoes', e.target.value)} /></Campo>
      </form>
    </Modal>
  )
}

function Link({ valor, onChange }: { valor?: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      <input className="inp" value={valor ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
      {valor && <a className="btn-icone border border-fio shrink-0" href={valor.startsWith('http') ? valor : `https://${valor}`} target="_blank" rel="noreferrer" aria-label="Abrir"><ExternalLink size={14} /></a>}
    </div>
  )
}

// ---------------------------------------------------------- Lançamento

export function FormLancamento({ lanc, padrao, onFechar }: { lanc?: Lancamento; padrao?: Partial<Lancamento>; onFechar: () => void }) {
  const { equipe } = useSessao()
  const executar = useExecutar()
  const clientes = useClientesSelect()
  const [f, setF] = useState<Partial<Lancamento>>(lanc ?? { tipo: 'receita', categoria: CATEGORIAS.receita[0], vencimento: hojeLocal(), ...padrao })
  const [pago, setPago] = useState(!!(lanc?.pago_em ?? padrao?.pago_em))
  const at = <K extends keyof Lancamento>(k: K, v: Lancamento[K] | string | null) => setF((x) => ({ ...x, [k]: v }))
  const tipo = (f.tipo ?? 'receita') as TipoLanc

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const dados = { ...f, valor: num(f.valor), pago_em: pago ? f.pago_em || hojeLocal() : null, socio: f.categoria === RETIRADA ? f.socio : null }
    if (await executar(() => salvarLancamento(dados), lanc ? 'Lançamento salvo' : 'Lançamento criado')) onFechar()
  }
  async function excluir() {
    if (!lanc || !confirm('Excluir este lançamento?')) return
    if (await executar(() => excluirLancamento(lanc.id), 'Lançamento excluído')) onFechar()
  }

  return (
    <Modal titulo={lanc ? 'Editar lançamento' : 'Novo lançamento'} onFechar={onFechar}
      rodape={<>
        {lanc && <button className="btn-fantasma text-sinal mr-auto" onClick={excluir}><Trash2 size={14} /> Excluir</button>}
        <button className="btn-fantasma" onClick={onFechar}>Cancelar</button>
        <button className="btn-pri" form="form-lanc" disabled={!f.descricao?.trim() || !num(f.valor)}>Salvar</button>
      </>}>
      <form id="form-lanc" onSubmit={salvar} className="space-y-4">
        <Segmentos valor={tipo} onChange={(t) => setF((x) => ({ ...x, tipo: t, categoria: CATEGORIAS[t][0] }))} opcoes={[{ id: 'receita', nome: 'Entrada' }, { id: 'despesa', nome: 'Saída' }]} />
        {lanc?.recorrencia_id && <p className="text-xs text-tinta-3">Gerado por uma recorrência. Mudar aqui vale só para este mês.</p>}
        <Campo rotulo="Descrição"><input className="inp" required autoFocus value={f.descricao ?? ''} onChange={(e) => at('descricao', e.target.value)} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Valor (R$)"><input className="inp numero" required inputMode="decimal" value={f.valor ?? ''} onChange={(e) => at('valor', e.target.value)} /></Campo>
          <Campo rotulo="Vencimento"><input type="date" className="inp" required value={f.vencimento ?? ''} onChange={(e) => at('vencimento', e.target.value)} /></Campo>
          <Campo rotulo="Categoria">
            <select className="inp" value={f.categoria ?? ''} onChange={(e) => at('categoria', e.target.value)}>{CATEGORIAS[tipo].map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          {f.categoria === RETIRADA ? (
            <Campo rotulo="Sócio">
              <select className="inp" value={f.socio ?? ''} onChange={(e) => at('socio', e.target.value)} required><option value="">Quem retirou?</option>{equipe.map((m) => <option key={m.email} value={m.email}>{m.nome}</option>)}</select>
            </Campo>
          ) : (
            <Campo rotulo="Cliente">
              <select className="inp" value={f.cliente_id ?? ''} onChange={(e) => at('cliente_id', e.target.value)}><option value="">Nenhum</option>{(clientes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            </Campo>
          )}
        </div>
        <div className="folha p-3 space-y-3">
          <Interruptor ligado={pago} onChange={setPago} rotulo={tipo === 'receita' ? 'Já recebido' : 'Já pago'} />
          {pago && (
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Data"><input type="date" className="inp" value={f.pago_em ?? hojeLocal()} onChange={(e) => at('pago_em', e.target.value)} /></Campo>
              <Campo rotulo="Forma">
                <select className="inp" value={f.forma ?? ''} onChange={(e) => at('forma', e.target.value)}><option value="">-</option>{FORMAS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
              </Campo>
            </div>
          )}
        </div>
        <Campo rotulo="Observações"><input className="inp" value={f.observacoes ?? ''} onChange={(e) => at('observacoes', e.target.value)} /></Campo>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------- Recorrência

export function FormRecorrencia({ rec, padrao, onFechar }: { rec?: Recorrencia; padrao?: Partial<Recorrencia>; onFechar: () => void }) {
  const executar = useExecutar()
  const clientes = useClientesSelect()
  const [f, setF] = useState<Partial<Recorrencia>>(rec ?? { tipo: 'receita', categoria: 'Mensalidade', dia_vencimento: 10, ativo: true, inicio: hojeLocal(), ...padrao })
  const at = <K extends keyof Recorrencia>(k: K, v: Recorrencia[K] | string | null) => setF((x) => ({ ...x, [k]: v }))
  const tipo = (f.tipo ?? 'receita') as TipoLanc

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const dia = Math.min(28, Math.max(1, Number(f.dia_vencimento) || 10))
    if (await executar(() => salvarRecorrencia({ ...f, valor: num(f.valor), dia_vencimento: dia }), rec ? 'Recorrência salva' : 'Recorrência criada')) onFechar()
  }

  return (
    <Modal titulo={rec ? 'Editar recorrência' : tipo === 'receita' ? 'Nova mensalidade' : 'Nova despesa fixa'} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" form="form-rec" disabled={!f.descricao?.trim() || !num(f.valor)}>Salvar</button></>}>
      <form id="form-rec" onSubmit={salvar} className="space-y-4">
        {!rec && <Segmentos valor={tipo} onChange={(t) => setF((x) => ({ ...x, tipo: t, categoria: t === 'receita' ? 'Mensalidade' : CATEGORIAS.despesa[0] }))} opcoes={[{ id: 'receita', nome: 'Mensalidade (entrada)' }, { id: 'despesa', nome: 'Despesa fixa (saída)' }]} />}
        <Campo rotulo="Descrição"><input className="inp" required autoFocus value={f.descricao ?? ''} onChange={(e) => at('descricao', e.target.value)} placeholder={tipo === 'receita' ? 'Mensalidade · Hospedagem e manutenção' : 'Vercel Pro'} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Valor por mês (R$)"><input className="inp numero" required inputMode="decimal" value={f.valor ?? ''} onChange={(e) => at('valor', e.target.value)} /></Campo>
          <Campo rotulo="Dia do vencimento" dica="De 1 a 28"><input type="number" min={1} max={28} className="inp numero" value={f.dia_vencimento ?? 10} onChange={(e) => at('dia_vencimento', e.target.value)} /></Campo>
          <Campo rotulo="Categoria">
            <select className="inp" value={f.categoria ?? ''} onChange={(e) => at('categoria', e.target.value)}>{CATEGORIAS[tipo].map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
          <Campo rotulo="Cliente">
            <select className="inp" value={f.cliente_id ?? ''} onChange={(e) => at('cliente_id', e.target.value)}><option value="">Nenhum</option>{(clientes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </Campo>
          <Campo rotulo="Começa em"><input type="date" className="inp" value={f.inicio ?? ''} onChange={(e) => at('inicio', e.target.value)} /></Campo>
          <Campo rotulo="Termina em (opcional)"><input type="date" className="inp" value={f.fim ?? ''} onChange={(e) => at('fim', e.target.value)} /></Campo>
        </div>
        {rec && <Interruptor ligado={!!f.ativo} onChange={(v) => at('ativo', v as never)} rotulo={f.ativo ? 'Ativa: gera um lançamento por mês' : 'Pausada: não gera mais lançamentos'} />}
        <p className="text-xs text-tinta-3">O lançamento de cada mês é criado sozinho quando alguém abre o Financeiro. Mudar o valor aqui vale para os próximos meses.</p>
      </form>
    </Modal>
  )
}
