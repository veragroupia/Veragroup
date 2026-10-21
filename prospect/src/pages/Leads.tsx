import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Download, MessageCircle, Plus, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invalidar, q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { abrirWhatsApp, atualizarLeads } from '../lib/acoes'
import { ETAPAS, type Etapa, type Lead } from '../lib/tipos'
import { baixarCsv, cx, nichoValido, nomeCurto, normalizar, relativo, soDigitos, telefoneBonito } from '../lib/util'
import { useExecutar } from '../components/Aviso'
import { Avatar, Campo, Erro, EtapaTag, Linhas, Modal, Pagina, Score, Vazio } from '../components/ui'

type Linha = Pick<Lead, 'id' | 'nome' | 'nicho' | 'cidade' | 'telefone' | 'whatsapp' | 'score' | 'etapa' | 'responsavel' | 'ultimo_contato_em' | 'ultima_resposta_em' | 'mensagem_inicial' | 'created_at' | 'rating' | 'avaliacoes' | 'site' | 'instagram'>
const CAMPOS = 'id, nome, nicho, cidade, telefone, whatsapp, score, etapa, responsavel, ultimo_contato_em, ultima_resposta_em, mensagem_inicial, created_at, rating, avaliacoes, site, instagram'
type Ordem = 'score' | 'nome' | 'ultimo_contato_em' | 'created_at'
const POR_PAGINA = 50

export default function Leads() {
  const { eu, equipe, nomeDe } = useSessao()
  const nav = useNavigate()
  const executar = useExecutar()
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState(params.get('q') ?? '')
  const buscaAdiada = useDeferredValue(busca)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [limite, setLimite] = useState(POR_PAGINA)
  const refBusca = useRef<HTMLInputElement>(null)

  const etapas = (params.get('etapa')?.split(',').filter(Boolean) ?? []) as Etapa[]
  const cidade = params.get('cidade') ?? ''
  const nicho = params.get('nicho') ?? ''
  const resp = params.get('resp') ?? ''
  const ordem = (params.get('ordem') as Ordem) ?? 'score'
  const asc = params.get('dir') === 'asc'
  const novo = params.get('novo') === '1'

  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v); else p.delete(k)
    setParams(p, { replace: true })
    setLimite(POR_PAGINA)
  }

  useEffect(() => { const t = setTimeout(() => set('q', busca.trim() || null), 300); return () => clearTimeout(t) }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'f' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); refBusca.current?.focus() } }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [])

  const leads = useConsulta('leads:todos', () => q<Linha[]>(supabase.from('leads').select(CAMPOS).order('score', { ascending: false }).limit(5000)), ['leads'])

  const opcoes = useMemo(() => {
    const d = leads.data ?? []
    return {
      cidades: [...new Set(d.map((l) => l.cidade).filter(Boolean) as string[])].sort(),
      nichos: [...new Set(d.map((l) => l.nicho).filter(nichoValido) as string[])].sort(),
      contagem: Object.fromEntries(ETAPAS.map((e) => [e.id, d.filter((l) => l.etapa === e.id).length])) as Record<Etapa, number>,
    }
  }, [leads.data])

  const filtrados = useMemo(() => {
    const termo = normalizar(buscaAdiada.trim())
    const dig = soDigitos(buscaAdiada)
    let r = (leads.data ?? []).filter((l) =>
      (!etapas.length || etapas.includes(l.etapa)) &&
      (!cidade || l.cidade === cidade) &&
      (!nicho || l.nicho === nicho) &&
      (!resp || (resp === 'ninguem' ? !l.responsavel : l.responsavel === resp)) &&
      (!termo || normalizar(l.nome).includes(termo) || (dig.length >= 4 && soDigitos(l.telefone ?? l.whatsapp).includes(dig))))
    const val = (l: Linha) => (ordem === 'nome' ? normalizar(l.nome) : ordem === 'score' ? l.score : l[ordem] ?? '')
    r = [...r].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1) })
    return r
  }, [leads.data, buscaAdiada, etapas.join(), cidade, nicho, resp, ordem, asc]) // eslint-disable-line react-hooks/exhaustive-deps

  const visiveis = filtrados.slice(0, limite)
  const temFiltro = etapas.length || cidade || nicho || resp || busca
  const todosSel = visiveis.length > 0 && visiveis.every((l) => sel.has(l.id))

  function ordenar(c: Ordem) {
    const p = new URLSearchParams(params)
    if (ordem === c) p.set('dir', asc ? 'desc' : 'asc'); else { p.set('ordem', c); p.set('dir', c === 'nome' ? 'asc' : 'desc') }
    setParams(p, { replace: true })
  }
  function alternarEtapa(e: Etapa) {
    const n = etapas.includes(e) ? etapas.filter((x) => x !== e) : [...etapas, e]
    set('etapa', n.join(',') || null)
  }
  async function emMassa(campos: Partial<Lead>, msg: string) {
    if (await executar(() => atualizarLeads([...sel], campos), msg)) setSel(new Set())
  }
  function exportar() {
    baixarCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Nome', 'Nicho', 'Cidade', 'Telefone', 'WhatsApp', 'Etapa', 'Score', 'Responsável', 'Nota Google', 'Avaliações', 'Último contato'],
      ...filtrados.map((l) => [l.nome, l.nicho, l.cidade, l.telefone, l.whatsapp, l.etapa, l.score, nomeDe(l.responsavel), l.rating, l.avaliacoes, l.ultimo_contato_em?.slice(0, 10)]),
    ])
  }

  const Th = ({ c, children, className }: { c?: Ordem; children: React.ReactNode; className?: string }) => (
    <th className={className}>
      {c ? <button className="inline-flex items-center gap-1 hover:text-tinta uppercase" onClick={() => ordenar(c)}>
        {children}{ordem === c && (asc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button> : children}
    </th>
  )

  return (
    <Pagina titulo="Leads" sub={leads.data ? `${filtrados.length} de ${leads.data.length}` : ' '}
      acoes={<>
        <button className="btn-sec" onClick={exportar} disabled={!filtrados.length}><Download size={15} /> <span className="hidden sm:inline">Exportar</span></button>
        <button className="btn-pri" onClick={() => set('novo', '1')}><Plus size={16} /> Novo lead</button>
      </>}>

      {/* Filtros */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
            <input ref={refBusca} className="inp pl-9 pr-10" placeholder="Buscar por nome ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <span className="tecla absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex">F</span>
          </div>
          <select className="inp w-auto" value={cidade} onChange={(e) => set('cidade', e.target.value || null)}>
            <option value="">Todas as cidades</option>{opcoes.cidades.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="inp w-auto" value={nicho} onChange={(e) => set('nicho', e.target.value || null)}>
            <option value="">Todos os nichos</option>{opcoes.nichos.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="inp w-auto" value={resp} onChange={(e) => set('resp', e.target.value || null)}>
            <option value="">Qualquer responsável</option><option value="ninguem">Sem responsável</option>
            {equipe.map((m) => <option key={m.email} value={m.email}>{m.nome}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ETAPAS.map((e) => {
            const on = etapas.includes(e.id)
            return (
              <button key={e.id} onClick={() => alternarEtapa(e.id)}
                className={cx('h-8 px-3 rounded-full border text-[13px] inline-flex items-center gap-2 transition-colors',
                  on ? 'bg-tinta text-fundo border-tinta' : 'border-fio text-tinta-2 hover:border-tinta-3')}>
                <span className={cx('w-1.5 h-1.5 rounded-full', e.cor)} />{e.nome}<span className="numero text-[11px] opacity-60">{opcoes.contagem[e.id] ?? 0}</span>
              </button>
            )
          })}
          {temFiltro ? <button className="btn-fantasma btn-sm" onClick={() => { setBusca(''); setParams({}, { replace: true }) }}><X size={14} /> Limpar</button> : null}
        </div>
      </div>

      {/* Barra de ações em massa */}
      {sel.size > 0 && (
        <div className="sticky top-14 md:top-3 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-tinta text-fundo px-4 py-2.5 shadow-flutua animate-entra">
          <span className="text-sm font-medium mr-2">{sel.size} selecionado{sel.size > 1 && 's'}</span>
          <select className="h-8 rounded bg-fundo/10 border border-fundo/20 px-2 text-sm" value="" onChange={(e) => e.target.value && emMassa({ responsavel: e.target.value === '-' ? null : e.target.value }, 'Responsável atualizado')}>
            <option value="">Atribuir a…</option>{equipe.map((m) => <option key={m.email} value={m.email} className="text-tinta">{m.nome}</option>)}<option value="-" className="text-tinta">Ninguém</option>
          </select>
          <select className="h-8 rounded bg-fundo/10 border border-fundo/20 px-2 text-sm" value="" onChange={(e) => e.target.value && emMassa({ etapa: e.target.value as Etapa }, 'Etapa atualizada')}>
            <option value="">Mudar etapa…</option>{ETAPAS.filter((e) => e.id !== 'fechado' && e.id !== 'perdido').map((e) => <option key={e.id} value={e.id} className="text-tinta">{e.nome}</option>)}
          </select>
          <button className="h-8 px-3 rounded text-sm hover:bg-fundo/10" onClick={() => emMassa({ etapa: 'descartado' }, 'Leads descartados')}>Descartar</button>
          <button className="ml-auto h-8 px-2 rounded hover:bg-fundo/10" onClick={() => setSel(new Set())} aria-label="Limpar seleção"><X size={16} /></button>
        </div>
      )}

      {leads.erro && <Erro msg={leads.erro} onTentar={leads.recarregar} />}
      {leads.carregando ? <Linhas n={8} /> : filtrados.length === 0 ? (
        <div className="folha"><Vazio titulo="Nenhum lead com esses filtros.">Tente limpar os filtros ou cadastre um lead novo.</Vazio></div>
      ) : (
        <>
          {/* Tabela (computador) */}
          <div className="hidden md:block folha overflow-hidden">
            <table className="tabela">
              <thead><tr>
                <th className="w-10"><input type="checkbox" className="accent-[rgb(var(--tinta))]" checked={todosSel} onChange={() => setSel(todosSel ? new Set() : new Set(visiveis.map((l) => l.id)))} aria-label="Selecionar todos" /></th>
                <Th c="nome">Lead</Th><Th>Etapa</Th><Th c="score">Score</Th><Th>Responsável</Th><Th c="ultimo_contato_em">Último contato</Th><th className="w-24" />
              </tr></thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.id} onClick={() => nav(`/leads/${l.id}`)} className={cx(sel.has(l.id) && '!bg-realce')}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="accent-[rgb(var(--tinta))]" checked={sel.has(l.id)} aria-label={`Selecionar ${l.nome}`}
                        onChange={() => setSel((s) => { const n = new Set(s); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n })} />
                    </td>
                    <td className="max-w-[340px]">
                      <div className="font-medium truncate flex items-center gap-2">
                        {nomeCurto(l.nome)}
                        {l.ultima_resposta_em && (!l.ultimo_contato_em || l.ultima_resposta_em > l.ultimo_contato_em) && <span className="w-1.5 h-1.5 rounded-full bg-sinal shrink-0" title="Respondeu e espera retorno" />}
                      </div>
                      <div className="text-xs text-tinta-3 truncate">{[nichoValido(l.nicho) ? l.nicho : null, l.cidade, telefoneBonito(l.whatsapp ?? l.telefone)].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td><EtapaTag etapa={l.etapa} /></td>
                    <td><Score v={l.score} /></td>
                    <td>{l.responsavel ? <span className="inline-flex items-center gap-2 text-sm"><Avatar nome={nomeDe(l.responsavel)} tamanho="sm" />{nomeDe(l.responsavel).split(' ')[0]}</span> : <span className="text-tinta-3 text-sm">-</span>}</td>
                    <td className="text-sm text-tinta-2 whitespace-nowrap">{relativo(l.ultimo_contato_em)}</td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      {(l.whatsapp || l.telefone) && (
                        <button className="btn-fantasma btn-sm text-[#1d8f4e]" title="Abrir WhatsApp"
                          onClick={() => executar(() => abrirWhatsApp(l, l.etapa === 'novo' ? l.mensagem_inicial ?? '' : '', eu!))}>
                          <MessageCircle size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lista (celular) */}
          <ul className="md:hidden folha divide-y divide-fio">
            {visiveis.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-center gap-3" onClick={() => nav(`/leads/${l.id}`)}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{nomeCurto(l.nome)}</div>
                  <div className="text-xs text-tinta-3 truncate mt-0.5">{[l.cidade, relativo(l.ultimo_contato_em) !== '-' ? `contato ${relativo(l.ultimo_contato_em)}` : null].filter(Boolean).join(' · ')}</div>
                  <div className="mt-1.5 flex items-center gap-3"><EtapaTag etapa={l.etapa} /><Score v={l.score} /></div>
                </div>
              </li>
            ))}
          </ul>

          {filtrados.length > limite && (
            <div className="text-center mt-4">
              <button className="btn-sec" onClick={() => setLimite((n) => n + POR_PAGINA * 2)}>Mostrar mais <span className="numero text-tinta-3">{filtrados.length - limite}</span></button>
            </div>
          )}
        </>
      )}

      {novo && <NovoLead onFechar={() => set('novo', null)} cidades={opcoes.cidades} nichos={opcoes.nichos} />}
    </Pagina>
  )
}

function NovoLead({ onFechar, cidades, nichos }: { onFechar: () => void; cidades: string[]; nichos: string[] }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const nav = useNavigate()
  const [f, setF] = useState({ nome: '', telefone: '', nicho: '', cidade: '', instagram: '', observacoes: '' })
  const at = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    let id = ''
    const tel = soDigitos(f.telefone)
    const ok = await executar(async () => {
      const r = await q<{ id: string }>(supabase.from('leads').insert({
        nome: f.nome.trim(), telefone: f.telefone.trim() || null, whatsapp: tel.length >= 10 ? (tel.startsWith('55') ? tel : '55' + tel) : null,
        nicho: f.nicho.trim() || null, cidade: f.cidade.trim() || null, instagram: f.instagram.trim() || null,
        observacoes: f.observacoes.trim() || null, origem: 'manual', responsavel: eu!.email, score: 50,
      }).select('id').single())
      id = r.id
      invalidar('leads')
    }, 'Lead cadastrado')
    if (ok) { onFechar(); nav(`/leads/${id}`) }
  }

  return (
    <Modal titulo="Novo lead" onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" form="novo-lead" disabled={!f.nome.trim()}>Cadastrar</button></>}>
      <form id="novo-lead" onSubmit={salvar} className="grid grid-cols-2 gap-4">
        <Campo rotulo="Nome do negócio" className="col-span-2"><input className="inp" autoFocus required value={f.nome} onChange={at('nome')} /></Campo>
        <Campo rotulo="WhatsApp ou telefone" className="col-span-2 sm:col-span-1"><input className="inp" inputMode="tel" placeholder="(11) 99999-9999" value={f.telefone} onChange={at('telefone')} /></Campo>
        <Campo rotulo="Instagram" className="col-span-2 sm:col-span-1"><input className="inp" placeholder="@perfil" value={f.instagram} onChange={at('instagram')} /></Campo>
        <Campo rotulo="Nicho"><input className="inp" list="nichos" value={f.nicho} onChange={at('nicho')} /><datalist id="nichos">{nichos.map((n) => <option key={n} value={n} />)}</datalist></Campo>
        <Campo rotulo="Cidade"><input className="inp" list="cidades" value={f.cidade} onChange={at('cidade')} /><datalist id="cidades">{cidades.map((n) => <option key={n} value={n} />)}</datalist></Campo>
        <Campo rotulo="Observações" className="col-span-2"><textarea className="inp" rows={3} value={f.observacoes} onChange={at('observacoes')} placeholder="Como chegou, indicação de quem, o que precisa" /></Campo>
      </form>
    </Modal>
  )
}
