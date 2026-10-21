import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, LayoutGrid, List, MessageCircle, Pencil, Plus, Trash2, Video } from 'lucide-react'
import { useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { abrirWhatsApp } from '../lib/acoes'
import {
  carregarMes, concluido, ehConteudo, excluirItem, hojeIso, mesDe, montarSemanas, mudarStatus, nomeDoMes, proximoStatus,
  rotuloDia, salvarItem, somarMes, statusDe, textoFollowup, PLATAFORMAS, TIPOS,
  type FollowupDia, type ItemAgenda, type ReuniaoDia, type TipoItem,
} from '../lib/agenda'
import { cx, hora, isoDia, nomeCurto } from '../lib/util'
import { useAviso, useExecutar } from '../components/Aviso'
import { Avatar, Campo, Erro, Esqueleto, Modal, Pagina, Segmentos } from '../components/ui'

type Filtro = 'tudo' | 'conteudo' | 'tarefa' | 'followup' | 'reuniao'
const FILTROS: { id: Filtro; nome: string; cor: string }[] = [
  { id: 'tudo', nome: 'Tudo', cor: '' },
  { id: 'conteudo', nome: 'Posts e stories', cor: 'bg-sinal' },
  { id: 'tarefa', nome: 'Tarefas', cor: 'bg-tinta' },
  { id: 'followup', nome: 'Follow-ups', cor: 'bg-alerta' },
  { id: 'reuniao', nome: 'Reuniões', cor: 'bg-reuniao' },
]
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Uma linha do calendário, de qualquer origem, para a célula do mês.
type Marca = { chave: string; cor: string; texto: string; feito: boolean }

interface Dia { itens: ItemAgenda[]; followups: FollowupDia[]; reunioes: ReuniaoDia[] }
const diaVazio = (): Dia => ({ itens: [], followups: [], reunioes: [] })

const COR_TIPO: Record<TipoItem, string> = { post: 'bg-sinal', story: 'bg-sinal/50', tarefa: 'bg-tinta', reuniao: 'bg-reuniao' }

function lerPref<T extends string>(chave: string, padrao: T): T {
  try { return (localStorage.getItem(chave) as T) || padrao } catch { return padrao }
}
function gravarPref(chave: string, v: string) { try { localStorage.setItem(chave, v) } catch { /* sem armazenamento */ } }

export default function Agenda() {
  const { eu } = useSessao()
  const hoje = hojeIso()
  const [mes, setMes] = useState(() => mesDe(hoje))
  const [modo, setModo] = useState<'mes' | 'lista'>(() => lerPref('vp-agenda-modo', 'mes'))
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [soMeus, setSoMeus] = useState(() => lerPref<string>('vp-agenda-meus', '0') === '1')
  const [diaAberto, setDiaAberto] = useState<string | null>(null)
  const [editando, setEditando] = useState<Partial<ItemAgenda> | null>(null)

  const dados = useConsulta(`agenda:${mes}`, () => carregarMes(mes), ['agenda', 'followups', 'reunioes'])

  // Agrupa tudo por dia já aplicando os filtros. Follow-up conta no dia em
  // que está agendado; o que venceu continua no dia original, em vermelho.
  const porDia = useMemo(() => {
    const m = new Map<string, Dia>()
    const pegar = (d: string) => { if (!m.has(d)) m.set(d, diaVazio()); return m.get(d)! }
    if (!dados.data) return m
    const meu = (resp: string | null | undefined) => !soMeus || !resp || resp === eu!.email
    for (const i of dados.data.itens) {
      const ok = filtro === 'tudo' || (filtro === 'conteudo' && ehConteudo(i.tipo)) || (filtro === 'tarefa' && i.tipo === 'tarefa') || (filtro === 'reuniao' && i.tipo === 'reuniao')
      if (ok && meu(i.responsavel)) pegar(i.data).itens.push(i)
    }
    if (filtro === 'tudo' || filtro === 'followup') {
      for (const f of dados.data.followups) if (meu(f.lead?.responsavel)) pegar(isoDia(f.agendado_para)).followups.push(f)
    }
    if (filtro === 'tudo' || filtro === 'reuniao') {
      for (const r of dados.data.reunioes) pegar(isoDia(r.data_hora)).reunioes.push(r)
    }
    return m
  }, [dados.data, filtro, soMeus, eu])

  const progresso = useMemo(() => {
    const posts = (dados.data?.itens ?? []).filter((i) => i.tipo === 'post')
    return { total: posts.length, feitos: posts.filter(concluido).length }
  }, [dados.data])

  // Atalhos do teclado: setas trocam o mês, "h" volta para hoje.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (diaAberto || editando || (e.target as HTMLElement).closest('input,textarea,select')) return
      if (e.key === 'ArrowLeft') setMes((m) => somarMes(m, -1))
      if (e.key === 'ArrowRight') setMes((m) => somarMes(m, 1))
      if (e.key.toLowerCase() === 'h') setMes(mesDe(hoje))
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [diaAberto, editando, hoje])

  function novo(data?: string) {
    setEditando({ data: data ?? (mesDe(hoje) === mes ? hoje : `${mes}-01`), tipo: 'post', plataforma: 'Reels + TikTok', status: 'a fazer', titulo: '', objetivo: '', roteiro: '', hora: '', responsavel: eu!.email })
  }

  const diasDaLista = [...porDia.entries()].filter(([d]) => d >= (mesDe(hoje) === mes ? hoje : '')).sort(([a], [b]) => a.localeCompare(b))

  return (
    <Pagina titulo="Agenda" largura="max-w-6xl"
      sub={progresso.total ? <>{progresso.feitos} de {progresso.total} posts do mês publicados</> : 'Posts, tarefas, follow-ups e reuniões num lugar só'}
      acoes={<>
        <Segmentos valor={modo} onChange={(v) => { setModo(v); gravarPref('vp-agenda-modo', v) }} opcoes={[
          { id: 'mes', nome: <span className="inline-flex items-center gap-1.5"><LayoutGrid size={13} /> Mês</span> },
          { id: 'lista', nome: <span className="inline-flex items-center gap-1.5"><List size={13} /> Lista</span> },
        ]} />
        <button className="btn-pri" onClick={() => novo()}><Plus size={16} /> Adicionar</button>
      </>}>

      {progresso.total > 0 && (
        <div className="h-1 rounded-full bg-realce overflow-hidden -mt-3 mb-5">
          <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${(progresso.feitos / progresso.total) * 100}%` }} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={cx('h-8 px-3 rounded-full border text-[13px] inline-flex items-center gap-2 transition-colors',
              filtro === f.id ? 'bg-tinta text-fundo border-tinta' : 'border-fio text-tinta-2 hover:border-tinta-3')}>
            {f.cor && <span className={cx('w-2 h-2 rounded-full', f.cor)} />}{f.nome}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-tinta-2 cursor-pointer">
          <input type="checkbox" className="accent-[rgb(var(--tinta))]" checked={soMeus} onChange={(e) => { setSoMeus(e.target.checked); gravarPref('vp-agenda-meus', e.target.checked ? '1' : '0') }} />
          Só o que é meu
        </label>
      </div>

      {dados.erro && <Erro msg={dados.erro.includes('agenda') ? 'A tabela da agenda ainda não existe no banco.' : dados.erro} onTentar={dados.recarregar} />}

      {/* Cabeçalho do mês */}
      <div className="flex items-center gap-2 mb-3">
        <button className="btn-icone border border-fio" onClick={() => setMes(somarMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
        <h2 className="text-xl font-semibold min-w-[200px] text-center" aria-live="polite">{nomeDoMes(mes)}</h2>
        <button className="btn-icone border border-fio" onClick={() => setMes(somarMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={18} /></button>
        {mes !== mesDe(hoje) && <button className="btn-fantasma btn-sm" onClick={() => setMes(mesDe(hoje))}>Hoje</button>}
        {dados.atualizando && dados.data && <span className="text-xs text-tinta-3 ml-auto">atualizando…</span>}
      </div>

      {modo === 'mes' ? (
        <div className="folha overflow-hidden">
          <div className="grid grid-cols-7 border-b border-fio">
            {SEMANA.map((s) => <div key={s} className="rotulo text-center py-2">{s}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {montarSemanas(mes).map((data, i) => {
              if (!data) return <div key={`v${i}`} className="min-h-[64px] md:min-h-[118px] border-b border-r border-fio/60 bg-fundo/40" />
              const dia = porDia.get(data)
              const marcas = dia ? marcasDoDia(dia) : []
              const pendentes = marcas.filter((x) => !x.feito).length
              const atrasado = data < hoje && pendentes > 0
              const ehHoje = data === hoje
              return (
                <button key={data} onClick={() => setDiaAberto(data)}
                  aria-label={`${rotuloDia(data)}: ${marcas.length ? `${marcas.length} itens` : 'nada marcado'}`}
                  className={cx('group relative flex flex-col items-stretch justify-start min-h-[64px] md:min-h-[118px] border-b border-r border-fio/60 p-1 md:p-1.5 text-left transition-colors hover:bg-realce/70',
                    (i + 1) % 7 === 0 && 'border-r-0', atrasado && 'bg-sinal/[.06]', data < hoje && !atrasado && 'bg-fundo/30')}>
                  <span className={cx('inline-grid place-items-center w-6 h-6 rounded-full numero text-xs',
                    ehHoje ? 'bg-tinta text-fundo font-medium' : atrasado ? 'text-sinal font-medium' : data < hoje ? 'text-tinta-3' : 'text-tinta-2')}>
                    {Number(data.slice(8))}
                  </span>
                  {/* Computador: as primeiras linhas por extenso */}
                  <div className="hidden md:block space-y-0.5 mt-0.5">
                    {marcas.slice(0, 3).map((x) => (
                      <div key={x.chave} className={cx('flex items-center gap-1 text-[11px] leading-tight truncate', x.feito ? 'text-tinta-3 line-through' : 'text-tinta-2')}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', x.cor)} />
                        <span className="truncate">{x.texto}</span>
                      </div>
                    ))}
                    {marcas.length > 3 && <div className="text-[11px] text-tinta-3 pl-2.5">+{marcas.length - 3}</div>}
                  </div>
                  {/* Celular: bolinhas com a cor de cada tipo */}
                  {marcas.length > 0 && (
                    <div className="md:hidden flex flex-wrap gap-0.5 mt-1 px-0.5">
                      {marcas.slice(0, 6).map((x) => <span key={x.chave} className={cx('w-1.5 h-1.5 rounded-full', x.cor, x.feito && 'opacity-30')} />)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {dados.carregando && <Esqueleto className="h-40" />}
          {!dados.carregando && diasDaLista.length === 0 && <div className="folha p-8 text-center text-sm text-tinta-3">Nada marcado daqui até o fim do mês.</div>}
          {diasDaLista.map(([data, dia]) => (
            <section key={data}>
              <h3 className={cx('font-semibold mb-2', data === hoje && 'text-sinal')}>{data === hoje ? 'Hoje · ' : ''}{rotuloDia(data)}</h3>
              <ConteudoDia dia={dia} data={data} onEditar={setEditando} />
            </section>
          ))}
        </div>
      )}

      <p className="hidden md:block text-xs text-tinta-3 mt-4">
        <span className="tecla">←</span> <span className="tecla">→</span> trocam o mês · <span className="tecla">H</span> volta para hoje · clique num dia para ver tudo
      </p>

      {diaAberto && !editando && (
        <Modal largura="max-w-2xl" onFechar={() => setDiaAberto(null)}
          titulo={<span>{diaAberto === hoje && <span className="text-sinal">Hoje · </span>}{rotuloDia(diaAberto)}</span>}
          rodape={<>
            <button className="btn-fantasma mr-auto" onClick={() => setDiaAberto(somarDia(diaAberto, -1))}><ChevronLeft size={16} /> <span className="hidden sm:inline">Dia anterior</span></button>
            <button className="btn-fantasma" onClick={() => setDiaAberto(somarDia(diaAberto, 1))}><span className="hidden sm:inline">Próximo dia</span> <ChevronRight size={16} /></button>
            <button className="btn-pri" onClick={() => novo(diaAberto)}><Plus size={15} /> Adicionar</button>
          </>}>
          <ConteudoDia dia={porDia.get(diaAberto) ?? diaVazio()} data={diaAberto} onEditar={setEditando} vazio />
        </Modal>
      )}

      {editando && <FormItem item={editando} onFechar={() => setEditando(null)} />}
    </Pagina>
  )
}

function somarDia(data: string, n: number) {
  const [a, m, d] = data.split('-').map(Number)
  const x = new Date(a, m - 1, d + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function marcasDoDia(dia: Dia): Marca[] {
  return [
    ...dia.reunioes.map((r) => ({ chave: `r${r.id}`, cor: 'bg-reuniao', texto: `${hora(r.data_hora)} ${nomeCurto(r.lead?.nome ?? 'Reunião')}`, feito: r.status === 'realizada' })),
    ...dia.itens.map((i) => ({ chave: `i${i.id}`, cor: COR_TIPO[i.tipo], texto: `${i.hora ? i.hora.slice(0, 5) + ' ' : ''}${i.titulo}`, feito: concluido(i) })),
    ...dia.followups.map((f) => ({ chave: `f${f.id}`, cor: 'bg-alerta', texto: `Follow-up · ${nomeCurto(f.lead!.nome)}`, feito: false })),
  ]
}

/* Tudo de um dia: o que abre na janela e o que aparece no modo lista. */
function ConteudoDia({ dia, data, onEditar, vazio }: { dia: Dia; data: string; onEditar: (i: Partial<ItemAgenda>) => void; vazio?: boolean }) {
  const conteudo = dia.itens.filter((i) => ehConteudo(i.tipo))
  const tarefas = dia.itens.filter((i) => !ehConteudo(i.tipo))
  const nada = !dia.itens.length && !dia.followups.length && !dia.reunioes.length
  if (nada) return vazio ? <p className="text-sm text-tinta-3 py-6 text-center">Nada marcado para este dia.</p> : null

  return (
    <div className="space-y-5">
      {dia.reunioes.length > 0 && (
        <Bloco titulo="Reuniões com lead" cor="bg-reuniao" n={dia.reunioes.length}>
          {dia.reunioes.map((r) => <LinhaReuniao key={r.id} r={r} />)}
        </Bloco>
      )}
      {dia.followups.length > 0 && (
        <Bloco titulo="Follow-ups" cor="bg-alerta" n={dia.followups.length}>
          {dia.followups.map((f) => <LinhaFollowup key={f.id} f={f} atrasado={data < hojeIso()} />)}
        </Bloco>
      )}
      {conteudo.length > 0 && (
        <Bloco titulo="Posts e stories" cor="bg-sinal" n={conteudo.length}>
          {conteudo.map((i) => <CartaoItem key={i.id} item={i} onEditar={onEditar} />)}
        </Bloco>
      )}
      {tarefas.length > 0 && (
        <Bloco titulo="Tarefas" cor="bg-tinta" n={tarefas.length}>
          {tarefas.map((i) => <CartaoItem key={i.id} item={i} onEditar={onEditar} />)}
        </Bloco>
      )}
    </div>
  )
}

function Bloco({ titulo, cor, n, children }: { titulo: string; cor: string; n: number; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="flex items-center gap-2 rotulo mb-2"><span className={cx('w-2 h-2 rounded-full', cor)} />{titulo}<span className="numero">{n}</span></h4>
      <div className="folha divide-y divide-fio overflow-hidden">{children}</div>
    </section>
  )
}

function CartaoItem({ item, onEditar }: { item: ItemAgenda; onEditar: (i: Partial<ItemAgenda>) => void }) {
  const { nomeDe } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const [aberto, setAberto] = useState(false)
  const prox = proximoStatus(item)
  const feito = concluido(item)
  const conteudo = ehConteudo(item.tipo)

  async function avancar() {
    if (!prox) return
    const anterior = item.status
    if (await executar(() => mudarStatus(item.id, prox))) {
      avisar(conteudo ? `"${item.titulo}" agora está ${prox}` : 'Tarefa feita', 'ok', { nome: 'Desfazer', fn: () => executar(() => mudarStatus(item.id, anterior)) })
    }
  }
  async function excluir() {
    if (!confirm(`Excluir "${item.titulo}"? O roteiro vai junto.`)) return
    await executar(() => excluirItem(item.id), 'Excluído')
  }

  return (
    <article className={cx('px-4 py-3', feito && 'bg-fundo/50')}>
      <div className="flex items-start gap-3">
        {!conteudo && (
          <button onClick={() => (feito ? executar(() => mudarStatus(item.id, 'a fazer')) : avancar())} aria-label={feito ? 'Marcar como a fazer' : 'Marcar como feito'}
            className={cx('mt-0.5 w-5 h-5 rounded border grid place-items-center shrink-0 transition-colors', feito ? 'bg-ok border-ok text-white' : 'border-tinta-3 hover:border-tinta')}>
            {feito && <Check size={13} strokeWidth={3} />}
          </button>
        )}
        <button className="flex-1 min-w-0 text-left" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
          <div className="flex items-center gap-2 flex-wrap">
            {item.hora && <span className="numero text-xs text-tinta-3">{item.hora.slice(0, 5)}</span>}
            {item.plataforma && <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sinal/10 text-sinal">{item.plataforma}</span>}
            {conteudo && <span className={cx('font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded', feito ? 'bg-ok/15 text-ok' : 'bg-realce text-tinta-2')}>{item.status}</span>}
          </div>
          <div className={cx('font-medium mt-1 leading-snug', feito && !conteudo && 'line-through text-tinta-3')}>{item.titulo}</div>
          {item.objetivo && <div className="text-[13px] text-tinta-3 mt-0.5">{item.objetivo}</div>}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {item.responsavel && <span title={nomeDe(item.responsavel)}><Avatar nome={nomeDe(item.responsavel)} tamanho="sm" /></span>}
          {conteudo && prox && (
            <button className="btn-sec btn-sm" onClick={avancar} title={`Marcar como ${prox}`}><ArrowRight size={13} /> <span className="hidden sm:inline">{prox}</span></button>
          )}
          <button className="btn-icone w-8 h-8" onClick={() => setAberto((v) => !v)} aria-label="Ver roteiro"><ChevronDown size={15} className={cx('transition-transform', aberto && 'rotate-180')} /></button>
        </div>
      </div>
      {aberto && (
        <div className="mt-3 ml-0 md:ml-8 animate-entra">
          {item.roteiro ? (
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed bg-realce/70 rounded p-3 max-h-[50vh] overflow-y-auto rolagem-fina">{item.roteiro}</pre>
          ) : <p className="text-sm text-tinta-3">Sem roteiro.</p>}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {item.roteiro && <button className="btn-sec btn-sm" onClick={() => { navigator.clipboard.writeText(legendaDe(item.roteiro)); avisar(item.roteiro.includes('LEGENDA:') ? 'Legenda copiada' : 'Texto copiado') }}>
              <Copy size={13} /> {item.roteiro.includes('LEGENDA:') ? 'Copiar legenda' : 'Copiar texto'}
            </button>}
            <button className="btn-sec btn-sm" onClick={() => onEditar(item)}><Pencil size={13} /> Editar</button>
            <button className="btn-fantasma btn-sm text-sinal" onClick={excluir}><Trash2 size={13} /> Excluir</button>
            {item.responsavel && <span className="text-xs text-tinta-3 self-center ml-auto">{nomeDe(item.responsavel)}</span>}
          </div>
        </div>
      )}
    </article>
  )
}

/** Do roteiro, só o que vai no post: a legenda e as hashtags. */
function legendaDe(roteiro: string) {
  const i = roteiro.indexOf('LEGENDA:')
  if (i < 0) return roteiro
  return roteiro.slice(i + 8).split(/\n\s*\nDEPOIS DE POSTAR:/)[0].trim()
}

function LinhaFollowup({ f, atrasado }: { f: FollowupDia; atrasado: boolean }) {
  const { eu, nomeDe } = useSessao()
  const executar = useExecutar()
  const nav = useNavigate()
  const l = f.lead!
  const msg = f.mensagem_sugerida || textoFollowup(f.tentativa, l.nome)
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <button className="font-medium hover:underline text-left" onClick={() => nav(`/leads/${l.id}`)}>{nomeCurto(l.nome)}</button>
          <div className={cx('text-[13px] mt-0.5', atrasado ? 'text-sinal' : 'text-tinta-3')}>
            <Clock size={11} className="inline -mt-0.5 mr-1" />{hora(f.agendado_para)} · {f.tentativa}ª tentativa{atrasado && ' · atrasado'}
            {l.responsavel && ` · ${nomeDe(l.responsavel).split(' ')[0]}`}
          </div>
        </div>
        <button className="btn-wa btn-sm" onClick={() => executar(() => abrirWhatsApp(l, msg, eu!, f.id), 'Follow-up enviado')}>
          <MessageCircle size={14} /> <span className="hidden sm:inline">WhatsApp</span>
        </button>
      </div>
      <p className="text-[13px] text-tinta-2 mt-2 bg-realce/60 rounded px-3 py-2 leading-relaxed">{msg}</p>
    </div>
  )
}

function LinhaReuniao({ r }: { r: ReuniaoDia }) {
  const nav = useNavigate()
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Video size={16} className="text-reuniao shrink-0" />
      <div className="flex-1 min-w-0">
        <button className="font-medium hover:underline text-left" onClick={() => r.lead && nav(`/leads/${r.lead.id}`)}>{nomeCurto(r.lead?.nome ?? 'Reunião')}</button>
        <div className="text-[13px] text-tinta-3">{hora(r.data_hora)} · {r.tipo} · {r.status}</div>
      </div>
      {r.link && <a className="btn-sec btn-sm" href={r.link} target="_blank" rel="noreferrer">Entrar</a>}
    </div>
  )
}

function FormItem({ item, onFechar }: { item: Partial<ItemAgenda>; onFechar: () => void }) {
  const { eu, equipe } = useSessao()
  const executar = useExecutar()
  const [f, setF] = useState<Partial<ItemAgenda>>({ ...item, hora: item.hora?.slice(0, 5) ?? '' })
  const at = <K extends keyof ItemAgenda>(k: K, v: ItemAgenda[K] | string) => setF((x) => ({ ...x, [k]: v }))
  const conteudo = ehConteudo((f.tipo ?? 'tarefa') as TipoItem)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const st = statusDe(f.tipo as TipoItem).includes(f.status as never) ? f.status : 'a fazer'
    if (await executar(() => salvarItem({ ...f, status: st }, eu!.email), f.id ? 'Salvo' : 'Adicionado na agenda')) onFechar()
  }

  return (
    <Modal largura="max-w-2xl" titulo={f.id ? 'Editar' : 'Adicionar na agenda'} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" form="form-agenda" disabled={!f.titulo?.trim() || !f.data}>Salvar</button></>}>
      <form id="form-agenda" onSubmit={salvar} className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" onClick={() => setF((x) => ({ ...x, tipo: t.id, plataforma: ehConteudo(t.id) ? (x.plataforma || (t.id === 'story' ? 'Story' : 'Reels + TikTok')) : null }))}
              className={f.tipo === t.id ? 'btn-pri btn-sm' : 'btn-sec btn-sm'}>{t.nome}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Campo rotulo="Data"><input type="date" className="inp" required value={f.data ?? ''} onChange={(e) => at('data', e.target.value)} /></Campo>
          <Campo rotulo="Hora (opcional)"><input type="time" className="inp" value={f.hora ?? ''} onChange={(e) => at('hora', e.target.value)} /></Campo>
          {conteudo && (
            <Campo rotulo="Onde" className="col-span-2 sm:col-span-1">
              <select className="inp" value={f.plataforma ?? ''} onChange={(e) => at('plataforma', e.target.value)}>{PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}</select>
            </Campo>
          )}
        </div>
        <Campo rotulo={conteudo ? 'Tema do post' : 'O que fazer'}><input className="inp" autoFocus required value={f.titulo ?? ''} onChange={(e) => at('titulo', e.target.value)} /></Campo>
        <Campo rotulo="Objetivo"><input className="inp" value={f.objetivo ?? ''} onChange={(e) => at('objetivo', e.target.value)} placeholder={conteudo ? 'comentários, salvamento, pedir orçamento…' : 'por que isso importa'} /></Campo>
        <Campo rotulo={conteudo ? 'Roteiro e legenda' : 'Detalhes'} dica={conteudo ? 'Escreva "LEGENDA:" antes do texto do post: o botão "Copiar legenda" copia só essa parte.' : undefined}>
          <textarea className="inp text-[14px]" rows={9} value={f.roteiro ?? ''} onChange={(e) => at('roteiro', e.target.value)} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Responsável">
            <select className="inp" value={f.responsavel ?? ''} onChange={(e) => at('responsavel', e.target.value)}>
              <option value="">Ninguém ainda</option>
              {equipe.filter((m) => m.ativo).map((m) => <option key={m.email} value={m.email}>{m.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Status">
            <select className="inp" value={f.status ?? 'a fazer'} onChange={(e) => at('status', e.target.value)}>
              {statusDe((f.tipo ?? 'tarefa') as TipoItem).map((s) => <option key={s}>{s}</option>)}
            </select>
          </Campo>
        </div>
      </form>
    </Modal>
  )
}
