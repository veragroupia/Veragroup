import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, ExternalLink, AtSign, Globe, MapPin, MessageCircle, MoreHorizontal, Phone, Sparkles, Star } from 'lucide-react'
import { supabase, chamarFuncao } from '../lib/supabase'
import { invalidar, q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { abrirWhatsApp, agendarFollowup, atualizarLead, pularFollowup } from '../lib/acoes'
import { ETAPAS, ETAPAS_ENCERRADAS, type Avaliacao, type Followup, type Lead, type Mensagem } from '../lib/tipos'
import { brl, cx, dataHora, diasDesde, nomeCurto, relativo, telefoneBonito } from '../lib/util'
import { useAviso, useExecutar } from '../components/Aviso'
import { useMudarEtapa } from '../components/MudarEtapa'
import { Abas, Campo, Erro, Esqueleto, EtapaTag, Modal, Score } from '../components/ui'
import { Conversa } from '../components/lead/Conversa'
import { Avaliacoes } from '../components/lead/Avaliacoes'
import { Reunioes } from '../components/lead/Reunioes'
import { Historico } from '../components/lead/Historico'

type Aba = 'conversa' | 'avaliacao' | 'reunioes' | 'historico'

export default function LeadDetalhe() {
  const { id } = useParams<{ id: string }>()
  const lead = useConsulta(`lead:${id}`, () => q<Lead>(supabase.from('leads').select('*').eq('id', id!).single()), ['leads'])
  const msgs = useConsulta(`lead:${id}:msgs`, () => q<Mensagem[]>(supabase.from('mensagens').select('*').eq('lead_id', id!).order('enviada_em')), ['mensagens'])
  const fus = useConsulta(`lead:${id}:fu`, () => q<Followup[]>(supabase.from('followups').select('*').eq('lead_id', id!).order('agendado_para', { ascending: false })), ['followups'])
  const avs = useConsulta(`lead:${id}:av`, () => q<Avaliacao[]>(supabase.from('avaliacoes').select('*').eq('lead_id', id!).order('created_at', { ascending: false })), ['avaliacoes'])
  const [aba, setAba] = useState<Aba>('conversa')

  if (lead.erro) return <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8"><Erro msg={lead.erro} onTentar={lead.recarregar} /></div>
  if (!lead.data) return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-4">
      <Esqueleto className="h-5 w-24" /><Esqueleto className="h-9 w-80" /><Esqueleto className="h-10 w-full" />
      <div className="grid lg:grid-cols-[1fr_340px] gap-6"><Esqueleto className="h-96" /><Esqueleto className="h-96" /></div>
    </div>
  )

  const l = lead.data
  const pendente = (fus.data ?? []).filter((f) => f.status === 'pendente').sort((a, b) => +new Date(a.agendado_para) - +new Date(b.agendado_para))[0]
  const ultimaAv = avs.data?.[0]
  const mensagens = msgs.data ?? []
  const sugerida = (() => {
    if (pendente?.mensagem_sugerida) return { texto: pendente.mensagem_sugerida, origem: 'Sugestão do follow-up' }
    if (ultimaAv?.proxima_mensagem && (!mensagens.length || new Date(ultimaAv.created_at) >= new Date(mensagens[mensagens.length - 1].enviada_em)))
      return { texto: ultimaAv.proxima_mensagem, origem: 'Sugestão da IA' }
    if (!mensagens.length && l.mensagem_inicial) return { texto: l.mensagem_inicial, origem: 'Primeira mensagem do radar' }
    return null
  })()

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-12 animate-entra">
      <Cabecalho l={l} sugerida={sugerida} followupId={pendente?.id} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-6">
        <div className="min-w-0">
          <Abas valor={aba} onChange={setAba} abas={[
            { id: 'conversa', nome: <>Conversa <span className="numero text-xs text-tinta-3">{mensagens.length || ''}</span></> },
            { id: 'avaliacao', nome: <>Avaliação IA {ultimaAv?.nota_geral != null && <span className="numero text-xs text-tinta-3">{String(ultimaAv.nota_geral).replace('.', ',')}</span>}</> },
            { id: 'reunioes', nome: 'Reuniões' },
            { id: 'historico', nome: 'Histórico' },
          ]} />
          <div className="pt-4">
            {aba === 'conversa' && <Conversa lead={l} mensagens={mensagens} carregando={msgs.carregando} sugerida={sugerida} followupId={pendente?.id} />}
            {aba === 'avaliacao' && <Avaliacoes lead={l} avaliacoes={avs.data} temMensagens={mensagens.length > 0} />}
            {aba === 'reunioes' && <Reunioes lead={l} />}
            {aba === 'historico' && <Historico leadId={l.id} followups={fus.data ?? []} />}
          </div>
        </div>
        <Lateral l={l} pendente={pendente} />
      </div>
    </div>
  )
}

function Cabecalho({ l, sugerida, followupId }: { l: Lead; sugerida: { texto: string } | null; followupId?: string }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const nav = useNavigate()
  const { mudar, dialogo } = useMudarEtapa()
  const [menu, setMenu] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const idxAtual = ETAPAS.findIndex((e) => e.id === l.etapa)
  const encerrado = ETAPAS_ENCERRADAS.includes(l.etapa) && l.etapa !== 'fechado'

  async function avaliar() {
    setAvaliando(true)
    const ok = await executar(() => chamarFuncao('avaliar', { lead_id: l.id }))
    setAvaliando(false)
    if (ok) { invalidar('avaliacoes', 'followups'); avisar('Avaliação pronta. Veja a aba Avaliação IA.') }
  }

  return (
    <header>
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/leads'))} className="inline-flex items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta mb-3">
        <ArrowLeft size={15} /> Voltar
      </button>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-[28px] font-semibold leading-tight">{nomeCurto(l.nome)}</h1>
            <Score v={l.score} />
          </div>
          <p className="text-sm text-tinta-3 mt-1">
            {[l.nicho && l.nicho.length <= 40 ? l.nicho : null, l.cidade].filter(Boolean).join(' · ')}
            {' · '}{l.etapa === 'novo' ? `no radar ${relativo(l.created_at)}` : `${ETAPAS[idxAtual]?.nome.toLowerCase()} ${diasDesde(l.etapa_desde) ? `há ${diasDesde(l.etapa_desde)} d` : 'desde hoje'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-sec" onClick={avaliar} disabled={avaliando}><Sparkles size={15} className={cx(avaliando && 'animate-pulsa')} /> {avaliando ? 'Avaliando…' : 'Avaliar'}</button>
          {(l.whatsapp || l.telefone) && (
            <button className="btn-wa" onClick={() => executar(() => abrirWhatsApp(l, sugerida?.texto ?? '', eu!, sugerida ? followupId : undefined))}>
              <MessageCircle size={16} /> WhatsApp
            </button>
          )}
          <div className="relative">
            <button className="btn-icone border border-fio" onClick={() => setMenu((v) => !v)} aria-label="Mais ações"><MoreHorizontal size={16} /></button>
            {menu && <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-11 z-20 w-52 folha shadow-flutua py-1 animate-entra">
                {(['perdido', 'descartado'] as const).filter((e) => e !== l.etapa).map((e) => (
                  <button key={e} className="w-full text-left px-3 py-2 text-sm hover:bg-realce" onClick={() => { setMenu(false); mudar(l, e) }}>
                    Marcar como {e === 'perdido' ? 'perdido' : 'descartado'}
                  </button>
                ))}
                {encerrado && <button className="w-full text-left px-3 py-2 text-sm hover:bg-realce" onClick={() => { setMenu(false); mudar(l, 'novo') }}>Reabrir lead</button>}
                {l.maps_url && <a className="flex items-center justify-between px-3 py-2 text-sm hover:bg-realce" href={l.maps_url} target="_blank" rel="noreferrer">Ver no Google Maps <ExternalLink size={13} /></a>}
              </div>
            </>}
          </div>
        </div>
      </div>

      {/* Etapas clicáveis */}
      {encerrado ? (
        <div className="mt-5 folha px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm"><EtapaTag etapa={l.etapa} />{l.motivo_perda && <span className="text-tinta-3 ml-3">{l.motivo_perda}</span>}</span>
          <button className="btn-sec btn-sm" onClick={() => mudar(l, 'novo')}>Reabrir</button>
        </div>
      ) : (
        <ol className="mt-5 grid grid-cols-6 gap-1" aria-label="Etapa do funil">
          {ETAPAS.filter((e) => e.ativa).map((e, i) => {
            const feito = i < idxAtual, atual = i === idxAtual
            return (
              <li key={e.id}>
                <button onClick={() => mudar(l, e.id)} title={`Mover para ${e.nome}`}
                  className={cx('group w-full text-left pt-2 border-t-[3px] transition-colors',
                    atual ? 'border-tinta' : feito ? 'border-tinta-3/60 hover:border-tinta-3' : 'border-fio hover:border-tinta-3')}>
                  <span className={cx('block font-mono text-[10px] md:text-[11px] uppercase tracking-wider truncate', atual ? 'text-tinta font-medium' : 'text-tinta-3 group-hover:text-tinta-2')}>{e.nome}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {dialogo}
    </header>
  )
}

function Lateral({ l, pendente }: { l: Lead; pendente?: Followup }) {
  const { equipe, nomeDe } = useSessao()
  const executar = useExecutar()
  const [agendar, setAgendar] = useState(false)

  return (
    <aside className="space-y-4 min-w-0">
      {/* Próximo passo */}
      <section className="folha p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="rotulo">Próximo passo</h2>
          <button className="btn-fantasma btn-sm -mr-2" onClick={() => setAgendar(true)}><CalendarPlus size={14} /> Agendar</button>
        </div>
        {pendente ? (
          <div>
            <div className={cx('text-sm font-medium', new Date(pendente.agendado_para) < new Date() && 'text-alerta')}>
              Follow-up {relativo(pendente.agendado_para)} <span className="text-tinta-3 font-normal">· {dataHora(pendente.agendado_para)}</span>
            </div>
            <div className="text-xs text-tinta-3 mt-0.5">{pendente.motivo ?? 'Retorno'} · {pendente.tentativa}ª tentativa</div>
            <button className="text-xs text-tinta-3 underline underline-offset-2 hover:text-tinta mt-2" onClick={() => executar(() => pularFollowup(pendente.id), 'Follow-up cancelado')}>Cancelar este follow-up</button>
          </div>
        ) : (
          <p className="text-sm text-tinta-3">Nada agendado.{!ETAPAS_ENCERRADAS.includes(l.etapa) && ' Agende um retorno para o lead não esfriar.'}</p>
        )}
      </section>

      {/* Contato */}
      <section className="folha divide-y divide-fio">
        <Info icone={Phone} rotulo="WhatsApp">{l.whatsapp || l.telefone ? telefoneBonito(l.whatsapp ?? l.telefone) : null}</Info>
        {l.whatsapp && l.telefone && telefoneBonito(l.telefone) !== telefoneBonito(l.whatsapp) && <Info icone={Phone} rotulo="Telefone">{telefoneBonito(l.telefone)}</Info>}
        <Info icone={AtSign} rotulo="Instagram">{l.instagram && <a className="underline underline-offset-2 break-all" href={l.instagram.startsWith('http') ? l.instagram : `https://instagram.com/${l.instagram.replace('@', '')}`} target="_blank" rel="noreferrer">{l.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}</a>}</Info>
        <Info icone={Globe} rotulo="Site">{l.site && !l.site.includes('instagram') ? <a className="underline underline-offset-2 break-all" href={l.site} target="_blank" rel="noreferrer">{l.site.replace(/^https?:\/\//, '')}</a> : <span className="text-sinal">Não tem</span>}</Info>
        <Info icone={Star} rotulo="Google">{l.rating ? <>{String(l.rating).replace('.', ',')} <span className="text-tinta-3">· {l.avaliacoes} avaliações</span></> : null}</Info>
        <Info icone={MapPin} rotulo="Endereço">{l.endereco && (l.maps_url ? <a className="hover:underline" href={l.maps_url} target="_blank" rel="noreferrer">{l.endereco}</a> : l.endereco)}</Info>
      </section>

      {/* Por que este lead */}
      {l.score_motivos?.length > 0 && (
        <section className="folha p-4">
          <h2 className="rotulo mb-2.5">Por que é um bom lead</h2>
          <ul className="space-y-1.5">{l.score_motivos.map((m) => <li key={m} className="text-sm flex gap-2"><span className="text-sinal">+</span>{m}</li>)}</ul>
        </section>
      )}

      {/* Negócio */}
      <section className="folha p-4 space-y-4">
        <Campo rotulo="Responsável">
          <select className="inp" value={l.responsavel ?? ''} onChange={(e) => executar(() => atualizarLead(l.id, { responsavel: e.target.value || null }), 'Responsável atualizado')}>
            <option value="">Ninguém</option>
            {equipe.filter((m) => m.ativo || m.email === l.responsavel).map((m) => <option key={m.email} value={m.email}>{nomeDe(m.email)}</option>)}
          </select>
        </Campo>
        {(l.etapa === 'proposta' || l.etapa === 'fechado' || l.plano) && <Valores l={l} />}
        <Observacoes l={l} />
      </section>

      {agendar && <AgendarFollowup lead={l} onFechar={() => setAgendar(false)} />}
    </aside>
  )
}

function Info({ icone: I, rotulo, children }: { icone: typeof Phone; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 text-sm">
      <I size={15} className="text-tinta-3 mt-0.5 shrink-0" />
      <span className="rotulo w-20 shrink-0 pt-0.5">{rotulo}</span>
      <span className="min-w-0 flex-1">{children || <span className="text-tinta-3">-</span>}</span>
    </div>
  )
}

function Valores({ l }: { l: Lead }) {
  const executar = useExecutar()
  const salvar = (campo: 'plano' | 'valor_setup' | 'valor_mensal', v: string) => {
    const valor = campo === 'plano' ? v.trim() || null : Number(v.replace(',', '.')) || null
    if (valor !== l[campo]) executar(() => atualizarLead(l.id, { [campo]: valor }))
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      <Campo rotulo="Plano" className="col-span-2"><input className="inp" defaultValue={l.plano ?? ''} onBlur={(e) => salvar('plano', e.target.value)} placeholder="Ex.: Landing page" /></Campo>
      <Campo rotulo="Setup"><input className="inp numero" inputMode="decimal" defaultValue={l.valor_setup ?? ''} onBlur={(e) => salvar('valor_setup', e.target.value)} placeholder={brl(690)} /></Campo>
      <Campo rotulo="Mensal"><input className="inp numero" inputMode="decimal" defaultValue={l.valor_mensal ?? ''} onBlur={(e) => salvar('valor_mensal', e.target.value)} placeholder={brl(97)} /></Campo>
    </div>
  )
}

/** Salva sozinho, um instante depois de parar de digitar. */
function Observacoes({ l }: { l: Lead }) {
  const [texto, setTexto] = useState(l.observacoes ?? '')
  const [estado, setEstado] = useState<'' | 'salvando' | 'salvo'>('')
  const ultimo = useRef(l.observacoes ?? '')

  useEffect(() => {
    if (texto === ultimo.current) return
    const t = setTimeout(async () => {
      setEstado('salvando')
      const { error } = await supabase.from('leads').update({ observacoes: texto || null }).eq('id', l.id)
      if (!error) { ultimo.current = texto; setEstado('salvo'); invalidar('leads') } else setEstado('')
    }, 700)
    return () => clearTimeout(t)
  }, [texto, l.id])

  return (
    <label className="block">
      <span className="lbl flex justify-between"><span>Observações</span><span className="normal-case tracking-normal">{estado === 'salvando' ? 'salvando…' : estado === 'salvo' ? 'salvo' : ''}</span></span>
      <textarea className="inp" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Quem é o dono, melhor horário, o que já foi conversado" />
    </label>
  )
}

function AgendarFollowup({ lead, onFechar }: { lead: Lead; onFechar: () => void }) {
  const executar = useExecutar()
  const atalhos = [{ n: 'Amanhã', d: 1 }, { n: 'Em 2 dias', d: 2 }, { n: 'Em 1 semana', d: 7 }]
  const amanha = new Date(Date.now() + 86400e3)
  amanha.setHours(10, 0, 0, 0)
  const [quando, setQuando] = useState(toLocal(amanha))
  const [motivo, setMotivo] = useState('Retomar conversa')
  const [mensagem, setMensagem] = useState('')

  async function salvar() {
    if (await executar(() => agendarFollowup(lead.id, new Date(quando), motivo, mensagem), 'Follow-up agendado')) onFechar()
  }

  return (
    <Modal titulo={`Agendar retorno · ${nomeCurto(lead.nome)}`} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" onClick={salvar}>Agendar</button></>}>
      <div className="space-y-4">
        <div className="flex gap-1.5">{atalhos.map((a) => {
          const d = new Date(Date.now() + a.d * 86400e3); d.setHours(10, 0, 0, 0)
          return <button key={a.n} className={quando === toLocal(d) ? 'btn-pri btn-sm' : 'btn-sec btn-sm'} onClick={() => setQuando(toLocal(d))}>{a.n}</button>
        })}</div>
        <Campo rotulo="Data e hora"><input type="datetime-local" className="inp" value={quando} onChange={(e) => setQuando(e.target.value)} /></Campo>
        <Campo rotulo="Motivo"><input className="inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
        <Campo rotulo="Mensagem a enviar (opcional)" dica="Aparece pronta na fila de Hoje no dia do retorno."><textarea className="inp" rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></Campo>
      </div>
    </Modal>
  )
}

function toLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

