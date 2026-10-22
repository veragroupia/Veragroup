import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { ETAPAS, type Etapa, type Lead } from '../lib/tipos'
import { brl, cx, diasDesde, nomeCurto, relativo } from '../lib/util'
import { useMudarEtapa } from '../components/MudarEtapa'
import { Avatar, Erro, Esqueleto, Pagina, Score, Segmentos } from '../components/ui'
import { carregarIntel, FUNDO_TEMPERATURA, NOME_TEMPERATURA } from '../lib/inteligencia'

type Card = Pick<Lead, 'id' | 'nome' | 'nicho' | 'cidade' | 'score' | 'etapa' | 'etapa_desde' | 'responsavel' | 'proximo_followup_em' | 'valor_mensal' | 'valor_setup' | 'ultima_resposta_em' | 'ultimo_contato_em'>
const CAMPOS = 'id, nome, nicho, cidade, score, etapa, etapa_desde, responsavel, proximo_followup_em, valor_mensal, valor_setup, ultima_resposta_em, ultimo_contato_em'
const LIMITE_COLUNA = 40

export default function Funil() {
  const { eu, nomeDe } = useSessao()
  const nav = useNavigate()
  const [quem, setQuem] = useState<'todos' | 'meus'>(() => (localStorage.getItem('vp-funil-quem') as 'meus') ?? 'todos')
  const [encerrados, setEncerrados] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [alvo, setAlvo] = useState<Etapa | null>(null)
  const { mudar, dialogo } = useMudarEtapa()

  const leads = useConsulta('funil', () => q<Card[]>(supabase.from('leads').select(CAMPOS).order('score', { ascending: false }).limit(2000)), ['leads'])
  const intel = useConsulta('funil:intel', () => carregarIntel(), ['lead_inteligencia'])

  const colunas = useMemo(() => {
    const visiveis = ETAPAS.filter((e) => e.ativa || encerrados)
    const base = (leads.data ?? []).filter((l) => quem === 'todos' || l.responsavel === eu!.email)
    return visiveis.map((e) => {
      const itens = base.filter((l) => l.etapa === e.id)
      if (e.id !== 'novo') itens.sort((a, b) => +new Date(b.etapa_desde) - +new Date(a.etapa_desde))
      return { ...e, itens, mensal: itens.reduce((s, l) => s + (l.valor_mensal ?? 0), 0) }
    })
  }, [leads.data, quem, encerrados, eu])

  const total = colunas.filter((c) => c.ativa).reduce((s, c) => s + c.itens.length, 0)
  const proxima = (e: Etapa) => { const i = ETAPAS.findIndex((x) => x.id === e); return i >= 0 && i < 5 ? ETAPAS[i + 1].id : null }

  function soltar(etapa: Etapa) {
    const l = leads.data?.find((x) => x.id === arrastando)
    setArrastando(null); setAlvo(null)
    if (l) mudar(l, etapa)
  }

  return (
    <Pagina titulo="Funil" largura="max-w-none" sub={`${total} leads em andamento. Arraste um cartão para mudar de etapa.`}
      acoes={<>
        <button className="btn-fantasma btn-sm" onClick={() => setEncerrados((v) => !v)}>{encerrados ? 'Esconder' : 'Mostrar'} perdidos e descartados</button>
        <Segmentos valor={quem} onChange={(v) => { setQuem(v); localStorage.setItem('vp-funil-quem', v) }} opcoes={[{ id: 'todos', nome: 'Todos' }, { id: 'meus', nome: 'Meus' }]} />
      </>}>
      {leads.erro && <Erro msg={leads.erro} onTentar={leads.recarregar} />}
      <div className="-mx-4 md:-mx-8 px-4 md:px-8 overflow-x-auto rolagem-fina snap-x snap-mandatory md:snap-none pb-4">
        <div className="flex gap-3 min-w-max items-start">
          {colunas.map((c) => (
            <section key={c.id}
              onDragOver={(e) => { if (arrastando) { e.preventDefault(); setAlvo(c.id) } }}
              onDragLeave={() => setAlvo((a) => (a === c.id ? null : a))}
              onDrop={() => soltar(c.id)}
              className={cx('snap-start w-[82vw] sm:w-72 shrink-0 rounded-lg border transition-colors flex flex-col max-h-[calc(100vh-190px)]',
                alvo === c.id ? 'border-tinta bg-realce' : 'border-fio bg-realce/40')}>
              <header className="px-3 pt-3 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={cx('w-2 h-2 rounded-full', c.cor)} />
                  <h2 className="font-semibold text-sm">{c.nome}</h2>
                  <span className="numero text-xs text-tinta-3 ml-auto">{c.itens.length}</span>
                </div>
                {c.mensal > 0 && <div className="numero text-xs text-tinta-3 mt-1">{brl(c.mensal)}/mês</div>}
              </header>
              <div className="px-2 pb-2 space-y-1.5 overflow-y-auto rolagem-fina">
                {leads.carregando && Array.from({ length: 3 }, (_, i) => <Esqueleto key={i} className="h-20" />)}
                {c.itens.slice(0, LIMITE_COLUNA).map((l) => {
                  const esperando = l.ultima_resposta_em && (!l.ultimo_contato_em || l.ultima_resposta_em > l.ultimo_contato_em)
                  const dias = diasDesde(l.etapa_desde)
                  const prox = proxima(l.etapa)
                  const li = intel.data?.get(l.id)
                  const temp = li?.temperatura_manual ?? li?.temperatura ?? null
                  return (
                    <article key={l.id} draggable
                      onDragStart={(e) => { setArrastando(l.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => { setArrastando(null); setAlvo(null) }}
                      onClick={() => nav(`/leads/${l.id}`)}
                      className={cx('group bg-folha border border-fio rounded p-3 cursor-pointer hover:border-tinta-3 transition-[border-color,opacity]',
                        arrastando === l.id && 'opacity-40')}>
                      <div className="flex items-start gap-2">
                        <h3 className="text-sm font-medium leading-snug flex-1 min-w-0 line-clamp-2">{nomeCurto(l.nome)}</h3>
                        {esperando && <span className="w-2 h-2 rounded-full bg-sinal mt-1.5 shrink-0" title="Respondeu e espera retorno" />}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-tinta-3 mt-1 min-w-0">
                        {temp && <span className="inline-flex items-center gap-1 shrink-0" title={`Temperatura${li?.temperatura_manual ? ' (definida pela equipe)' : ''}${li?.score_interesse != null ? ` · interesse ${li.score_interesse}` : ''}`}><span className={cx('w-1.5 h-1.5 rounded-full', FUNDO_TEMPERATURA[temp])} />{NOME_TEMPERATURA[temp]}</span>}
                        <span className="truncate">{[l.nicho, l.cidade].filter(Boolean).join(' · ')}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5 text-xs text-tinta-3">
                        {c.id === 'novo' ? <Score v={l.score} /> : (
                          <span className={cx('numero', dias >= 7 && 'text-alerta')} title="Dias nesta etapa">{dias}d</span>
                        )}
                        {l.proximo_followup_em && <span className="inline-flex items-center gap-1"><Clock size={11} />{relativo(l.proximo_followup_em)}</span>}
                        {l.valor_mensal ? <span className="numero">{brl(l.valor_mensal)}</span> : null}
                        <span className="ml-auto flex items-center gap-1">
                          {l.responsavel && <span title={nomeDe(l.responsavel)}><Avatar nome={nomeDe(l.responsavel)} tamanho="sm" /></span>}
                          {prox && (
                            <button title={`Avançar para ${ETAPAS.find((e) => e.id === prox)!.nome}`} onClick={(e) => { e.stopPropagation(); mudar(l, prox) }}
                              className="w-6 h-6 grid place-items-center rounded text-tinta-3 hover:bg-realce hover:text-tinta md:opacity-0 group-hover:opacity-100">
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </span>
                      </div>
                    </article>
                  )
                })}
                {c.itens.length > LIMITE_COLUNA && (
                  <Link to={`/leads?etapa=${c.id}`} className="block text-center text-xs text-tinta-3 hover:text-tinta py-2">
                    + {c.itens.length - LIMITE_COLUNA} em Leads
                  </Link>
                )}
                {!leads.carregando && c.itens.length === 0 && <p className="text-xs text-tinta-3 text-center py-6">Vazio</p>}
              </div>
            </section>
          ))}
        </div>
      </div>
      {dialogo}
    </Pagina>
  )
}
