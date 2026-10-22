import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarCheck, CalendarClock, Check, ChevronDown, Clock, FileText, Flame, Hourglass, MessageCircle, MoreHorizontal, Play, Reply, Sparkles, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { invalidar, q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { adiarFollowup, confirmarEnvio, marcarNaoEnviado, mudarEtapa, pularFollowup } from '../lib/acoes'
import type { Followup, Lead, Mensagem, RascunhoIA, Reuniao } from '../lib/tipos'
import { brl, cx, fimDoDia, hora, inicioDoDia, nomeCurto, preencher as preencherVendedor, relativo, saudacao } from '../lib/util'
import { carregarHoje, concluido, ehConteudo, mudarStatus, proximoStatus, type ItemAgenda } from '../lib/agenda'
import { situacao, type Lancamento } from '../lib/gestao'
import { ERRO_GERAL, prepararEmLote } from '../lib/lote'
import {
  analisar, avaliarNoPainel, carregarIntel, hashAtual, NOME_ACAO, opcaoEscolhida, pausarPreparoAuto, rascunhoObsoleto, textoRecomendado, useBloqueios, useConfigComercial,
  type Acao, type JanelaContato, type LeadIntel, type Temperatura,
} from '../lib/inteligencia'
import { classificarHoje, ordenarHoje, type GrupoHoje, type ItemHoje } from '../../supabase/functions/_shared/inteligencia/hoje.ts'
import { useAviso, useExecutar } from '../components/Aviso'
import { useEnviosAbertos } from '../components/ConfirmarEnvios'
import { useAbrirWhatsApp } from '../components/useWhatsApp'
import { Temperatura as TagTemperatura } from '../components/lead/Inteligencia'
import { Erro, EtapaTag, Linhas, Modal, Pagina, Score, Sinal, Vazio } from '../components/ui'

type LeadMin = Pick<Lead, 'id' | 'nome' | 'nicho' | 'cidade' | 'telefone' | 'whatsapp' | 'place_id' | 'score' | 'score_motivos' | 'etapa' | 'responsavel' | 'ultimo_contato_em' | 'ultima_resposta_em' | 'rating' | 'avaliacoes' | 'site' | 'instagram' | 'observacoes' | 'motivo_perda'>
const CAMPOS = 'id, nome, nicho, cidade, telefone, whatsapp, place_id, score, score_motivos, etapa, responsavel, ultimo_contato_em, ultima_resposta_em, rating, avaliacoes, site, instagram, observacoes, motivo_perda'
type MsgMin = Pick<Mensagem, 'id' | 'lead_id' | 'direcao' | 'texto' | 'enviada_em' | 'confirmada' | 'origem'>

/** Situação da mensagem de cada item da fila. */
type SituacaoMsg = 'aprovada' | 'pronta' | 'revisar' | 'preparar' | 'nao_enviar' | 'aberta' | 'reuniao' | 'sem_conversa'
const NOME_SITUACAO: Record<SituacaoMsg, string> = {
  aprovada: 'Mensagem aprovada', pronta: 'Rascunho pronto', revisar: 'Rascunho para revisar', preparar: 'Sem rascunho para a conversa de agora',
  nao_enviar: 'Não enviar agora', aberta: 'WhatsApp aberto, envio ainda não confirmado', reuniao: 'Confirmação da reunião pronta',
  sem_conversa: 'Conversa não registrada no painel: registre ou importe antes de a IA sugerir',
}
const COR_SITUACAO: Record<SituacaoMsg, string> = { aprovada: 'text-ok', pronta: 'text-ok', revisar: 'text-alerta', preparar: 'text-tinta-3', nao_enviar: 'text-tinta-3', aberta: 'text-alerta', reuniao: 'text-ok', sem_conversa: 'text-alerta' }

interface Tarefa {
  chave: string
  grupo: GrupoHoje
  lead: LeadMin
  item: ItemHoje
  motivo: string
  mensagem: string
  temperatura: Temperatura | null
  acao: Acao | null
  /** A decisão comercial permite escrever agora. */
  gerarMensagem: boolean
  situacaoMsg: SituacaoMsg
  janela: JanelaContato | null
  ultimaInteracao: string | null
  /** Taxa de resposta do segmento, quando há casos suficientes. */
  segmento: { pct: number; n: number } | null
  followup?: Followup
  reuniao?: Reuniao
  rascunho?: { id: string; variante: 'a' | 'b' }
}

const GRUPOS: { grupo: GrupoHoje; titulo: string; dica: string; icone: typeof Reply; recolhido?: boolean }[] = [
  { grupo: 'compromisso', titulo: 'Compromissos e retornos combinados', dica: 'O que foi combinado com o cliente vem primeiro.', icone: CalendarCheck },
  { grupo: 'resposta', titulo: 'Esperando a sua resposta', dica: 'O cliente escreveu por último.', icone: Reply },
  { grupo: 'proposta', titulo: 'Propostas pendentes', dica: 'Rascunho sem enviar ou proposta parada.', icone: FileText },
  { grupo: 'quente', titulo: 'Oportunidades quentes', dica: 'Pedido concreto e próximo passo claro.', icone: Flame },
  { grupo: 'acompanhar', titulo: 'Acompanhar conversas', dica: 'Retomar só com algo útil.', icone: Clock },
  { grupo: 'primeiro', titulo: 'Primeiro contato', dica: 'Os melhores do radar, pelo score e pela resposta do segmento.', icone: Sparkles },
  { grupo: 'aguardar', titulo: 'Aguardando', dica: 'Não mande nada agora.', icone: Hourglass, recolhido: true },
]

const META_PADRAO = 15
function lerMeta() {
  try { return Number(localStorage.getItem('vp-meta')) || META_PADRAO } catch { return META_PADRAO }
}

type RascunhoMin = Pick<RascunhoIA, 'id' | 'lead_id' | 'mensagem_a' | 'mensagem_b' | 'melhor_opcao' | 'created_at' | 'etapa' | 'prompt_version' | 'catalogo_versao' | 'status' | 'enviada_confirmada_em' | 'contexto_hash' | 'texto_editado_a' | 'texto_editado_b' | 'aprovada_variante'>
const CAMPOS_RASCUNHO = 'id, lead_id, mensagem_a, mensagem_b, melhor_opcao, created_at, etapa, prompt_version, catalogo_versao, status, enviada_confirmada_em, contexto_hash, texto_editado_a, texto_editado_b, aprovada_variante'

/** Mensagens dos leads que já conversaram: a tela Hoje decide com a mesma regra do painel do lead. */
async function carregarConversas(ids: string[]): Promise<Map<string, MsgMin[]>> {
  const m = new Map<string, MsgMin[]>()
  for (let i = 0; i < ids.length; i += 150) {
    const parte = ids.slice(i, i + 150)
    let { data, error } = await supabase.from('mensagens').select('id, lead_id, direcao, texto, enviada_em, confirmada, origem').in('lead_id', parte).order('enviada_em')
    // Banco sem a coluna `confirmada` (migration 0004 não aplicada).
    if (error) ({ data, error } = await supabase.from('mensagens').select('id, lead_id, direcao, texto, enviada_em, origem').in('lead_id', parte).order('enviada_em') as never)
    if (error) throw error
    for (const msg of (data ?? []) as MsgMin[]) (m.get(msg.lead_id) ?? m.set(msg.lead_id, []).get(msg.lead_id)!).push(msg)
  }
  return m
}

export default function Hoje() {
  const { eu, nomeDe } = useSessao()
  const nav = useNavigate()
  const [meta, setMeta] = useState(lerMeta)
  const [feitos, setFeitos] = useState<Set<string>>(new Set())
  const [sequencia, setSequencia] = useState<number | null>(null)
  const [lote, setLote] = useState(false)
  const [verAguardando, setVerAguardando] = useState(false)
  const { config } = useConfigComercial()
  const bloqueios = useBloqueios()
  const envios = useEnviosAbertos()

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
  const intel = useConsulta('hoje:intel', () => carregarIntel(), ['lead_inteligencia'])
  const propostas = useConsulta('hoje:propostas', () =>
    q<{ lead_id: string | null; status: string; enviada_em: string | null; created_at: string }[]>(supabase.from('propostas').select('lead_id, status, enviada_em, created_at').not('lead_id', 'is', null).order('created_at', { ascending: false })),
    ['propostas'])
  const rascunhos = useConsulta('hoje:rascunhos', async () => {
    const desde = new Date(Date.now() - 14 * 86400e3).toISOString()
    let { data, error } = await supabase.from('rascunhos_ia').select(CAMPOS_RASCUNHO).gte('created_at', desde).order('created_at', { ascending: false })
    if (error) ({ data } = await supabase.from('rascunhos_ia').select('id, lead_id, mensagem_a, mensagem_b, melhor_opcao, created_at, status').gte('created_at', desde).order('created_at', { ascending: false }) as never)
    const m = new Map<string, RascunhoMin>()
    for (const r of (data ?? []) as RascunhoMin[]) if (!m.has(r.lead_id)) m.set(r.lead_id, r)
    return m
  }, ['rascunhos_ia'])
  // Contato do dia = envio confirmado (abrir o WhatsApp não conta).
  const contatosHoje = useConsulta(`hoje:contatos:${eu!.email}`, async () => {
    const { count, error } = await supabase.from('mensagens').select('id', { count: 'exact', head: true })
      .eq('direcao', 'enviada').eq('autor', eu!.email).eq('confirmada', true).gte('created_at', inicio)
    return error ? 0 : count ?? 0
  }, ['mensagens'])

  // Conversa de quem já teve contato: a decisão de cada item sai da mesma regra do painel do lead.
  const comConversa = useMemo(() => (leads.data ?? []).filter((l) => l.ultimo_contato_em || l.ultima_resposta_em).map((l) => l.id), [leads.data])
  const conversas = useConsulta(leads.data ? `hoje:conversas:${comConversa.length}:${comConversa[0] ?? ''}` : null, () => carregarConversas(comConversa), ['mensagens'])

  // Aprender com o que já aconteceu: taxa de resposta por segmento (só com 5 casos ou mais).
  const segmentos = useMemo(() => {
    const m = new Map<string, { n: number; sim: number }>()
    for (const l of leads.data ?? []) {
      if (!l.nicho || !l.ultimo_contato_em) continue
      const s = m.get(l.nicho) ?? { n: 0, sim: 0 }
      s.n++; if (l.ultima_resposta_em) s.sim++
      m.set(l.nicho, s)
    }
    return m
  }, [leads.data])

  const tarefas = useMemo<Tarefa[]>(() => {
    if (!leads.data) return []
    const agora = new Date(), fimDia = fimDoDia()
    const reuniaoDe = new Map((reunioes.data ?? []).map((r) => [r.lead_id, r]))
    const fuDe = new Map<string, Followup>()
    for (const f of followups.data ?? []) if (!fuDe.has(f.lead_id)) fuDe.set(f.lead_id, f)
    const propDe = new Map<string, { status: string; enviada_em: string | null; created_at: string }>()
    // A mais recente de cada lead (a mesma que a função usa no hash do contexto).
    for (const p of propostas.data ?? []) if (p.lead_id && !propDe.has(p.lead_id)) propDe.set(p.lead_id, p)
    const enviosDe = new Set((envios.data ?? []).map((e) => e.lead_id))
    const lista: { t: Tarefa; item: ItemHoje; score: number }[] = []

    for (const l of leads.data) {
      const i: LeadIntel | null = intel.data?.get(l.id) ?? null
      const msgs = conversas.data?.get(l.id) ?? []
      const leadCompleto = l as unknown as Lead
      const proposta = propDe.get(l.id) ?? null
      const dados = { lead: leadCompleto, mensagens: msgs as Mensagem[], intel: i, bloqueios: bloqueios.data ?? [], config, proposta }
      const rec = avaliarNoPainel(dados)
      // Lead com datas de contato, mas sem nenhuma mensagem registrada: a regra não tem o que ler.
      const semConversa = !msgs.length && !!(l.ultimo_contato_em || l.ultima_resposta_em)
      const item = classificarHoje({
        agora, fimDoDia: fimDia, diasAguardar: config.dias_aguardar, lead: l, bloqueado: rec.bloqueado, temperatura: rec.temperatura,
        proximaAcao: semConversa ? null : rec.decisao.acao, retornoEm: rec.retorno_em, reuniaoHoje: reuniaoDe.get(l.id) ?? null, followup: fuDe.get(l.id) ?? null,
        proposta, ultimaDe: msgs.length ? rec.leitura.ultimaDe : undefined,
      })
      if (!item) continue
      if (item.grupo === 'primeiro' && l.responsavel && l.responsavel !== eu!.email) continue

      const ras = rascunhos.data?.get(l.id)
      const ultima = msgs[msgs.length - 1]?.enviada_em ?? null
      const valido = !!ras && !rascunhoObsoleto(ras, l, rec.bloqueado, config, ultima, hashAtual(dados))
      const texto = valido && rec.decisao.gerarMensagem ? textoRecomendado(ras as RascunhoIA) : null
      const reuniao = reuniaoDe.get(l.id)
      // Só rascunho reavaliado para a conversa de agora. Confirmação de reunião é o único texto fixo (é um fato da agenda).
      const mensagem = !rec.decisao.gerarMensagem && !reuniao ? '' : texto ?? (reuniao ? `Oi! Tudo certo pra nossa conversa hoje às ${hora(reuniao.data_hora)}?` : '')
      const gerarMensagem = rec.decisao.gerarMensagem || !!reuniao
      const situacaoMsg: SituacaoMsg = enviosDe.has(l.id) ? 'aberta' : semConversa && !reuniao ? 'sem_conversa' : !gerarMensagem ? 'nao_enviar'
        : texto ? (ras!.aprovada_variante ? 'aprovada' : ras!.status === 'revisar' ? 'revisar' : 'pronta') : reuniao ? 'reuniao' : 'preparar'
      const seg = l.nicho ? segmentos.get(l.nicho) : undefined
      const segmento = seg && seg.n >= 5 ? { pct: Math.round((seg.sim / seg.n) * 100), n: seg.n } : null
      // Primeiro contato: score do radar ajustado pela resposta real do segmento (aprendizado), quando há casos suficientes.
      const score = item.grupo === 'primeiro' && segmento ? l.score * (0.75 + segmento.pct / 200) : l.score
      lista.push({
        item, score,
        t: {
          chave: `${item.grupo}:${l.id}`, grupo: item.grupo, lead: l, item, motivo: item.motivo, mensagem,
          temperatura: semConversa ? i?.temperatura_manual ?? i?.temperatura ?? null : rec.temperatura, acao: semConversa ? null : rec.decisao.acao,
          gerarMensagem: semConversa ? item.grupo !== 'aguardar' : gerarMensagem, situacaoMsg,
          janela: semConversa ? null : rec.horario, ultimaInteracao: msgs.length ? msgs[msgs.length - 1].enviada_em : [l.ultima_resposta_em, l.ultimo_contato_em].filter(Boolean).sort().pop() ?? null, segmento,
          followup: fuDe.get(l.id), reuniao,
          rascunho: texto && ras ? { id: ras.id, variante: opcaoEscolhida(ras) } : undefined,
        },
      })
    }
    const ordenada = ordenarHoje(lista)
    // Primeiro contato respeita a meta do dia.
    const vagas = Math.max(0, meta - (contatosHoje.data ?? 0)) + 3
    let primeiros = 0
    return ordenada.filter((x) => x.item.grupo !== 'primeiro' || primeiros++ < vagas).map((x) => x.t)
  }, [leads.data, followups.data, reunioes.data, intel.data, propostas.data, rascunhos.data, conversas.data, bloqueios.data, envios.data, config, meta, contatosHoje.data, segmentos, eu])

  const abertas = tarefas.filter((t) => !feitos.has(t.chave))
  const acionaveis = abertas.filter((t) => t.gerarMensagem && t.grupo !== 'aguardar')
  const paraPreparar = acionaveis.filter((t) => t.situacaoMsg === 'preparar')
  const feito = (chave: string) => setFeitos((s) => new Set(s).add(chave))
  const erro = leads.erro ?? followups.erro

  const contatos = contatosHoje.data ?? 0
  const progresso = Math.min(100, Math.round((contatos / meta) * 100))
  const conta = (g: GrupoHoje) => abertas.filter((t) => t.grupo === g).length

  return (
    <Pagina
      titulo={`${saudacao()}, ${eu!.nome.split(' ')[0]}.`}
      sub={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      acoes={acionaveis.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {paraPreparar.length > 0 && (
            <button className="btn-sec btn-lg" onClick={() => setLote(true)} title="Prepara rascunhos com a IA. Nada é enviado.">
              <Sparkles size={16} /> Preparar mensagens <span className="numero opacity-70">{paraPreparar.length}</span>
            </button>
          )}
          <button className="btn-sinal btn-lg" onClick={() => setSequencia(0)}>
            <Play size={16} fill="currentColor" /> Começar sequência <span className="numero opacity-80">{acionaveis.length}</span>
          </button>
        </div>
      )}
    >
      {/* Placar do dia */}
      <div className="folha grid grid-cols-3 md:grid-cols-4 mb-8 overflow-hidden">
        <div className="p-4 col-span-3 md:col-span-1 border-b md:border-b-0 md:border-r border-fio">
          <div className="flex items-baseline justify-between">
            <span className="rotulo" title="Só conta mensagem com envio confirmado">Envios confirmados</span>
            <button className="text-xs text-tinta-3 hover:text-tinta" onClick={() => {
              const v = Number(prompt('Meta de contatos por dia', String(meta)))
              if (v > 0) { setMeta(v); try { localStorage.setItem('vp-meta', String(v)) } catch { /* sem storage */ } }
            }}>meta {meta}</button>
          </div>
          <div className="numero text-3xl mt-2">{contatos}<span className="text-tinta-3 text-lg">/{meta}</span></div>
          <div className="h-1 rounded-full bg-realce mt-3 overflow-hidden"><div className={cx('h-full rounded-full transition-all', progresso >= 100 ? 'bg-ok' : 'bg-tinta')} style={{ width: `${progresso}%` }} /></div>
        </div>
        <Placar rotulo="Compromissos" valor={conta('compromisso')} />
        <Placar rotulo="Respostas" valor={conta('resposta')} quente />
        <Placar ultimo rotulo="Aguardando" valor={conta('aguardar')} />
      </div>

      <AlertasGestao />
      <AgendaDeHoje />

      {erro && <Erro msg={erro} onTentar={() => { leads.recarregar(); followups.recarregar() }} />}
      {leads.carregando || (comConversa.length > 0 && !conversas.data && !conversas.erro) ? <Linhas n={6} /> : abertas.length === 0 ? (
        <div className="folha"><Vazio titulo="Fila zerada." icone={<Check size={18} />}>
          Nada pendente agora. Veja o <Link className="underline" to="/funil">funil</Link> ou rode o radar em Configurações para trazer leads novos.
        </Vazio></div>
      ) : (
        <div className="space-y-8">
          {conversas.erro && <Erro msg={`Não deu para ler as conversas: ${conversas.erro}. A fila usa só as datas dos leads.`} onTentar={conversas.recarregar} />}
          {GRUPOS.map((g) => {
            const itens = abertas.filter((t) => t.grupo === g.grupo)
            if (!itens.length) return null
            const fechado = g.recolhido && !verAguardando
            return (
              <section key={g.grupo}>
                <button className="w-full flex items-center gap-2.5 mb-2.5 text-left" onClick={() => g.recolhido && setVerAguardando((v) => !v)} disabled={!g.recolhido}>
                  {g.grupo === 'resposta' ? <Sinal /> : <g.icone size={15} className="text-tinta-3" />}
                  <h2 className="font-semibold">{g.titulo}</h2>
                  <span className="numero text-sm text-tinta-3">{itens.length}</span>
                  {g.recolhido && <ChevronDown size={15} className={cx('text-tinta-3 transition-transform', !fechado && 'rotate-180')} />}
                  <span className="hidden md:inline text-sm text-tinta-3 ml-auto">{g.dica}</span>
                </button>
                {!fechado && (
                  <ul className="folha divide-y divide-fio overflow-hidden">
                    {itens.map((t) => (
                      <LinhaTarefa key={t.chave} t={t} responsavel={t.lead.responsavel ? nomeDe(t.lead.responsavel) : null}
                        onAbrir={() => nav(`/leads/${t.lead.id}`)}
                        onSequencia={() => setSequencia(Math.max(0, acionaveis.indexOf(t)))}
                        onFeito={() => feito(t.chave)} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {sequencia !== null && acionaveis.length > 0 && (
        <Sequencia tarefas={acionaveis} inicio={Math.min(sequencia, acionaveis.length - 1)} onFeito={feito} onFechar={() => setSequencia(null)} />
      )}
      {lote && <PreparoLote tarefas={paraPreparar} limite={config.limite_lote} onFechar={() => setLote(false)} />}
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
  const executar = useExecutar()
  const avisar = useAviso()
  const abrirWa = useAbrirWhatsApp()
  const [menu, setMenu] = useState(false)
  const semMensagem = !t.gerarMensagem || t.grupo === 'aguardar'

  async function whatsapp(e: React.MouseEvent) {
    e.stopPropagation()
    // Sem rascunho para a conversa de agora: abre o lead, onde a mensagem é preparada com o contexto atual.
    if (!t.mensagem) return onAbrir()
    if (await abrirWa(t.lead, t.mensagem, t.followup?.id, t.rascunho ? { rascunhoId: t.rascunho.id, variante: t.rascunho.variante } : undefined) !== false) onFeito()
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-3 hover:bg-realce/50 cursor-pointer" onClick={onAbrir}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{nomeCurto(t.lead.nome)}</span>
          {t.temperatura && <TagTemperatura t={t.temperatura} />}
          {t.grupo !== 'primeiro' && <EtapaTag etapa={t.lead.etapa} className="hidden sm:inline-flex" />}
        </div>
        <div className="text-[13px] text-tinta-3 truncate mt-0.5">
          <span className={cx(t.grupo === 'resposta' && 'text-sinal', t.motivo.includes('atrasad') && 'text-alerta')}>{t.motivo}</span>
          {t.acao && <> · {NOME_ACAO[t.acao]}</>}
          {t.janela && t.grupo !== 'resposta' && <> · {t.janela.rotulo}</>}
          {t.ultimaInteracao && <> · última {relativo(t.ultimaInteracao)}</>}
          {t.segmento && t.grupo === 'primeiro' && <span title={`${t.segmento.n} contatos neste segmento`}> · segmento responde {t.segmento.pct}%</span>}
          {[t.lead.nicho, t.lead.cidade].filter(Boolean).length > 0 && <span className="hidden lg:inline"> · {[t.lead.nicho, t.lead.cidade].filter(Boolean).join(' · ')}</span>}
          {responsavel && <> · {responsavel}</>}
        </div>
        <div className={cx('text-[12px] mt-0.5', COR_SITUACAO[t.situacaoMsg])}>{NOME_SITUACAO[t.situacaoMsg]}</div>
      </div>
      {t.grupo === 'primeiro' && <span className="hidden sm:block"><Score v={t.lead.score} /></span>}
      {!semMensagem && (
        <button className="btn-fantasma btn-sm hidden md:inline-flex opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onSequencia() }} title="Abrir na sequência">
          <Play size={14} />
        </button>
      )}
      {semMensagem
        ? <button className="btn-sec btn-sm" onClick={(e) => { e.stopPropagation(); onAbrir() }}>Ver</button>
        : !t.mensagem
          ? <button className="btn-sec btn-sm" onClick={(e) => { e.stopPropagation(); onAbrir() }} title="Abrir o lead: a mensagem é preparada ali"><Sparkles size={14} /><span className="hidden sm:inline">Preparar</span></button>
          : <button className={t.grupo === 'resposta' ? 'btn-wa btn-sm' : 'btn-sec btn-sm !text-[#1d8f4e] hover:!border-[#1d8f4e]'} onClick={whatsapp}><MessageCircle size={15} /><span className="hidden sm:inline">{t.grupo === 'resposta' ? 'Responder' : 'WhatsApp'}</span></button>}
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
              {t.grupo === 'primeiro' && (
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

/* Modo sequência: um lead por vez, com a mensagem pronta e atalhos de teclado.
   Enter abre o WhatsApp; depois a sequência pergunta se a mensagem saiu antes de avançar. */
function Sequencia({ tarefas, inicio, onFeito, onFechar }: { tarefas: Tarefa[]; inicio: number; onFeito: (c: string) => void; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const abrirWa = useAbrirWhatsApp()
  const nav = useNavigate()
  const [lista] = useState(tarefas) // fila congelada: o Realtime não embaralha o que está na tela
  const [i, setI] = useState(inicio)
  const [feitosAqui, setFeitosAqui] = useState(0)
  const t = lista[i]
  const [texto, setTexto] = useState(t?.mensagem ?? '')
  // Rascunho preparado aqui mesmo (quando a fila ainda não tinha um para este lead).
  const [preparados, setPreparados] = useState<Record<string, { texto: string; rascunho: { id: string; variante: 'a' | 'b' } } | 'sem'>>({})
  const [preparando, setPreparando] = useState(false)
  const [confirmando, setConfirmando] = useState<{ id: string } | null>(null)
  const ocupado = useRef(false)
  const preparado = t ? preparados[t.lead.id] : undefined
  const rascunho = preparado && preparado !== 'sem' ? preparado.rascunho : t?.rascunho
  const original = preparado && preparado !== 'sem' ? preparado.texto : t?.mensagem ?? ''

  useEffect(() => { setTexto(original); setConfirmando(null) }, [i, lista, original])

  const proximo = () => (i + 1 < lista.length ? setI(i + 1) : (avisar(`Sequência concluída: ${feitosAqui} contatos.`), onFechar()))

  async function preparar() {
    if (!t || preparando) return
    setPreparando(true)
    try {
      const r = await analisar(t.lead.id, 'preparar', { origem: 'lote' })
      const ras = r.rascunho
      const txt = ras ? textoRecomendado(ras) : null
      setPreparados((p) => ({ ...p, [t.lead.id]: ras && txt ? { texto: txt, rascunho: { id: ras.id, variante: opcaoEscolhida(ras) } } : 'sem' }))
      if (!txt) avisar('A análise indicou que não é hora de mandar mensagem para este lead.')
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
    setPreparando(false)
  }

  async function enviar() {
    if (!t || ocupado.current) return
    if (confirmando) return confirmar(true)
    if (!texto.trim()) return avisar('Escreva a mensagem ou prepare com a IA antes de abrir o WhatsApp.', 'erro')
    ocupado.current = true
    const envio = await abrirWa(t.lead, texto, t.followup?.id, texto === original && rascunho ? { rascunhoId: rascunho.id, variante: rascunho.variante } : undefined)
    ocupado.current = false
    if (envio === false) return
    if (envio) setConfirmando(envio)
    else { onFeito(t.chave); setFeitosAqui((n) => n + 1); proximo() }
  }
  async function confirmar(enviou: boolean) {
    if (!t || !confirmando || ocupado.current) return
    ocupado.current = true
    const ok = await executar(() => enviou
      ? confirmarEnvio({ id: confirmando.id, lead_id: t.lead.id, texto: preencherVendedor(texto, eu!.nome), followup_id: t.followup?.id ?? null, rascunho_id: rascunho?.id ?? null, variante: rascunho?.variante ?? null }, eu!)
      : marcarNaoEnviado(confirmando.id))
    ocupado.current = false
    if (!ok) return
    setConfirmando(null)
    if (enviou) { onFeito(t.chave); setFeitosAqui((n) => n + 1); proximo() }
  }
  async function pular() {
    if (!t) return
    if (t.followup) await executar(() => adiarFollowup(t.followup!.id, new Date(Date.now() + 86400e3)))
    proximo()
  }
  async function descartar() {
    if (!t || t.grupo !== 'primeiro') return
    if (await executar(() => mudarEtapa(t.lead.id, 'descartado'))) { onFeito(t.chave); proximo() }
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const emTexto = (e.target as HTMLElement).tagName === 'TEXTAREA'
      if (e.key === 'Enter' && (!emTexto || e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar() }
      if (emTexto) return
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'p') { e.preventDefault(); pular() }
      if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
      if (e.key.toLowerCase() === 'd' && !confirmando) descartar()
      if (e.key.toLowerCase() === 'n' && confirmando) confirmar(false)
      if (e.key.toLowerCase() === 'g' && !texto.trim()) preparar()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  if (!t) return null
  const grupo = GRUPOS.find((g) => g.grupo === t.grupo)!
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
      {confirmando ? <>
        <button className="btn-sec" onClick={() => confirmar(false)}><X size={15} /> Não enviei <span className="tecla hidden md:inline-flex">N</span></button>
        <button className="btn-pri" onClick={() => confirmar(true)}><Check size={15} /> Enviei, próximo <span className="tecla hidden md:inline-flex !bg-white/15 !border-white/20 !text-fundo">Enter</span></button>
      </> : <>
        {t.grupo === 'primeiro' && <button className="btn-sec" onClick={descartar}>Descartar <span className="tecla hidden md:inline-flex">D</span></button>}
        <button className="btn-sec" onClick={pular}>{t.followup ? 'Adiar' : 'Pular'} <span className="tecla hidden md:inline-flex">→</span></button>
        <button className="btn-wa" onClick={enviar} disabled={!texto.trim()}><MessageCircle size={16} /> Abrir WhatsApp <span className="tecla hidden md:inline-flex !bg-white/15 !border-white/20 !text-white">Enter</span></button>
      </>}
    </>}>
      <div key={t.chave} className="animate-entra">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button className="text-xl font-semibold hover:underline text-left" onClick={() => { onFechar(); nav(`/leads/${l.id}`) }}>{nomeCurto(l.nome)}</button>
            <div className="text-sm text-tinta-3 mt-0.5">{[l.nicho, l.cidade].filter(Boolean).join(' · ')}{l.rating ? ` · nota ${String(l.rating).replace('.', ',')} (${l.avaliacoes})` : ''}</div>
          </div>
          <div className="text-right shrink-0">
            <EtapaTag etapa={l.etapa} />
            <div className="mt-1.5 flex items-center justify-end gap-2">{t.temperatura && <TagTemperatura t={t.temperatura} />}<Score v={l.score} /></div>
          </div>
        </div>

        <div className={cx('mt-4 text-sm', t.grupo === 'resposta' ? 'text-sinal' : 'text-tinta-2')}>{t.motivo}{t.acao && <span className="text-tinta-3"> · {NOME_ACAO[t.acao]}</span>}{t.janela && <span className="text-tinta-3"> · {t.janela.rotulo}</span>}</div>
        {confirmando && <div className="mt-3 rounded border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm">O WhatsApp abriu. A mensagem foi enviada? Só o envio confirmado entra no histórico e nas métricas.</div>}
        {t.grupo === 'primeiro' && l.score_motivos?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">{l.score_motivos.map((m) => <span key={m} className="font-mono text-[11px] px-2 py-1 rounded bg-realce text-tinta-2">{m}</span>)}</div>
        )}

        <label className="block mt-5">
          <span className="lbl flex justify-between"><span>Mensagem</span><span className="normal-case tracking-normal">{'{vendedor}'} vira {eu!.nome.split(' ')[0]}</span></span>
          <textarea className="inp text-[15px]" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder={preparado === 'sem' ? 'A análise indicou que não é hora de mandar mensagem. Pule ou escreva você mesmo.' : 'Ainda sem rascunho para a conversa de agora. Prepare com a IA ou escreva você mesmo.'} />
        </label>
        {!texto.trim() && preparado !== 'sem' && (
          <button className="btn-sec btn-sm mt-2" onClick={preparar} disabled={preparando}>
            <Sparkles size={14} className={cx(preparando && 'animate-pulsa')} /> {preparando ? 'Preparando…' : 'Preparar com IA'} <span className="tecla hidden md:inline-flex">G</span>
          </button>
        )}
        <p className="hidden md:block text-xs text-tinta-3 mt-4">
          <span className="tecla">Enter</span> abre o WhatsApp · <span className="tecla">→</span> {t.followup ? 'adia 1 dia' : 'pula'} · <span className="tecla">←</span> volta · dentro do texto use <span className="tecla">Ctrl Enter</span>
        </p>
      </div>
    </Modal>
  )
}

/* Preparação em lote: rascunhos para a fila do dia. Nada é enviado: a equipe revisa cada um na sequência ou no lead. */
type EstadoLote = 'na_fila' | 'preparando' | 'pronto' | 'sem_mensagem' | 'reaproveitado' | 'erro' | 'cancelado'
const NOME_LOTE: Record<EstadoLote, string> = {
  na_fila: 'Na fila', preparando: 'Preparando…', pronto: 'Rascunho pronto', sem_mensagem: 'Não é hora de mensagem',
  reaproveitado: 'Já tinha rascunho válido', erro: 'Erro', cancelado: 'Cancelado',
}

function PreparoLote({ tarefas, limite, onFechar }: { tarefas: Tarefa[]; limite: number; onFechar: () => void }) {
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(tarefas.slice(0, limite).map((t) => t.lead.id)))
  const [estado, setEstado] = useState<Record<string, { e: EstadoLote; msg?: string }>>({})
  const [rodando, setRodando] = useState(false)
  const parar = useRef(false)
  const feitos = Object.values(estado).filter((x) => !['na_fila', 'preparando'].includes(x.e)).length
  const total = Object.keys(estado).length

  async function rodar() {
    const ids = tarefas.map((t) => t.lead.id).filter((id) => marcados.has(id)).slice(0, limite)
    if (!ids.length) return
    parar.current = false
    setRodando(true)
    setEstado(Object.fromEntries(ids.map((id) => [id, { e: 'na_fila' as EstadoLote }])))
    const res = await prepararEmLote(ids, (id) => analisar(id, 'preparar', { origem: 'lote', semInvalidar: true }), {
      concorrencia: 2, limite, parar: () => parar.current,
      aoMudar: (id, e, msg) => setEstado((s) => ({ ...s, [id]: { e, msg } })),
    })
    if (res.some((r) => r.estado === 'erro' && ERRO_GERAL.test(r.erro ?? ''))) pausarPreparoAuto()
    setRodando(false)
    invalidar('rascunhos_ia', 'lead_inteligencia', 'atividades')
  }

  return (
    <Modal largura="max-w-xl" onFechar={() => { parar.current = true; onFechar() }} titulo="Preparar mensagens"
      rodape={<>
        <button className="btn-fantasma mr-auto" onClick={() => { parar.current = true; onFechar() }}>{total && !rodando ? 'Fechar' : 'Cancelar'}</button>
        {rodando
          ? <button className="btn-sec" onClick={() => { parar.current = true }}>Parar</button>
          : <button className="btn-pri" disabled={!marcados.size} onClick={rodar}><Sparkles size={15} /> Preparar {Math.min(marcados.size, limite)}</button>}
      </>}>
      <p className="text-sm text-tinta-2">A IA prepara um rascunho para cada lead marcado, com a conversa de agora. <b className="font-medium">Nada é enviado.</b> Leads bloqueados não entram, e quem já tem rascunho válido não gasta IA de novo.</p>
      <p className="text-xs text-tinta-3 mt-1">Até {limite} por vez (ajuste em Configurações › Inteligência).</p>
      {total > 0 && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-realce overflow-hidden"><div className="h-full bg-tinta transition-all" style={{ width: `${(feitos / total) * 100}%` }} /></div>
          <p className="text-xs text-tinta-3 mt-1 numero">{feitos}/{total}</p>
        </div>
      )}
      <ul className="mt-4 divide-y divide-fio max-h-[50vh] overflow-y-auto -mx-1">
        {tarefas.map((t, n) => {
          const st = estado[t.lead.id]
          return (
            <li key={t.lead.id} className="flex items-center gap-3 px-1 py-2">
              <input type="checkbox" className="accent-current" disabled={rodando || n >= limite && !marcados.has(t.lead.id)} checked={marcados.has(t.lead.id)}
                onChange={(e) => setMarcados((m) => { const x = new Set(m); if (e.target.checked) x.add(t.lead.id); else x.delete(t.lead.id); return x })} />
              <span className="flex-1 min-w-0 truncate text-sm">{nomeCurto(t.lead.nome)} <span className="text-tinta-3">· {t.motivo}</span></span>
              {st && <span className={cx('text-xs whitespace-nowrap', st.e === 'erro' ? 'text-sinal' : st.e === 'pronto' || st.e === 'reaproveitado' ? 'text-ok' : 'text-tinta-3')} title={st.msg}>{NOME_LOTE[st.e]}</span>}
            </li>
          )
        })}
      </ul>
      {Object.values(estado).some((x) => x.e === 'erro') && (
        <p className="text-sm text-sinal mt-3">Erro: {Object.values(estado).find((x) => x.e === 'erro')?.msg}</p>
      )}
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
