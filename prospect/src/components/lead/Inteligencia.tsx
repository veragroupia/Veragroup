import { useEffect, useMemo, useState } from 'react'
import { Ban, ChevronDown, Clock, Copy, RefreshCw, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invalidar } from '../../lib/dados'
import { useSessao } from '../../lib/sessao'
import { abrirWhatsApp } from '../../lib/acoes'
import {
  analisar, analiseAtual, avaliarNoPainel, bloquearContato, COR_TEMPERATURA, definirRetorno, definirTemperatura, FUNDO_TEMPERATURA, liberarContato,
  NOME_ACAO, NOME_CONFIANCA, NOME_ESTADO, NOME_ESTAGIO, NOME_TEMPERATURA, rascunhoObsoleto,
  type BloqueioRow, type ConfigComercial, type LeadIntel, type Recomendacao, type Temperatura,
} from '../../lib/inteligencia'
import { ETAPAS, type Etapa, type Lead, type Mensagem, type RascunhoIA } from '../../lib/tipos'
import { cx, dataHora, relativo } from '../../lib/util'
import { NOME_SOLUCAO, ofertasAtivas } from '../../../supabase/functions/_shared/inteligencia/catalogo.ts'
import { SINAIS } from '../../../supabase/functions/_shared/inteligencia/tipos.ts'
import { PESOS_ADEQUACAO, PESOS_INTERESSE } from '../../../supabase/functions/_shared/inteligencia/config.ts'
import { TEXTO_OBSOLETA } from '../../../supabase/functions/_shared/inteligencia/validade.ts'
import { bloqueioDoLead } from '../../../supabase/functions/_shared/inteligencia/conversa.ts'
import { useAviso, useExecutar } from '../Aviso'
import { useMudarEtapa } from '../MudarEtapa'
import { Campo, Linhas, Modal } from '../ui'

export interface DadosInteligencia {
  lead: Lead
  mensagens: Mensagem[]
  intel: LeadIntel | null
  bloqueios: BloqueioRow[]
  config: ConfigComercial
  proposta: { status: string; enviada_em: string | null } | null
}

export function useRecomendacao(d: DadosInteligencia) {
  return useMemo(() => avaliarNoPainel(d), [d.lead, d.mensagens, d.intel, d.bloqueios, d.config, d.proposta]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function Temperatura({ t, grande }: { t: Temperatura; grande?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-semibold', COR_TEMPERATURA[t], grande ? 'text-xl' : 'text-sm')}>
      <span className={cx('rounded-full', FUNDO_TEMPERATURA[t], grande ? 'w-2.5 h-2.5' : 'w-2 h-2')} />{NOME_TEMPERATURA[t]}
    </span>
  )
}

function Medidor({ rotulo, valor, dica }: { rotulo: string; valor: number; dica?: string }) {
  return (
    <div title={dica}>
      <div className="flex justify-between text-sm"><span>{rotulo}</span><span className="numero text-tinta-2">{valor}<span className="text-tinta-3">/100</span></span></div>
      <div className="h-1.5 rounded-full bg-realce mt-1.5 overflow-hidden"><div className={cx('h-full rounded-full', valor >= 60 ? 'bg-ok' : valor >= 35 ? 'bg-alerta' : 'bg-tinta-3')} style={{ width: `${Math.max(2, valor)}%` }} /></div>
    </div>
  )
}

/* ---------- Resumo na lateral ---------- */

export function ResumoInteligencia({ d, onAbrir }: { d: DadosInteligencia; onAbrir: () => void }) {
  const r = useRecomendacao(d)
  return (
    <button onClick={onAbrir} className="folha p-4 w-full text-left hover:border-tinta-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="rotulo">Inteligência</span>
        {r.bloqueado ? <span className="text-xs font-medium text-sinal">Não contatar</span> : <Temperatura t={r.temperatura} />}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-tinta-3">
        <div>Interesse <span className="numero text-tinta text-sm block">{r.score_interesse}</span></div>
        <div>Adequação <span className="numero text-tinta text-sm block">{r.adequacao_sem_evidencia ? '–' : r.score_adequacao}</span></div>
      </div>
      <p className="text-sm font-medium mt-3">{NOME_ACAO[r.decisao.acao]}</p>
      {r.horario && <p className="text-xs text-tinta-3 mt-1 inline-flex items-center gap-1"><Clock size={11} /> {r.horario.rotulo}</p>}
    </button>
  )
}

/* ---------- Painel completo ---------- */

export function PainelInteligencia({ d, rascunhos }: { d: DadosInteligencia; rascunhos?: RascunhoIA[] }) {
  const r = useRecomendacao(d)
  const executar = useExecutar()
  const avisar = useAviso()
  const [observacao, setObservacao] = useState('')
  const [rodando, setRodando] = useState<null | 'analisar' | 'gerar'>(null)
  const [sel, setSel] = useState(0)
  const atual = analiseAtual(d.intel, d.mensagens)

  async function rodar(modo: 'analisar' | 'gerar', forcar = false) {
    setRodando(modo)
    let res: Awaited<ReturnType<typeof analisar>> | undefined
    await executar(async () => { res = await analisar(d.lead.id, modo, { observacao, forcar }) })
    setRodando(null)
    if (!res) return
    setSel(0)
    avisar(modo === 'analisar' ? (res.reaproveitada ? 'Nada mudou desde a última análise' : 'Análise atualizada')
      : res.rascunho?.mensagem_a ? 'Mensagem pronta' : 'Análise pronta: não é hora de mandar mensagem')
  }

  if (!rascunhos) return <Linhas n={4} />
  const rasc = rascunhos[sel]

  return (
    <div className="space-y-4">
      <Identificacao r={r} d={d} atual={atual} rodando={rodando} onAnalisar={() => rodar('analisar', !atual)} />
      {r.bloqueado && <AvisoBloqueio r={r} d={d} />}
      <div className="grid lg:grid-cols-2 gap-4">
        <Qualificacao r={r} d={d} />
        <Estrategia r={r} d={d} />
      </div>

      <section className="folha p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-semibold">Mensagens</h3>
          {rasc && <span className="text-xs text-tinta-3">{dataHora(rasc.created_at)}</span>}
        </div>
        {!r.bloqueado && (
          <>
            <Campo rotulo="O que você viu sobre a empresa (opcional)" dica="Ex.: os destaques mostram bolos por encomenda e a bio leva direto ao WhatsApp. A IA só trata como fato o que está aqui, no cadastro ou na conversa.">
              <textarea className="inp" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={2000} />
            </Campo>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <p className="text-xs text-tinta-3 max-w-md">
                {r.decisao.gerarMensagem ? 'A IA lê a conversa, decide o objetivo e escreve até duas opções diferentes.' : `Agora a recomendação é ${NOME_ACAO[r.decisao.acao].toLowerCase()}. A IA não vai inventar mensagem; ela só atualiza a análise.`}
              </p>
              <button className="btn-pri shrink-0" onClick={() => rodar('gerar', !!rasc && !!observacao)} disabled={!!rodando}>
                <Sparkles size={15} className={cx(rodando === 'gerar' && 'animate-pulsa')} /> {rodando === 'gerar' ? 'Pensando…' : r.decisao.gerarMensagem ? (rasc ? 'Gerar de novo' : 'Gerar mensagem') : 'Reavaliar'}
              </button>
            </div>
          </>
        )}
        {r.bloqueado && !rasc && <p className="text-sm text-tinta-3">Nenhuma mensagem é preparada para um contato bloqueado.</p>}
        {rasc && <Rascunho key={rasc.id} r={rasc} d={d} bloqueado={r.bloqueado} onRegenerar={() => rodar('gerar', true)} />}
      </section>

      <AjustesEquipe d={d} r={r} />

      {rascunhos.length > 1 && (
        <div className="folha">
          <div className="rotulo px-4 pt-4 pb-2">Histórico de sugestões</div>
          <ul className="divide-y divide-fio">
            {rascunhos.map((x, i) => (
              <li key={x.id}>
                <button onClick={() => setSel(i)} className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-realce/60', i === sel && 'bg-realce')}>
                  <span className="font-mono text-[11px] uppercase text-tinta-3 w-24 shrink-0 truncate">{x.acao ? NOME_ACAO[x.acao as keyof typeof NOME_ACAO] ?? x.acao : x.status}</span>
                  <span className="flex-1 truncate text-tinta-2">{x.mensagem_a ?? x.motivo ?? x.proxima_acao_sugerida}</span>
                  {x.enviada_confirmada_em ? <span className="text-xs text-ok">enviada</span> : x.usada && <span className="text-xs text-tinta-3">usou {x.usada.toUpperCase()}</span>}
                  <span className="text-xs text-tinta-3 whitespace-nowrap">{dataHora(x.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Identificacao({ r, d, atual, rodando, onAnalisar }: { r: Recomendacao; d: DadosInteligencia; atual: boolean; rodando: string | null; onAnalisar: () => void }) {
  return (
    <section className="folha p-4 md:p-5">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <div>
          <div className="rotulo">Temperatura</div>
          <div className="mt-1.5">{r.bloqueado ? <span className="text-xl font-semibold text-sinal">Não contatar</span> : <Temperatura t={r.temperatura} grande />}</div>
          {r.temperatura_manual && <div className="text-xs text-tinta-3 mt-1">Definida pela equipe · calculada: {NOME_TEMPERATURA[r.temperatura_calculada].toLowerCase()}</div>}
        </div>
        <div><div className="rotulo">Estágio</div><div className="mt-2 font-medium">{NOME_ESTAGIO[r.estagio]}</div></div>
        <div><div className="rotulo">Situação</div><div className="mt-2 font-medium">{NOME_ESTADO[r.estado]}</div></div>
        <div title="Quanto o sistema realmente sabe deste lead"><div className="rotulo">Confiança</div><div className={cx('mt-2 font-medium', r.confianca === 'baixa' && 'text-tinta-3')}>{NOME_CONFIANCA[r.confianca]}{r.confianca === 'baixa' && <span className="text-xs font-normal"> · provisória</span>}</div></div>
        <div className="ml-auto text-right">
          <div className="text-xs text-tinta-3">{d.intel?.analisado_em ? `Análise da IA ${relativo(d.intel.analisado_em)}` : 'Ainda sem análise da IA (só regras)'}</div>
          {d.intel?.analisado_em && !atual && <div className="text-xs text-alerta mt-0.5">Há mensagens novas desde a análise</div>}
          <button className="btn-sec btn-sm mt-2" onClick={onAnalisar} disabled={!!rodando || r.bloqueado}><RefreshCw size={13} className={cx(rodando === 'analisar' && 'animate-spin')} /> {rodando === 'analisar' ? 'Analisando…' : 'Atualizar análise'}</button>
        </div>
      </div>
      {d.intel?.resumo && atual && <p className="mt-4 text-[15px] leading-relaxed">{d.intel.resumo}</p>}
    </section>
  )
}

function Qualificacao({ r, d }: { r: Recomendacao; d: DadosInteligencia }) {
  const [todos, setTodos] = useState(false)
  const oferta = ofertasAtivas(d.config.catalogo).find((o) => o.id === r.oferta_id)
  const pesos = { ...PESOS_INTERESSE, ...PESOS_ADEQUACAO, ...d.config.pesos }
  return (
    <section className="folha p-4 md:p-5">
      <h3 className="font-semibold mb-3">Qualificação</h3>
      <div className="space-y-3.5">
        <Medidor rotulo="Interesse" valor={r.score_interesse} dica="Sinais de envolvimento e intenção que o cliente mostrou" />
        <Medidor rotulo={r.adequacao_sem_evidencia ? 'Adequação (sem evidência ainda)' : 'Adequação'} valor={r.score_adequacao} dica="Quanto a necessidade combina com o que a Vera faz" />
      </div>
      <p className="text-[11px] text-tinta-3 mt-2">Indicadores internos para priorizar. Não são chance de fechar.</p>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div><dt className="rotulo">Necessidade principal</dt><dd className="mt-0.5">{r.necessidade ?? <span className="text-tinta-3">Ainda não identificada</span>}</dd></div>
        <div><dt className="rotulo">Solução</dt><dd className="mt-0.5">{NOME_SOLUCAO[r.solucao]}{oferta && <span className="text-tinta-3"> · {oferta.nome}, {oferta.preco}</span>}</dd></div>
        {r.desconhecido.length > 0 && (
          <div>
            <dt className="rotulo">Ainda falta saber</dt>
            <dd><ul className="mt-1 space-y-1">{(todos ? r.desconhecido : r.desconhecido.slice(0, 3)).map((x, i) => <li key={i} className="flex gap-2"><span className="font-mono text-alerta">?</span>{x}</li>)}</ul>
              {r.desconhecido.length > 3 && <button className="text-xs text-tinta-3 hover:text-tinta mt-1" onClick={() => setTodos((v) => !v)}>{todos ? 'Mostrar menos' : `+ ${r.desconhecido.length - 3}`}</button>}
            </dd>
          </div>
        )}
      </dl>
      {r.sinais.length > 0 && (
        <details className="mt-4 group">
          <summary className="text-sm text-tinta-2 cursor-pointer inline-flex items-center gap-1 select-none"><ChevronDown size={14} className="group-open:rotate-180 transition-transform" /> Sinais usados ({r.sinais.length})</summary>
          <ul className="mt-2 space-y-2">
            {r.sinais.map((s) => (
              <li key={s.codigo} className="text-sm flex gap-2">
                <span className={cx('numero text-xs w-9 text-right shrink-0', (pesos[s.codigo] ?? 0) < 0 ? 'text-sinal' : 'text-ok')}>{(pesos[s.codigo] ?? 0) > 0 ? '+' : ''}{pesos[s.codigo] ?? 0}</span>
                <span><b className="font-medium">{SINAIS[s.codigo].nome}</b>{s.detalhe && <span className="text-tinta-3"> · {s.detalhe}</span>}<span className="font-mono text-[10px] text-tinta-3 ml-1.5">{s.fonte}</span></span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function Estrategia({ r, d }: { r: Recomendacao; d: DadosInteligencia }) {
  const { mudar, dialogo } = useMudarEtapa()
  const h = r.horario
  const sugerida = r.etapa_sugerida ? ETAPAS.find((e) => e.id === r.etapa_sugerida) : null
  return (
    <section className="folha p-4 md:p-5 border-l-[3px] border-l-sinal">
      <h3 className="font-semibold mb-3">Estratégia</h3>
      <div className="rotulo">Próxima ação</div>
      <p className="font-medium mt-1">{NOME_ACAO[r.decisao.acao]}</p>
      <p className="text-sm text-tinta-2 mt-1 leading-relaxed">{r.decisao.motivo}</p>
      {r.decisao.condicaoRetomar && <p className="text-sm mt-2"><span className="text-tinta-3">Retomar: </span>{r.decisao.condicaoRetomar}</p>}
      {r.leitura.compromissoVendedor && r.decisao.acao !== 'apresentar_solucao' && <p className="text-sm mt-2"><span className="text-tinta-3">Compromisso pendente: </span>{r.leitura.compromissoVendedor}</p>}
      {h && (
        <div className="mt-4">
          <div className="rotulo">Melhor momento</div>
          <p className="font-medium mt-1 inline-flex items-center gap-1.5"><Clock size={14} /> {h.rotulo}</p>
          <p className="text-xs text-tinta-3 mt-1">{h.motivo}. {h.confirmado ? 'Compromisso confirmado' : 'Estimativa'} · confiança {NOME_CONFIANCA[h.confianca].toLowerCase()} · {h.fuso.replace('America/', '').replace('_', ' ')}</p>
        </div>
      )}
      {sugerida && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-tinta-3">A conversa indica a etapa</span><b className="font-medium">{sugerida.nome}</b>
          <button className="btn-sec btn-sm ml-auto" onClick={() => mudar(d.lead, sugerida.id as Etapa)}>Mover</button>
        </div>
      )}
      {dialogo}
    </section>
  )
}

function AvisoBloqueio({ r, d }: { r: Recomendacao; d: DadosInteligencia }) {
  const { eu, ehAdmin } = useSessao()
  const executar = useExecutar()
  const bloqueio = bloqueioDoLead(d.lead, d.bloqueios) as BloqueioRow | null
  return (
    <section className="folha p-4 md:p-5 border-l-[3px] border-l-sinal">
      <p className="font-medium inline-flex items-center gap-2"><Ban size={16} className="text-sinal" /> Não contatar</p>
      <p className="text-sm text-tinta-2 mt-1">{r.motivo_bloqueio}. Nenhuma mensagem comercial, horário ou follow-up é sugerido.</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {!bloqueio && <button className="btn-sinal btn-sm" onClick={() => executar(() => bloquearContato(d.lead, r.motivo_bloqueio ?? 'Pediu para não receber mensagens', 'pedido_do_cliente', eu!), 'Contato bloqueado')}><Ban size={13} /> Registrar bloqueio e encerrar</button>}
        {ehAdmin && <button className="btn-sec btn-sm" onClick={() => { if (confirm('Liberar o contato? Use só se o próprio cliente pediu para voltar a conversar.')) executar(() => liberarContato(bloqueio, d.lead.id, eu!), 'Contato liberado') }}><ShieldCheck size={13} /> Liberar contato</button>}
      </div>
    </section>
  )
}

function Rascunho({ r, d, bloqueado, onRegenerar }: { r: RascunhoIA; d: DadosInteligencia; bloqueado: boolean; onRegenerar: () => void }) {
  const ultima = d.mensagens[d.mensagens.length - 1]?.enviada_em ?? null
  const obsoleta = rascunhoObsoleto(r, d.lead, bloqueado, d.config, ultima)
  const v4 = !!r.prompt_version
  const opcoes = [
    r.mensagem_a ? { qual: 'a' as const, titulo: v4 ? 'Opção A · conversa natural' : r.status === 'revisar' ? 'Rascunho neutro' : 'Opção A', texto: r.mensagem_a } : null,
    r.mensagem_b ? { qual: 'b' as const, titulo: v4 ? 'Opção B · abordagem estratégica' : 'Opção B', texto: r.mensagem_b } : null,
  ].filter(Boolean) as { qual: 'a' | 'b'; titulo: string; texto: string }[]

  return (
    <div className={cx('mt-5 space-y-3', obsoleta && 'opacity-60')}>
      {obsoleta && (
        <div className="rounded border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm flex items-center gap-2">
          <TriangleAlert size={15} className="text-alerta shrink-0" /><span className="flex-1">Sugestão desatualizada. {TEXTO_OBSOLETA[obsoleta]}</span>
          {obsoleta !== 'bloqueado' && obsoleta !== 'ja_enviada' && <button className="btn-sec btn-sm" onClick={onRegenerar}>Gerar de novo</button>}
        </div>
      )}
      {r.status === 'sem_mensagem' && <p className="text-sm text-tinta-2"><b className="font-medium">Sem mensagem agora.</b> {r.motivo ?? r.proxima_acao_sugerida}{r.condicao_retomar && ` ${r.condicao_retomar}`}</p>}
      {r.status === 'nao_contatar' && <p className="text-sm text-sinal">Nenhuma mensagem: contato bloqueado.</p>}
      {r.status === 'revisar' && r.informacoes_faltantes.length > 0 && (
        <div className="rounded border border-alerta/40 px-3 py-2">
          <div className="rotulo">Verifique antes de enviar</div>
          <ul className="mt-1 space-y-1">{r.informacoes_faltantes.map((t, i) => <li key={i} className="text-sm flex gap-2"><span className="font-mono text-alerta">?</span>{t}</li>)}</ul>
        </div>
      )}
      {opcoes.map((o) => <Variante key={o.qual} r={r} d={d} qual={o.qual} titulo={o.titulo} original={o.texto} recomendada={opcoes.length > 1 && (r.melhor_opcao ?? 'A').toLowerCase() === o.qual} bloqueada={!!obsoleta || bloqueado} />)}
      {opcoes.length > 1 && <p className="text-xs text-tinta-3">São alternativas. Envie só uma.</p>}
      {(r.alertas?.length ?? 0) > 0 && <ul className="text-xs text-alerta space-y-1">{r.alertas!.map((a, i) => <li key={i} className="flex gap-1.5"><TriangleAlert size={12} className="mt-0.5 shrink-0" />{a}</li>)}</ul>}
      {opcoes.length > 0 && r.justificativa_curta && <p className="text-sm text-tinta-2"><span className="rotulo mr-2">Por quê</span>{r.justificativa_curta}</p>}
      <div className="flex items-center gap-3 text-[11px] text-tinta-3 font-mono">
        {r.modelo && <span>modelo: {r.modelo}</span>}{r.prompt_version && <span>{r.prompt_version}</span>}
        {!obsoleta && opcoes.length > 0 && <button className="ml-auto inline-flex items-center gap-1 hover:text-tinta" onClick={onRegenerar}><RefreshCw size={11} /> Regenerar</button>}
      </div>
    </div>
  )
}

function Variante({ r, d, qual, titulo, original, recomendada, bloqueada }: { r: RascunhoIA; d: DadosInteligencia; qual: 'a' | 'b'; titulo: string; original: string; recomendada: boolean; bloqueada: boolean }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const [texto, setTexto] = useState(original)
  useEffect(() => setTexto(original), [original])
  const enviada = !!r.enviada_confirmada_em && r.usada === qual

  async function copiar() {
    await navigator.clipboard.writeText(texto)
    avisar('Mensagem copiada')
    await supabase.from('rascunhos_ia').update({ usada: qual, copiada_em: new Date().toISOString(), texto_final: texto }).eq('id', r.id)
    invalidar('rascunhos_ia')
  }

  return (
    <div className={cx('rounded-lg border p-3.5', enviada ? 'border-ok/50' : recomendada ? 'border-tinta-3' : 'border-fio')}>
      <div className="flex items-center justify-between gap-3">
        <div className="rotulo">{titulo}{recomendada && <span className="ml-2 normal-case tracking-normal text-[11px] text-ok font-sans">recomendada</span>}</div>
        <span className="text-[11px] font-mono text-tinta-3">{texto.trim().split(/\s+/).filter(Boolean).length} palavras{enviada && ' · enviada'}</span>
      </div>
      <textarea className="inp mt-2 text-[14px]" rows={Math.min(8, Math.max(3, Math.ceil(texto.length / 55)))} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={bloqueada} />
      <div className="flex gap-2 mt-2.5">
        {(d.lead.whatsapp || d.lead.telefone) && (
          <button className="btn-wa btn-sm" disabled={!texto.trim() || bloqueada} onClick={() => executar(() => abrirWhatsApp(d.lead, texto, eu!, undefined, { rascunhoId: r.id, variante: qual }))}>Abrir no WhatsApp</button>
        )}
        <button className="btn-sec btn-sm" disabled={bloqueada} onClick={copiar}><Copy size={13} /> Copiar</button>
      </div>
    </div>
  )
}

function AjustesEquipe({ d, r }: { d: DadosInteligencia; r: Recomendacao }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const [modal, setModal] = useState<null | 'temperatura' | 'retorno' | 'bloquear'>(null)
  const i = d.intel
  return (
    <section className="folha p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rotulo mr-auto">Ajustes da equipe</span>
        <button className="btn-sec btn-sm" onClick={() => setModal('temperatura')}>Temperatura{i?.temperatura_manual ? `: ${NOME_TEMPERATURA[i.temperatura_manual].toLowerCase()}` : ''}</button>
        <button className="btn-sec btn-sm" onClick={() => setModal('retorno')}><Clock size={13} /> {i?.retorno_em ? `Retorno ${dataHora(i.retorno_em)}` : 'Retorno combinado'}</button>
        {!r.bloqueado && <button className="btn-sec btn-sm text-sinal" onClick={() => setModal('bloquear')}><Ban size={13} /> Não contatar</button>}
      </div>
      <p className="text-xs text-tinta-3 mt-2">A IA nunca sobrescreve estes ajustes. Ficam no histórico do lead.</p>
      {modal === 'temperatura' && <ModalTemperatura d={d} onFechar={() => setModal(null)} />}
      {modal === 'retorno' && <ModalRetorno d={d} onFechar={() => setModal(null)} />}
      {modal === 'bloquear' && (
        <ModalSimples titulo="Não contatar este lead" botao="Bloquear contato" perigo onFechar={() => setModal(null)}
          rotulo="Motivo" inicial="Pediu para não receber mensagens"
          onSalvar={(motivo) => executar(() => bloquearContato(d.lead, motivo, 'equipe', eu!), 'Contato bloqueado')}
          dica="O bloqueio vale pelo telefone e pelo cadastro do Google: se o radar trouxer este contato de novo, ele já chega descartado." />
      )}
    </section>
  )
}

function ModalTemperatura({ d, onFechar }: { d: DadosInteligencia; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const [t, setT] = useState<Temperatura | ''>(d.intel?.temperatura_manual ?? '')
  const [nota, setNota] = useState(d.intel?.temperatura_manual_nota ?? '')
  return (
    <Modal titulo="Temperatura definida pela equipe" onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" onClick={async () => { if (await executar(() => definirTemperatura(d.lead.id, t || null, nota, eu!), 'Temperatura salva')) onFechar() }}>Salvar</button></>}>
      <div className="space-y-4">
        <Campo rotulo="Temperatura">
          <select className="inp" value={t} onChange={(e) => setT(e.target.value as Temperatura | '')}>
            <option value="">Automática (pelas evidências)</option><option value="frio">Frio</option><option value="morno">Morno</option><option value="quente">Quente</option>
          </select>
        </Campo>
        <Campo rotulo="Por quê (opcional)"><input className="inp" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: falou por telefone que quer fechar este mês" /></Campo>
      </div>
    </Modal>
  )
}

function ModalRetorno({ d, onFechar }: { d: DadosInteligencia; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const inicial = d.intel?.retorno_em ? new Date(new Date(d.intel.retorno_em).getTime() - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16) : ''
  const [em, setEm] = useState(inicial)
  const [nota, setNota] = useState(d.intel?.retorno_nota ?? '')
  return (
    <Modal titulo="Retorno combinado com o cliente" onFechar={onFechar}
      rodape={<>
        {d.intel?.retorno_em && <button className="btn-fantasma mr-auto" onClick={async () => { if (await executar(() => definirRetorno(d.lead.id, null, '', eu!), 'Retorno removido')) onFechar() }}>Remover</button>}
        <button className="btn-fantasma" onClick={onFechar}>Cancelar</button>
        <button className="btn-pri" disabled={!em} onClick={async () => { if (await executar(() => definirRetorno(d.lead.id, new Date(em).toISOString(), nota, eu!), 'Retorno salvo')) onFechar() }}>Salvar</button>
      </>}>
      <div className="space-y-4">
        <Campo rotulo="Quando o cliente pediu para falar" dica="Até lá, o painel recomenda aguardar e não sugere mensagem."><input type="datetime-local" className="inp" value={em} onChange={(e) => setEm(e.target.value)} /></Campo>
        <Campo rotulo="Nota (opcional)"><input className="inp" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: volta de férias dia 3" /></Campo>
      </div>
    </Modal>
  )
}

function ModalSimples({ titulo, rotulo, inicial, botao, dica, perigo, onSalvar, onFechar }: {
  titulo: string; rotulo: string; inicial: string; botao: string; dica?: string; perigo?: boolean; onSalvar: (v: string) => Promise<boolean>; onFechar: () => void
}) {
  const [v, setV] = useState(inicial)
  return (
    <Modal titulo={titulo} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className={perigo ? 'btn-sinal' : 'btn-pri'} disabled={!v.trim()} onClick={async () => { if (await onSalvar(v.trim())) onFechar() }}>{botao}</button></>}>
      <Campo rotulo={rotulo} dica={dica}><input className="inp" value={v} onChange={(e) => setV(e.target.value)} /></Campo>
    </Modal>
  )
}
