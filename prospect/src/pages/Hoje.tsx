import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock, MessageCircle, MoreHorizontal, Play, Reply, Sparkles, Trash2, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { abrirWhatsApp, adiarFollowup, mudarEtapa, pularFollowup } from '../lib/acoes'
import type { Followup, Lead, Reuniao } from '../lib/tipos'
import { brl, cx, fimDoDia, hora, inicioDoDia, nomeCurto, relativo, saudacao } from '../lib/util'
import { carregarHoje, concluido, ehConteudo, mudarStatus, proximoStatus, textoFollowup, type ItemAgenda } from '../lib/agenda'
import { situacao, type Lancamento } from '../lib/gestao'
import { useAviso, useExecutar } from '../components/Aviso'
import { Erro, EtapaTag, Linhas, Modal, Pagina, Score, Sinal, Vazio } from '../components/ui'

type LeadMin = Pick<Lead, 'id' | 'nome' | 'nicho' | 'cidade' | 'telefone' | 'whatsapp' | 'score' | 'score_motivos' | 'etapa' | 'responsavel' | 'mensagem_inicial' | 'ultimo_contato_em' | 'ultima_resposta_em' | 'rating' | 'avaliacoes'>
const CAMPOS = 'id, nome, nicho, cidade, telefone, whatsapp, score, score_motivos, etapa, responsavel, mensagem_inicial, ultimo_contato_em, ultima_resposta_em, rating, avaliacoes'

type Tipo = 'resposta' | 'reuniao' | 'followup' | 'primeiro'
interface Tarefa {
  chave: string
  tipo: Tipo
  lead: LeadMin
  motivo: string
  quando?: string
  mensagem: string
  followup?: Followup
  reuniao?: Reuniao
}

const GRUPOS: { tipo: Tipo; titulo: string; dica: string; icone: typeof Reply }[] = [
  { tipo: 'resposta', titulo: 'Responderam e esperam retorno', dica: 'Responda primeiro. Lead quente esfria em poucas horas.', icone: Reply },
  { tipo: 'reuniao', titulo: 'Reuniões de hoje', dica: 'Confirme o horário pela manhã.', icone: Video },
  { tipo: 'followup', titulo: 'Follow-ups do dia', dica: 'Mensagens que o sistema agendou depois do último contato.', icone: Clock },
  { tipo: 'primeiro', titulo: 'Primeiro contato', dica: 'Os melhores do radar, pelo score.', icone: Sparkles },
]


const META_PADRAO = 15
function lerMeta() {
  try { return Number(localStorage.getItem('vp-meta')) || META_PADRAO } catch { return META_PADRAO }
}

export default function Hoje() {
  const { eu, nomeDe } = useSessao()
  const nav = useNavigate()
  const [meta, setMeta] = useState(lerMeta)
  const [feitos, setFeitos] = useState<Set<string>>(new Set())
  const [sequencia, setSequencia] = useState<number | null>(null)

  const fim = fimDoDia().toISOString()
  const inicio = inicioDoDia().toISOString()

  const leads = useConsulta('hoje:leads', () =>
    q<LeadMin[]>(supabase.from('leads').select(CAMPOS).not('etapa', 'in', '(fechado,perdido,descartado)').order('score', { ascending: false }).limit(1000)),
    ['leads'])
  const followups = useConsulta('hoje:followups', () =>
    q<Followup[]>(supabase.from('followups').select('*').eq('status', 'pendente').lte('agendado_para', fim).order('agendado_para')),
    ['followups'])
  const reunioes = useConsulta('hoje:reunioes', () =>
    q<Reuniao[]>(supabase.from('reunioes').select('*').gte('data_hora', inicio).lte('data_hora', fim).neq('status', 'cancelada').order('data_hora')),
    ['reunioes'])
  const contatosHoje = useConsulta(`hoje:contatos:${eu!.email}`, async () => {
    const { count } = await supabase.from('atividades').select('id', { count: 'exact', head: true })
      .eq('tipo', 'whatsapp_aberto').eq('usuario', eu!.email).gte('created_at', inicio)
    return count ?? 0
  }, ['atividades'])

  const respondidos = useMemo(() => (leads.data ?? []).filter((l) =>
    l.ultima_resposta_em && (!l.ultimo_contato_em || new Date(l.ultima_resposta_em) > new Date(l.ultimo_contato_em))), [leads.data])

  // A IA (função avaliar) deixa a próxima mensagem pronta; usamos ela quando existir.
  const sugestoes = useConsulta(respondidos.length ? `hoje:sugestoes:${respondidos.map((l) => l.id).join(',')}` : null, async () => {
    const data = await q<{ lead_id: string; proxima_mensagem: string | null }[]>(supabase.from('avaliacoes')
      .select('lead_id, proxima_mensagem').in('lead_id', respondidos.map((l) => l.id)).order('created_at', { ascending: false }))
    const m = new Map<string, string>()
    for (const a of data) if (a.proxima_mensagem && !m.has(a.lead_id)) m.set(a.lead_id, a.proxima_mensagem)
    return m
  }, ['avaliacoes'])

  const tarefas = useMemo<Tarefa[]>(() => {
    if (!leads.data) return []
    const porId = new Map(leads.data.map((l) => [l.id, l]))
    const usados = new Set<string>()
    const lista: Tarefa[] = []

    for (const l of respondidos) {
      usados.add(l.id)
      lista.push({ chave: `r:${l.id}`, tipo: 'resposta', lead: l, quando: l.ultima_resposta_em!, motivo: `Respondeu ${relativo(l.ultima_resposta_em)}`, mensagem: sugestoes.data?.get(l.id) ?? '' })
    }
    for (const r of reunioes.data ?? []) {
      const l = porId.get(r.lead_id)
      if (!l) continue
      lista.push({ chave: `m:${r.id}`, tipo: 'reuniao', lead: l, reuniao: r, quando: r.data_hora, motivo: `${hora(r.data_hora)} · ${r.tipo}`, mensagem: `Oi! Passando pra confirmar nossa conversa hoje às ${hora(r.data_hora)}. Tudo certo pra você?` })
    }
    for (const f of followups.data ?? []) {
      const l = porId.get(f.lead_id)
      if (!l || usados.has(l.id)) continue
      usados.add(l.id)
      const vencido = new Date(f.agendado_para) < new Date()
      lista.push({
        chave: `f:${f.id}`, tipo: 'followup', lead: l, followup: f, quando: f.agendado_para,
        motivo: `${f.tentativa}ª tentativa · ${vencido ? `venceu ${relativo(f.agendado_para)}` : `hoje às ${hora(f.agendado_para)}`}`,
        mensagem: f.mensagem_sugerida || textoFollowup(f.tentativa, l.nome),
      })
    }
    const novos = leads.data.filter((l) => l.etapa === 'novo' && !usados.has(l.id) && (!l.responsavel || l.responsavel === eu!.email))
    for (const l of novos.slice(0, Math.max(0, meta - (contatosHoje.data ?? 0)) + 3)) {
      lista.push({ chave: `p:${l.id}`, tipo: 'primeiro', lead: l, motivo: l.score_motivos?.[0] ?? 'Novo no radar', mensagem: l.mensagem_inicial ?? '' })
    }
    return lista
  }, [leads.data, respondidos, followups.data, reunioes.data, sugestoes.data, meta, contatosHoje.data, eu])

  const abertas = tarefas.filter((t) => !feitos.has(t.chave))
  const feito = (chave: string) => setFeitos((s) => new Set(s).add(chave))
  const erro = leads.erro ?? followups.erro

  const contatos = contatosHoje.data ?? 0
  const progresso = Math.min(100, Math.round((contatos / meta) * 100))

  return (
    <Pagina
      titulo={`${saudacao()}, ${eu!.nome.split(' ')[0]}.`}
      sub={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      acoes={abertas.length > 0 && (
        <button className="btn-sinal btn-lg" onClick={() => setSequencia(0)}>
          <Play size={16} fill="currentColor" /> Começar sequência <span className="numero opacity-80">{abertas.length}</span>
        </button>
      )}
    >
      {/* Placar do dia */}
      <div className="folha grid grid-cols-3 md:grid-cols-4 mb-8 overflow-hidden">
        <div className="p-4 col-span-3 md:col-span-1 border-b md:border-b-0 md:border-r border-fio">
          <div className="flex items-baseline justify-between">
            <span className="rotulo">Contatos hoje</span>
            <button className="text-xs text-tinta-3 hover:text-tinta" onClick={() => {
              const v = Number(prompt('Meta de contatos por dia', String(meta)))
              if (v > 0) { setMeta(v); try { localStorage.setItem('vp-meta', String(v)) } catch { /* sem storage */ } }
            }}>meta {meta}</button>
          </div>
          <div className="numero text-3xl mt-2">{contatos}<span className="text-tinta-3 text-lg">/{meta}</span></div>
          <div className="h-1 rounded-full bg-realce mt-3 overflow-hidden"><div className={cx('h-full rounded-full transition-all', progresso >= 100 ? 'bg-ok' : 'bg-tinta')} style={{ width: `${progresso}%` }} /></div>
        </div>
        <Placar rotulo="Respostas" valor={tarefas.filter((t) => t.tipo === 'resposta').length} quente />
        <Placar rotulo="Follow-ups" valor={tarefas.filter((t) => t.tipo === 'followup').length} />
        <Placar ultimo rotulo="Reuniões" valor={tarefas.filter((t) => t.tipo === 'reuniao').length} />
      </div>

      <AlertasGestao />
      <AgendaDeHoje />

      {erro && <Erro msg={erro} onTentar={() => { leads.recarregar(); followups.recarregar() }} />}
      {leads.carregando ? <Linhas n={6} /> : abertas.length === 0 ? (
        <div className="folha"><Vazio titulo="Fila zerada." icone={<Check size={18} />}>
          Nada pendente agora. Veja o <Link className="underline" to="/funil">funil</Link> ou rode o radar em Configurações para trazer leads novos.
        </Vazio></div>
      ) : (
        <div className="space-y-8">
          {GRUPOS.map((g) => {
            const itens = abertas.filter((t) => t.tipo === g.tipo)
            if (!itens.length) return null
            return (
              <section key={g.tipo}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  {g.tipo === 'resposta' ? <Sinal /> : <g.icone size={15} className="text-tinta-3" />}
                  <h2 className="font-semibold">{g.titulo}</h2>
                  <span className="numero text-sm text-tinta-3">{itens.length}</span>
                  <span className="hidden md:inline text-sm text-tinta-3 ml-auto">{g.dica}</span>
                </div>
                <ul className="folha divide-y divide-fio overflow-hidden">
                  {itens.map((t) => (
                    <LinhaTarefa key={t.chave} t={t} responsavel={t.lead.responsavel ? nomeDe(t.lead.responsavel) : null}
                      onAbrir={() => nav(`/leads/${t.lead.id}`)}
                      onSequencia={() => setSequencia(abertas.indexOf(t))}
                      onFeito={() => feito(t.chave)} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {sequencia !== null && abertas.length > 0 && (
        <Sequencia tarefas={abertas} inicio={Math.min(sequencia, abertas.length - 1)} onFeito={feito} onFechar={() => setSequencia(null)} />
      )}
    </Pagina>
  )
}

function Placar({ rotulo, valor, quente, ultimo }: { rotulo: string; valor: number; quente?: boolean; ultimo?: boolean }) {
  return (
    <div className={cx('p-4 min-w-0', !ultimo && 'border-r border-fio')}>
      <span className="rotulo block truncate">{rotulo}</span>
      <div className={cx('numero text-3xl mt-2', quente && valor > 0 && 'text-sinal')}>{valor}</div>
    </div>
  )
}

function LinhaTarefa({ t, responsavel, onAbrir, onSequencia, onFeito }: {
  t: Tarefa; responsavel: string | null; onAbrir: () => void; onSequencia: () => void; onFeito: () => void
}) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const [menu, setMenu] = useState(false)

  async function whatsapp(e: React.MouseEvent) {
    e.stopPropagation()
    if (await executar(() => abrirWhatsApp(t.lead, t.mensagem, eu!, t.followup?.id))) onFeito()
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3 hover:bg-realce/50 cursor-pointer" onClick={onAbrir}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{nomeCurto(t.lead.nome)}</span>
          {t.tipo !== 'primeiro' && <EtapaTag etapa={t.lead.etapa} className="hidden sm:inline-flex" />}
        </div>
        <div className="text-[13px] text-tinta-3 truncate mt-0.5">
          <span className={cx(t.tipo === 'resposta' && 'text-sinal', t.tipo === 'followup' && t.motivo.includes('venceu') && 'text-alerta')}>{t.motivo}</span>
          {[t.lead.nicho, t.lead.cidade].filter(Boolean).length > 0 && <> · {[t.lead.nicho, t.lead.cidade].filter(Boolean).join(' · ')}</>}
          {responsavel && <> · {responsavel}</>}
        </div>
      </div>
      {t.tipo === 'primeiro' && <span className="hidden sm:block"><Score v={t.lead.score} /></span>}
      <button className="btn-fantasma btn-sm hidden md:inline-flex opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onSequencia() }} title="Abrir na sequência">
        <Play size={14} />
      </button>
      <button className={t.tipo === 'resposta' ? 'btn-wa btn-sm' : 'btn-sec btn-sm !text-[#1d8f4e] hover:!border-[#1d8f4e]'} onClick={whatsapp}><MessageCircle size={15} /><span className="hidden sm:inline">{t.tipo === 'resposta' ? 'Responder' : 'WhatsApp'}</span></button>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button className="btn-icone w-8 h-8" onClick={() => setMenu((v) => !v)} aria-label="Mais ações"><MoreHorizontal size={16} /></button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-20 w-48 folha shadow-flutua py-1 animate-entra">
              {t.followup && <>
                <ItemMenu onClick={async () => { setMenu(false); if (await executar(() => adiarFollowup(t.followup!.id, new Date(Date.now() + 86400e3)))) { onFeito(); avisar('Follow-up adiado para amanhã') } }}><CalendarClock size={14} /> Adiar 1 dia</ItemMenu>
                <ItemMenu onClick={async () => { setMenu(false); if (await executar(() => pularFollowup(t.followup!.id), 'Follow-up pulado')) onFeito() }}><ArrowRight size={14} /> Pular follow-up</ItemMenu>
              </>}
              {!t.followup && <ItemMenu onClick={() => { setMenu(false); onFeito() }}><ArrowRight size={14} /> Tirar da fila de hoje</ItemMenu>}
              {t.tipo === 'primeiro' && (
                <ItemMenu onClick={async () => {
                  setMenu(false)
                  if (await executar(() => mudarEtapa(t.lead.id, 'descartado'))) {
                    onFeito()
                    avisar('Lead descartado', 'ok', { nome: 'Desfazer', fn: () => executar(() => mudarEtapa(t.lead.id, 'novo')) })
                  }
                }}><Trash2 size={14} /> Descartar lead</ItemMenu>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function ItemMenu({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-realce" onClick={onClick}>{children}</button>
}

/* Modo sequência: um lead por vez, com a mensagem pronta e atalhos de teclado.
   Enter abre o WhatsApp e já passa para o próximo. */
function Sequencia({ tarefas, inicio, onFeito, onFechar }: { tarefas: Tarefa[]; inicio: number; onFeito: (c: string) => void; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const nav = useNavigate()
  const [lista] = useState(tarefas) // fila congelada: o Realtime não embaralha o que está na tela
  const [i, setI] = useState(inicio)
  const [feitosAqui, setFeitosAqui] = useState(0)
  const t = lista[i]
  const [texto, setTexto] = useState(t?.mensagem ?? '')
  const ocupado = useRef(false)

  useEffect(() => { setTexto(lista[i]?.mensagem ?? '') }, [i, lista])

  const proximo = () => (i + 1 < lista.length ? setI(i + 1) : (avisar(`Sequência concluída: ${feitosAqui} contatos.`), onFechar()))

  async function enviar() {
    if (!t || ocupado.current) return
    ocupado.current = true
    const ok = await executar(() => abrirWhatsApp(t.lead, texto, eu!, t.followup?.id))
    ocupado.current = false
    if (ok) { onFeito(t.chave); setFeitosAqui((n) => n + 1); proximo() }
  }
  async function pular() {
    if (!t) return
    if (t.followup) await executar(() => adiarFollowup(t.followup!.id, new Date(Date.now() + 86400e3)))
    proximo()
  }
  async function descartar() {
    if (!t || t.tipo !== 'primeiro') return
    if (await executar(() => mudarEtapa(t.lead.id, 'descartado'))) { onFeito(t.chave); proximo() }
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const emTexto = (e.target as HTMLElement).tagName === 'TEXTAREA'
      if (e.key === 'Enter' && (!emTexto || e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar() }
      if (emTexto) return
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'p') { e.preventDefault(); pular() }
      if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
      if (e.key.toLowerCase() === 'd') descartar()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  if (!t) return null
  const grupo = GRUPOS.find((g) => g.tipo === t.tipo)!
  const l = t.lead

  return (
    <Modal largura="max-w-2xl" onFechar={onFechar} titulo={
      <span className="flex items-center gap-3">
        <span className="numero text-sm text-tinta-3">{i + 1}/{lista.length}</span>
        <span className="h-1 w-24 md:w-40 rounded-full bg-realce overflow-hidden"><span className="block h-full bg-tinta transition-all" style={{ width: `${((i + 1) / lista.length) * 100}%` }} /></span>
        <span className="rotulo hidden sm:inline">{grupo.titulo}</span>
      </span>
    } rodape={<>
      <button className="btn-fantasma mr-auto" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft size={16} /> <span className="hidden sm:inline">Anterior</span></button>
      {t.tipo === 'primeiro' && <button className="btn-sec" onClick={descartar}>Descartar <span className="tecla hidden md:inline-flex">D</span></button>}
      <button className="btn-sec" onClick={pular}>{t.followup ? 'Adiar' : 'Pular'} <span className="tecla hidden md:inline-flex">→</span></button>
      <button className="btn-wa" onClick={enviar}><MessageCircle size={16} /> Abrir WhatsApp <span className="tecla hidden md:inline-flex !bg-white/15 !border-white/20 !text-white">Enter</span></button>
    </>}>
      <div key={t.chave} className="animate-entra">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button className="text-xl font-semibold hover:underline text-left" onClick={() => { onFechar(); nav(`/leads/${l.id}`) }}>{nomeCurto(l.nome)}</button>
            <div className="text-sm text-tinta-3 mt-0.5">{[l.nicho, l.cidade].filter(Boolean).join(' · ')}{l.rating ? ` · nota ${String(l.rating).replace('.', ',')} (${l.avaliacoes})` : ''}</div>
          </div>
          <div className="text-right shrink-0"><EtapaTag etapa={l.etapa} /><div className="mt-1.5"><Score v={l.score} /></div></div>
        </div>

        <div className={cx('mt-4 text-sm', t.tipo === 'resposta' ? 'text-sinal' : 'text-tinta-2')}>{t.motivo}</div>
        {t.tipo === 'primeiro' && l.score_motivos?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">{l.score_motivos.map((m) => <span key={m} className="font-mono text-[11px] px-2 py-1 rounded bg-realce text-tinta-2">{m}</span>)}</div>
        )}

        <label className="block mt-5">
          <span className="lbl flex justify-between"><span>Mensagem</span><span className="normal-case tracking-normal">{'{vendedor}'} vira {eu!.nome.split(' ')[0]}</span></span>
          <textarea className="inp text-[15px]" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder={t.tipo === 'resposta' ? 'Leia a conversa e responda. A avaliação com IA na página do lead sugere a próxima mensagem.' : ''} />
        </label>
        <p className="hidden md:block text-xs text-tinta-3 mt-4">
          <span className="tecla">Enter</span> abre o WhatsApp e avança · <span className="tecla">→</span> {t.followup ? 'adia 1 dia' : 'pula'} · <span className="tecla">←</span> volta · dentro do texto use <span className="tecla">Ctrl Enter</span>
        </p>
      </div>
    </Modal>
  )
}

/* O que a aba Agenda tem hoje para quem está logado (ou sem dono). */
function AgendaDeHoje() {
  const { eu } = useSessao()
  const executar = useExecutar()
  const nav = useNavigate()
  const itens = useConsulta(`hoje:agenda:${eu!.email}`, () => carregarHoje(eu!.email), ['agenda'])
  const lista = itens.data ?? []
  if (!lista.length) return null
  const faltam = lista.filter((i) => !concluido(i)).length
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2.5 mb-2.5">
        <h2 className="font-semibold">Na agenda de hoje</h2>
        <span className="numero text-sm text-tinta-3">{faltam ? `${faltam} a fazer` : 'tudo feito'}</span>
        <button className="ml-auto text-sm text-tinta-3 hover:text-tinta" onClick={() => nav('/agenda')}>Abrir agenda</button>
      </div>
      <ul className="folha divide-y divide-fio overflow-hidden">
        {lista.map((i: ItemAgenda) => {
          const prox = proximoStatus(i)
          const feito = concluido(i)
          return (
            <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={cx('w-2 h-2 rounded-full shrink-0', ehConteudo(i.tipo) ? 'bg-sinal' : 'bg-tinta', feito && 'opacity-30')} />
              <div className="flex-1 min-w-0">
                <div className={cx('text-sm truncate', feito && 'line-through text-tinta-3')}>{i.titulo}</div>
                <div className="text-xs text-tinta-3">{[i.hora?.slice(0, 5), i.plataforma, ehConteudo(i.tipo) ? i.status : null].filter(Boolean).join(' · ')}</div>
              </div>
              {prox && (
                <button className="btn-sec btn-sm" onClick={() => executar(() => mudarStatus(i.id, prox))}>
                  {ehConteudo(i.tipo) ? <>Marcar {prox}</> : <><Check size={13} /> Feito</>}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* O que a gestão pede hoje: dinheiro a receber ou pagar e entrega perto do prazo. */
function AlertasGestao() {
  const nav = useNavigate()
  const hoje = new Date().toLocaleDateString('sv-SE')
  const em3 = new Date(Date.now() + 3 * 86400e3).toLocaleDateString('sv-SE')
  const dados = useConsulta('hoje:gestao', async () => {
    const [lancs, projetos] = await Promise.all([
      q<Lancamento[]>(supabase.from('fin_lancamentos').select('*').is('pago_em', null).lte('vencimento', hoje)),
      q<{ id: string; nome: string; prazo: string; cliente: { nome: string } | null }[]>(supabase.from('projetos').select('id, nome, prazo, cliente:clientes(nome)').not('etapa', 'in', '(no_ar,manutencao,pausado)').lte('prazo', em3)),
    ])
    return { lancs, projetos }
  }, ['fin', 'projetos'])
  if (!dados.data) return null
  const receber = dados.data.lancs.filter((l) => l.tipo === 'receita')
  const pagar = dados.data.lancs.filter((l) => l.tipo === 'despesa')
  const itens = [
    receber.length > 0 && { chave: 'r', texto: `${receber.length} ${receber.length === 1 ? 'cobrança' : 'cobranças'} para receber`, valor: brl(receber.reduce((s, l) => s + +l.valor, 0)), quente: receber.some((l) => situacao(l) === 'atrasado'), ir: '/financeiro' },
    pagar.length > 0 && { chave: 'p', texto: `${pagar.length} ${pagar.length === 1 ? 'conta' : 'contas'} para pagar`, valor: brl(pagar.reduce((s, l) => s + +l.valor, 0)), quente: pagar.some((l) => situacao(l) === 'atrasado'), ir: '/financeiro' },
    ...dados.data.projetos.map((p) => ({ chave: p.id, texto: `${p.nome}${p.cliente ? ` · ${p.cliente.nome}` : ''}`, valor: p.prazo < hoje ? 'prazo vencido' : p.prazo === hoje ? 'entrega hoje' : `entrega ${new Date(p.prazo + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short' })}`, quente: p.prazo < hoje, ir: '/projetos' })),
  ].filter(Boolean) as { chave: string; texto: string; valor: string; quente: boolean; ir: string }[]
  if (!itens.length) return null
  return (
    <section className="mb-8">
      <h2 className="font-semibold mb-2.5">Gestão</h2>
      <ul className="folha divide-y divide-fio overflow-hidden">
        {itens.map((i) => (
          <li key={i.chave}><button onClick={() => nav(i.ir)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-realce/50">
            <span className={cx('w-2 h-2 rounded-full shrink-0', i.quente ? 'bg-sinal' : 'bg-alerta')} />
            <span className="flex-1 text-sm truncate">{i.texto}</span>
            <span className={cx('text-sm numero', i.quente ? 'text-sinal' : 'text-tinta-2')}>{i.valor}</span>
          </button></li>
        ))}
      </ul>
    </section>
  )
}
