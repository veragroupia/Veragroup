import { useEffect, useMemo, useRef, useState } from 'react'
import { Ban, Check, ChevronDown, Clock, Copy, EyeOff, Plus, RefreshCw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react'
import { useSessao } from '../../lib/sessao'
import { abrirWhatsApp, AVISO_SEM_REGISTRO, semRegistro } from '../../lib/acoes'
import {
  analisar, analiseAtual, aprovarRascunho, avaliarNoPainel, avaliarRascunho, bloquearContato, COR_TEMPERATURA, definirRetorno, definirTemperatura, FUNDO_TEMPERATURA, hashAtual, liberarContato,
  NOME_ACAO, NOME_CONFIANCA, NOME_ESTADO, NOME_ESTAGIO, NOME_TEMPERATURA, NOME_TEMPERATURA_CURTO, rascunhoObsoleto, registrarCopia, salvarEdicao, salvarMemoriaEquipe, textoDaOpcao,
  type BloqueioRow, type ConfigComercial, type LeadIntel, type Recomendacao, type Temperatura,
} from '../../lib/inteligencia'
import { ETAPAS, type Etapa, type Lead, type Mensagem, type RascunhoIA } from '../../lib/tipos'
import { cx, dataHora, relativo } from '../../lib/util'
import { NOME_SOLUCAO, ofertasAtivas } from '../../../supabase/functions/_shared/inteligencia/catalogo.ts'
import { SINAIS } from '../../../supabase/functions/_shared/inteligencia/tipos.ts'
import { PESOS_ADEQUACAO, PESOS_INTERESSE } from '../../../supabase/functions/_shared/inteligencia/config.ts'
import { TEXTO_OBSOLETA } from '../../../supabase/functions/_shared/inteligencia/validade.ts'
import { bloqueioDoLead } from '../../../supabase/functions/_shared/inteligencia/conversa.ts'
import { NOME_FOCO } from '../../../supabase/functions/_shared/inteligencia/diretrizes.ts'
import { NOME_SECAO, type ItemMemoria, type SecaoMemoria } from '../../../supabase/functions/_shared/inteligencia/memoria.ts'
import { NOME_CRITERIO, type AvaliacaoMensagem, type Criterio } from '../../../supabase/functions/_shared/inteligencia/qualidade.ts'
import type { Evidenciado } from '../../../supabase/functions/_shared/inteligencia/analise.ts'
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
    <span className={cx('inline-flex items-center gap-1.5 font-semibold whitespace-nowrap', COR_TEMPERATURA[t], grande ? 'text-xl' : 'text-sm')} title={NOME_TEMPERATURA[t]}>
      <span className={cx('rounded-full shrink-0', FUNDO_TEMPERATURA[t], grande ? 'w-2.5 h-2.5' : 'w-2 h-2')} />{grande ? NOME_TEMPERATURA[t] : NOME_TEMPERATURA_CURTO[t]}
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

export interface EstadoPreparo { estado: 'preparando' | 'erro'; msg?: string }

export function PainelInteligencia({ d, rascunhos, preparo }: { d: DadosInteligencia; rascunhos?: RascunhoIA[]; preparo?: EstadoPreparo | null }) {
  const r = useRecomendacao(d)
  const executar = useExecutar()
  const avisar = useAviso()
  const [observacao, setObservacao] = useState('')
  const [rodando, setRodando] = useState<null | 'analisar' | 'gerar'>(null)
  const [sel, setSel] = useState(0)
  const atual = analiseAtual(d.intel, d.mensagens)
  const hash = useMemo(() => hashAtual(d), [d])

  async function rodar(modo: 'analisar' | 'gerar', forcar = false) {
    setRodando(modo)
    let res: Awaited<ReturnType<typeof analisar>> | undefined
    await executar(async () => { res = await analisar(d.lead.id, modo, { observacao, forcar, origem: 'manual' }) })
    setRodando(null)
    if (!res) return
    setSel(0)
    avisar(modo === 'analisar' ? (res.reaproveitada ? 'Nada mudou desde a última análise' : 'Análise atualizada')
      : res.rascunho_reaproveitado ? 'O rascunho atual já vale para esta conversa'
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
          {rasc && <span className="text-xs text-tinta-3">{rasc.origem === 'automatico' ? 'Preparada ao abrir o lead · ' : rasc.origem === 'lote' ? 'Preparada em lote · ' : ''}{dataHora(rasc.created_at)}</span>}
        </div>
        {preparo?.estado === 'preparando' && (
          <p className="text-sm text-tinta-2 inline-flex items-center gap-2 mb-3"><Sparkles size={14} className="animate-pulsa" /> Preparando a mensagem para a conversa de agora…</p>
        )}
        {preparo?.estado === 'erro' && (
          <p className="text-sm text-alerta mb-3">Não deu para preparar sozinho: {preparo.msg}. O resto do painel funciona normalmente; tente "Gerar mensagem" depois.</p>
        )}
        {!r.bloqueado && (
          <>
            <Campo rotulo="O que você viu sobre a empresa (opcional)" dica="Ex.: os destaques mostram bolos por encomenda e a bio leva direto ao WhatsApp. A IA só trata como fato o que está aqui, no cadastro, na memória confirmada ou na conversa.">
              <textarea className="inp" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={2000} />
            </Campo>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <p className="text-xs text-tinta-3 max-w-md">
                {r.decisao.gerarMensagem ? 'A IA lê a conversa e a memória do lead e escreve até duas opções diferentes. Nada é enviado sozinho.' : `Agora a recomendação é ${NOME_ACAO[r.decisao.acao].toLowerCase()}. A IA não vai inventar mensagem; ela só atualiza a análise.`}
              </p>
              <button className="btn-pri shrink-0" onClick={() => rodar('gerar', !!rasc && !!observacao)} disabled={!!rodando || preparo?.estado === 'preparando'}>
                <Sparkles size={15} className={cx(rodando === 'gerar' && 'animate-pulsa')} /> {rodando === 'gerar' ? 'Pensando…' : r.decisao.gerarMensagem ? (rasc ? 'Gerar de novo' : 'Gerar mensagem') : 'Reavaliar'}
              </button>
            </div>
          </>
        )}
        {r.bloqueado && !rasc && <p className="text-sm text-tinta-3">Nenhuma mensagem é preparada para um contato bloqueado.</p>}
        {rasc && <Rascunho key={rasc.id} r={rasc} d={d} hash={hash} bloqueado={r.bloqueado} onRegenerar={() => rodar('gerar', true)} />}
      </section>

      <Memoria r={r} d={d} />
      <AjustesEquipe d={d} r={r} />

      {rascunhos.length > 1 && (
        <div className="folha">
          <div className="rotulo px-4 pt-4 pb-2">Histórico de sugestões</div>
          <ul className="divide-y divide-fio">
            {rascunhos.map((x, i) => (
              <li key={x.id}>
                <button onClick={() => setSel(i)} className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-realce/60', i === sel && 'bg-realce')}>
                  <span className="font-mono text-[11px] uppercase text-tinta-3 w-24 shrink-0 truncate">{x.acao ? NOME_ACAO[x.acao as keyof typeof NOME_ACAO] ?? x.acao : x.status}</span>
                  <span className="flex-1 truncate text-tinta-2">{x.texto_editado_a ?? x.mensagem_a ?? x.motivo ?? x.proxima_acao_sugerida}</span>
                  {x.avaliacao_humana === 1 && <ThumbsUp size={12} className="text-ok" />}{x.avaliacao_humana === -1 && <ThumbsDown size={12} className="text-sinal" />}
                  {x.enviada_confirmada_em ? <span className="text-xs text-ok">enviada</span> : x.aprovada_variante ? <span className="text-xs text-tinta-3">aprovou {x.aprovada_variante.toUpperCase()}</span> : x.usada && <span className="text-xs text-tinta-3">usou {x.usada.toUpperCase()}</span>}
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
        <Diagnostico d={d} />
        {r.desconhecido.length > 0 && (
          <div>
            <dt className="rotulo">Ainda falta saber</dt>
            <dd><ul className="mt-1 space-y-1">{(todos ? r.desconhecido : r.desconhecido.slice(0, 3)).map((x, i) => <li key={i} className="flex gap-2"><span className="font-mono text-alerta">?</span>{x}</li>)}</ul>
              {r.desconhecido.length > 3 && <button className="text-xs text-tinta-3 hover:text-tinta mt-1" onClick={() => setTodos((v) => !v)}>{todos ? 'Mostrar menos' : `+ ${r.desconhecido.length - 3}`}</button>}
            </dd>
          </div>
        )}
      </dl>
      {r.sinais_desconsiderados.length > 0 && (
        <p className="text-xs text-tinta-3 mt-3">Fora da conta: {r.sinais_desconsiderados.map((x) => `${SINAIS[x.codigo].nome.toLowerCase()} (${x.motivo.toLowerCase()})`).join('; ')}.</p>
      )}
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
      {r.decisao.gerarMensagem && !r.bloqueado && (
        <div className="mt-4">
          <div className="rotulo">Próxima mensagem</div>
          <p className="text-sm mt-1">
            {r.diretrizes.hora_de_vender ? <b className="font-medium text-ok">Hora de apresentar a solução.</b> : r.diretrizes.foco ? <>Descobrir <b className="font-medium">{NOME_FOCO[r.diretrizes.foco]}</b>.</> : <b className="font-medium">Sem pergunta agora.</b>}
            {' '}<span className="text-tinta-2">{r.diretrizes.motivo}</span>
          </p>
          {r.diretrizes.informar_preco && <p className="text-xs text-tinta-3 mt-1">Responder o valor: {r.diretrizes.informar_preco.oferta}, {r.diretrizes.informar_preco.preco}.</p>}
          {r.leitura.perguntaNossaPendente && r.leitura.ultimaDe === 'vera' && <p className="text-xs text-tinta-3 mt-1">Sua última pergunta ainda sem resposta: “{r.leitura.perguntaNossaPendente}”</p>}
        </div>
      )}
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

function Rascunho({ r, d, hash, bloqueado, onRegenerar }: { r: RascunhoIA; d: DadosInteligencia; hash: string; bloqueado: boolean; onRegenerar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const ultima = d.mensagens[d.mensagens.length - 1]?.enviada_em ?? null
  const obsoleta = rascunhoObsoleto(r, d.lead, bloqueado, d.config, ultima, hash)
  const v4 = !!r.prompt_version
  const opcoes = [
    r.mensagem_a ? { qual: 'a' as const, titulo: v4 ? 'Opção A · natural' : r.status === 'revisar' ? 'Rascunho neutro' : 'Opção A', texto: r.mensagem_a } : null,
    r.mensagem_b ? { qual: 'b' as const, titulo: v4 ? 'Opção B · estratégica' : 'Opção B', texto: r.mensagem_b } : null,
  ].filter(Boolean) as { qual: 'a' | 'b'; titulo: string; texto: string }[]
  const recomendada = (r.melhor_opcao ?? 'A').toLowerCase()

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
      {r.status === 'revisar' && (
        <div className="rounded border border-alerta/40 px-3 py-2">
          <div className="rotulo">Revise antes de enviar</div>
          {r.informacoes_faltantes.length > 0 && <ul className="mt-1 space-y-1">{r.informacoes_faltantes.slice(0, 4).map((t, i) => <li key={i} className="text-sm flex gap-2"><span className="font-mono text-alerta">?</span>{t}</li>)}</ul>}
          {!r.informacoes_faltantes.length && <p className="text-sm mt-1 text-tinta-2">A checagem automática encontrou um ponto que precisa de olho humano (veja os alertas abaixo).</p>}
        </div>
      )}
      {opcoes.map((o) => (
        <Variante key={o.qual} r={r} d={d} qual={o.qual} titulo={o.titulo} original={textoDaOpcao(r, o.qual) ?? o.texto}
          recomendada={opcoes.length > 1 && recomendada === o.qual} bloqueada={!!obsoleta || bloqueado}
          qualidade={r.qualidade?.[o.qual] ?? null} />
      ))}
      {opcoes.length > 1 && <p className="text-xs text-tinta-3">São alternativas. Envie só uma.</p>}
      {(r.alertas?.length ?? 0) > 0 && !r.qualidade && <ul className="text-xs text-alerta space-y-1">{r.alertas!.map((a, i) => <li key={i} className="flex gap-1.5"><TriangleAlert size={12} className="mt-0.5 shrink-0" />{a}</li>)}</ul>}
      {opcoes.length > 0 && r.justificativa_curta && <p className="text-sm text-tinta-2"><span className="rotulo mr-2">Por quê</span>{r.justificativa_curta}</p>}
      {opcoes.length > 0 && <AvaliacaoHumana r={r} onSalvar={(nota, comentario) => executar(() => avaliarRascunho(r, nota, comentario, eu!), nota ? 'Avaliação registrada' : undefined)} />}
      <div className="flex items-center gap-3 text-[11px] text-tinta-3 font-mono">
        {r.modelo && <span>modelo: {r.modelo}</span>}{r.prompt_version && <span>{r.prompt_version}</span>}
        {!obsoleta && opcoes.length > 0 && <button className="ml-auto inline-flex items-center gap-1 hover:text-tinta" onClick={onRegenerar}><RefreshCw size={11} /> Regenerar</button>}
      </div>
    </div>
  )
}

/** Eventos da opção, na ordem em que acontecem. Abertura do WhatsApp não é envio. */
function Eventos({ r, qual, editado }: { r: RascunhoIA; qual: 'a' | 'b'; editado: boolean }) {
  const itens = [
    'gerada',
    editado && 'editada',
    r.aprovada_variante === qual && 'aprovada',
    r.copiada_em && r.usada === qual && 'copiada',
    r.enviada_confirmada_em && r.usada === qual && 'envio confirmado',
  ].filter(Boolean) as string[]
  return <span className="text-[11px] font-mono text-tinta-3">{itens.join(' · ')}</span>
}

function Variante({ r, d, qual, titulo, original, recomendada, bloqueada, qualidade }: {
  r: RascunhoIA; d: DadosInteligencia; qual: 'a' | 'b'; titulo: string; original: string; recomendada: boolean; bloqueada: boolean; qualidade: AvaliacaoMensagem | null
}) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const [texto, setTexto] = useState(original)
  const salvo = useRef(original)
  useEffect(() => { setTexto(original); salvo.current = original }, [original])
  const enviada = !!r.enviada_confirmada_em && r.usada === qual
  const gerado = qual === 'a' ? r.mensagem_a : r.mensagem_b
  const editado = texto.trim() !== (gerado ?? '').trim()
  const aprovada = r.aprovada_variante === qual

  // A edição é salva sozinha (sem sobrescrever o texto gerado, que fica no histórico).
  useEffect(() => {
    if (enviada || texto === salvo.current) return
    const t = setTimeout(() => { salvo.current = texto; salvarEdicao(r.id, qual, texto).catch(() => avisar('Não deu para salvar a edição', 'erro')) }, 900)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps

  async function copiar() {
    await navigator.clipboard.writeText(texto)
    avisar('Mensagem copiada')
    await registrarCopia(r, qual, texto, eu!)
  }
  async function whatsapp() {
    let ret: unknown
    if (await executar(async () => { ret = await abrirWhatsApp(d.lead, texto, eu!, undefined, { rascunhoId: r.id, variante: qual }) }) && semRegistro(ret)) avisar(AVISO_SEM_REGISTRO, 'erro')
  }
  const falhas = qualidade ? (Object.entries(qualidade.criterios) as [Criterio, AvaliacaoMensagem['criterios'][Criterio]][]).filter(([, v]) => !v.ok) : []

  return (
    <div className={cx('rounded-lg border p-3.5', enviada ? 'border-ok/50' : aprovada ? 'border-ok/40' : recomendada ? 'border-tinta-3' : 'border-fio')}>
      <div className="flex items-center justify-between gap-3">
        <div className="rotulo">{titulo}{recomendada && <span className="ml-2 normal-case tracking-normal text-[11px] text-ok font-sans">recomendada</span>}</div>
        <span className="text-[11px] font-mono text-tinta-3">{texto.trim().split(/\s+/).filter(Boolean).length} palavras</span>
      </div>
      <textarea className="inp mt-2 text-[14px]" rows={Math.min(8, Math.max(3, Math.ceil(texto.length / 55)))} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={bloqueada || enviada} />
      {qualidade && (
        falhas.length === 0
          ? <p className="text-[11px] text-ok mt-1.5">Checagem automática: nada a corrigir ({Object.keys(qualidade.criterios).length} critérios).</p>
          : <ul className="mt-1.5 space-y-0.5">{falhas.map(([k, v]) => <li key={k} className={cx('text-[12px] flex gap-1.5', v.grave ? 'text-sinal' : 'text-alerta')}><TriangleAlert size={12} className="mt-0.5 shrink-0" /><span><b className="font-medium">{NOME_CRITERIO[k]}:</b> {v.nota}</span></li>)}</ul>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-2.5">
        {(d.lead.whatsapp || d.lead.telefone) && (
          <button className="btn-wa btn-sm" disabled={!texto.trim() || bloqueada || enviada} onClick={whatsapp}>Abrir no WhatsApp</button>
        )}
        <button className="btn-sec btn-sm" disabled={bloqueada} onClick={copiar}><Copy size={13} /> Copiar</button>
        {!enviada && <button className={cx('btn-sm', aprovada ? 'btn-sec !text-ok' : 'btn-fantasma')} disabled={bloqueada || aprovada} onClick={() => executar(() => aprovarRascunho(r, qual, texto, eu!), 'Opção aprovada')}><Check size={13} /> {aprovada ? 'Aprovada' : 'Aprovar'}</button>}
        <span className="ml-auto"><Eventos r={r} qual={qual} editado={editado} /></span>
      </div>
    </div>
  )
}

function AvaliacaoHumana({ r, onSalvar }: { r: RascunhoIA; onSalvar: (nota: -1 | 1 | null, comentario: string) => Promise<unknown> }) {
  const [nota, setNota] = useState<-1 | 1 | null>(r.avaliacao_humana ?? null)
  const [comentario, setComentario] = useState(r.avaliacao_nota ?? '')
  const [aberto, setAberto] = useState(false)
  const escolher = (n: -1 | 1) => { const v = nota === n ? null : n; setNota(v); if (v === 1 || v === null) { setAberto(false); onSalvar(v, '') } else setAberto(true) }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-tinta-3 text-xs">Esta sugestão está boa?</span>
      <button className={cx('btn-icone w-8 h-8', nota === 1 && '!text-ok !border-ok/50')} onClick={() => escolher(1)} aria-label="Boa"><ThumbsUp size={14} /></button>
      <button className={cx('btn-icone w-8 h-8', nota === -1 && '!text-sinal !border-sinal/50')} onClick={() => escolher(-1)} aria-label="Ruim"><ThumbsDown size={14} /></button>
      {aberto && (
        <span className="flex items-center gap-2 flex-1 min-w-[220px]">
          <input className="inp !py-1.5 text-sm" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="O que está ruim? (opcional)" />
          <button className="btn-sec btn-sm" onClick={() => { setAberto(false); onSalvar(-1, comentario) }}>Salvar</button>
        </span>
      )}
    </div>
  )
}

/* ---------- Diagnóstico (SPIN e CHAMP por dentro) ---------- */

function Diagnostico({ d }: { d: DadosInteligencia }) {
  const m = d.intel?.analise?.memoria
  if (!m) return null
  const linhas: [string, Evidenciado | null][] = [
    ['Situação conhecida', m.spin.situacao], ['Problema identificado', m.spin.problema], ['Impacto conhecido', m.spin.implicacao],
    ['Valor de resolver', m.spin.valor], ['Desafio principal', m.champ.desafio], ['Quem decide', m.champ.autoridade],
    ['Condições', m.champ.condicoes], ['Prioridade', m.champ.prioridade],
  ]
  const conhecidas = linhas.filter(([, v]) => v)
  return (
    <div>
      <dt className="rotulo">Diagnóstico</dt>
      <dd className="mt-1 space-y-1">
        {conhecidas.length === 0 && <span className="text-tinta-3">Ainda nada confirmado pelo cliente.</span>}
        {conhecidas.map(([k, v]) => <div key={k}><span className="text-tinta-3">{k}: </span>{v!.texto}</div>)}
        {conhecidas.length > 0 && conhecidas.length < linhas.length && (
          <div className="text-xs text-tinta-3">Sem informação ainda: {linhas.filter(([, v]) => !v).map(([k]) => k.toLowerCase()).join(', ')}. Só vale perguntar o que muda o próximo passo.</div>
        )}
      </dd>
    </div>
  )
}

/* ---------- Memória comercial (a equipe corrige) ---------- */

const SECOES_VISIVEIS: SecaoMemoria[] = ['confirmados', 'hipoteses', 'necessidades', 'perguntas_respondidas', 'objecoes', 'objecoes_resolvidas', 'compromissos', 'ofertas']

function Memoria({ r, d }: { r: Recomendacao; d: DadosInteligencia }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const [novo, setNovo] = useState('')
  const [horas, setHoras] = useState({ inicio: d.intel?.memoria_equipe?.horario_funcionamento?.inicio ?? '', fim: d.intel?.memoria_equipe?.horario_funcionamento?.fim ?? '' })
  const atual = d.intel?.memoria_equipe ?? null
  const total = SECOES_VISIVEIS.reduce((n, k) => n + r.memoria[k].length, 0)
  const salvar = (mudar: Parameters<typeof salvarMemoriaEquipe>[2], detalhe: Record<string, unknown>, ok: string) =>
    executar(() => salvarMemoriaEquipe(d.lead.id, atual, mudar, eu!, detalhe), ok)
  const ocultar = (i: ItemMemoria) => salvar((m) => ({ ...m, ocultar: [...(m.ocultar ?? []), i.chave] }), { acao: 'ocultar', item: i.texto }, 'Item marcado como errado')
  const confirmar = (i: ItemMemoria) => salvar((m) => ({ ...m, fatos: [...(m.fatos ?? []), { texto: i.texto, por: eu!.email, em: new Date().toISOString() }], ocultar: [...(m.ocultar ?? []), i.chave] }), { acao: 'confirmar', item: i.texto }, 'Hipótese confirmada pela equipe')

  return (
    <details className="folha p-4 md:p-5 group" open={total > 0 && total <= 6}>
      <summary className="cursor-pointer select-none flex items-center gap-2">
        <h3 className="font-semibold">Memória do lead</h3><span className="numero text-sm text-tinta-3">{total}</span>
        <span className="text-xs text-tinta-3 hidden sm:inline">o que já se sabe, para a IA não perguntar de novo</span>
        <ChevronDown size={15} className="ml-auto text-tinta-3 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="mt-4 grid md:grid-cols-2 gap-x-6 gap-y-4">
        {SECOES_VISIVEIS.filter((k) => r.memoria[k].length > 0).map((k) => (
          <div key={k}>
            <div className="rotulo">{NOME_SECAO[k]}</div>
            <ul className="mt-1.5 space-y-1.5">
              {r.memoria[k].map((i) => (
                <li key={i.chave} className="text-sm flex gap-2 group/item">
                  <span className="flex-1">{i.texto}{i.detalhe && <span className="text-tinta-3 text-xs"> · {i.detalhe}</span>}
                    <span className="font-mono text-[10px] text-tinta-3 ml-1.5">{i.origem}</span></span>
                  {k === 'hipoteses' && <button className="text-xs text-ok hover:underline shrink-0" onClick={() => confirmar(i)}>Confirmar</button>}
                  {i.origem !== 'regra' && <button className="text-tinta-3 hover:text-sinal shrink-0 opacity-60 group-hover/item:opacity-100" title="Marcar como errado" onClick={() => ocultar(i)}><EyeOff size={13} /></button>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {total === 0 && <p className="text-sm text-tinta-3 md:col-span-2">Ainda vazia. A memória enche com a análise da conversa e com o que a equipe confirmar.</p>}
      </div>
      <div className="mt-5 pt-4 border-t border-fio grid md:grid-cols-[1fr_auto] gap-4 items-end">
        <Campo rotulo="Adicionar fato confirmado" dica="Algo que a equipe verificou (ex.: atende só por encomenda, dona é a Márcia). Vira fato para a IA.">
          <div className="flex gap-2">
            <input className="inp" value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={300} placeholder="Ex.: recebe pedidos só pelo WhatsApp" />
            <button className="btn-sec shrink-0" disabled={!novo.trim()} onClick={async () => { if (await salvar((m) => ({ ...m, fatos: [...(m.fatos ?? []), { texto: novo.trim(), por: eu!.email, em: new Date().toISOString() }] }), { acao: 'adicionar', item: novo.trim() }, 'Fato salvo')) setNovo('') }}><Plus size={14} /> Adicionar</button>
          </div>
        </Campo>
        <Campo rotulo="Horário de funcionamento" dica="Verificado pela equipe. Melhora a recomendação de horário.">
          <div className="flex items-center gap-2">
            <input type="time" className="inp !w-28" value={horas.inicio} onChange={(e) => setHoras((h) => ({ ...h, inicio: e.target.value }))} />
            <span className="text-tinta-3">até</span>
            <input type="time" className="inp !w-28" value={horas.fim} onChange={(e) => setHoras((h) => ({ ...h, fim: e.target.value }))} />
            <button className="btn-sec shrink-0" disabled={!!horas.inicio !== !!horas.fim || (!!horas.inicio && horas.inicio >= horas.fim)}
              onClick={() => salvar((m) => ({ ...m, horario_funcionamento: horas.inicio ? horas : null }), { acao: 'horario', valor: horas }, 'Horário salvo')}>Salvar</button>
          </div>
        </Campo>
      </div>
    </details>
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
            <option value="">Automática (pelas evidências)</option><option value="frio">Frio</option><option value="desconhecido">Interesse desconhecido</option><option value="morno">Morno</option><option value="quente">Quente</option>
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
