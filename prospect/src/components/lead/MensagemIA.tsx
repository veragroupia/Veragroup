import { useEffect, useState } from 'react'
import { Ban, Copy, Sparkles } from 'lucide-react'
import { supabase, chamarFuncao } from '../../lib/supabase'
import { invalidar } from '../../lib/dados'
import { useSessao } from '../../lib/sessao'
import { abrirWhatsApp, mudarEtapa } from '../../lib/acoes'
import type { Lead, RascunhoIA, StatusRascunho } from '../../lib/tipos'
import { cx, dataHora } from '../../lib/util'
import { useAviso, useExecutar } from '../Aviso'
import { Campo, Linhas } from '../ui'

// Mesmos ids do catálogo da função `mensagem` (tabela de preços do site).
const OFERTAS: Record<string, string> = {
  landing_express: 'Landing Express · R$ 1.200 · 5 dias',
  landing_whatsapp: 'Landing com WhatsApp automático · R$ 1.800 · 7 dias',
  site_completo: 'Site completo · R$ 2.500 a R$ 4.000 · 14 dias',
  automacao_whatsapp: 'Automação de WhatsApp · R$ 800 · 5 dias',
  sistema_sob_medida: 'Sistema sob medida · sob consulta',
}

const STATUS: Record<StatusRascunho, { nome: string; cor: string }> = {
  pronto: { nome: 'Pronto', cor: 'bg-ok/15 text-ok' },
  revisar: { nome: 'Revisar', cor: 'bg-alerta/15 text-alerta' },
  nao_contatar: { nome: 'Não contatar', cor: 'bg-sinal/10 text-sinal' },
}

export function MensagemIA({ lead, rascunhos }: { lead: Lead; rascunhos?: RascunhoIA[] }) {
  const executar = useExecutar()
  const avisar = useAviso()
  const [observacao, setObservacao] = useState('')
  const [gerando, setGerando] = useState(false)
  const [sel, setSel] = useState(0)

  async function gerar() {
    setGerando(true)
    const ok = await executar(() => chamarFuncao('mensagem', { lead_id: lead.id, observacao }))
    setGerando(false)
    if (ok) { invalidar('rascunhos_ia', 'atividades'); setSel(0); avisar('Mensagem pronta') }
  }

  if (!rascunhos) return <Linhas n={3} />
  const r = rascunhos[sel]

  return (
    <div className="space-y-4">
      <div className="folha p-4 md:p-5">
        <Campo rotulo="O que você viu sobre a empresa (opcional)" dica="Ex.: os destaques mostram bolos por encomenda e a bio leva direto ao WhatsApp. A IA só trata como fato o que estiver aqui, no cadastro ou na conversa. Endereço de site sozinho não conta como página vista.">
          <textarea className="inp" rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={2000} />
        </Campo>
        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="text-xs text-tinta-3">A IA lê o cadastro, a conversa e a tabela de preços do site e devolve até duas opções para você escolher.</p>
          <button className="btn-pri shrink-0" onClick={gerar} disabled={gerando}>
            <Sparkles size={15} className={cx(gerando && 'animate-pulsa')} /> {gerando ? 'Gerando…' : r ? 'Gerar de novo' : 'Gerar mensagem'}
          </button>
        </div>
      </div>

      {r && <Resultado key={r.id} lead={lead} r={r} />}

      {rascunhos.length > 1 && (
        <div className="folha">
          <div className="rotulo px-4 pt-4 pb-2">Geradas antes</div>
          <ul className="divide-y divide-fio">
            {rascunhos.map((x, i) => (
              <li key={x.id}>
                <button onClick={() => setSel(i)} className={cx('w-full flex items-center gap-4 px-4 py-2.5 text-sm text-left hover:bg-realce/60', i === sel && 'bg-realce')}>
                  <span className={cx('text-[11px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0', STATUS[x.status].cor)}>{STATUS[x.status].nome}</span>
                  <span className="flex-1 truncate text-tinta-2">{x.mensagem_a ?? x.proxima_acao_sugerida}</span>
                  {x.usada && <span className="text-xs text-tinta-3">usou {x.usada.toUpperCase()}</span>}
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

function Resultado({ lead, r }: { lead: Lead; r: RascunhoIA }) {
  const executar = useExecutar()
  const st = STATUS[r.status]
  const encerrado = lead.etapa === 'descartado'

  // Pedido para parar: encerra o lead, registra o motivo e pula os follow-ups.
  async function bloquear() {
    await mudarEtapa(lead.id, 'descartado', { motivo_perda: 'Pediu para não ser contatado' })
    const { error } = await supabase.from('followups').update({ status: 'pulado' }).eq('lead_id', lead.id).eq('status', 'pendente')
    if (error) throw error
    invalidar('leads', 'followups')
  }

  return (
    <div className="space-y-4">
      <div className="folha p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cx('text-xs font-mono uppercase px-2 py-1 rounded', st.cor)}>{st.nome}</span>
          {r.objetivo_da_etapa && <span className="text-sm text-tinta-2">{r.objetivo_da_etapa}</span>}
          <span className="ml-auto text-xs text-tinta-3">{dataHora(r.created_at)}</span>
        </div>
        {r.oferta_id && OFERTAS[r.oferta_id] && <p className="text-sm mt-3"><span className="rotulo mr-2">Oferta</span>{OFERTAS[r.oferta_id]}</p>}
        {r.hipotese_comercial && <p className="text-sm mt-2"><span className="rotulo mr-2">Hipótese</span><span className="text-tinta-2">{r.hipotese_comercial}</span></p>}
      </div>

      {r.status === 'nao_contatar' && (
        <div className="folha p-4 md:p-5 border-l-[3px] border-l-sinal">
          <p className="font-medium">A IA não escreveu mensagem: há pedido para parar ou recusa de contato.</p>
          {r.proxima_acao_sugerida && <p className="text-sm text-tinta-2 mt-1">{r.proxima_acao_sugerida}</p>}
          {!encerrado && (
            <button className="btn-sinal btn-sm mt-3" onClick={() => executar(bloquear, 'Lead encerrado e follow-ups pulados')}>
              <Ban size={13} /> Encerrar e não contatar
            </button>
          )}
        </div>
      )}

      {r.status === 'revisar' && r.informacoes_faltantes.length > 0 && (
        <div className="folha p-4 md:p-5 border-l-[3px] border-l-alerta">
          <div className="rotulo">Verifique antes de enviar</div>
          <ul className="mt-2 space-y-1.5">{r.informacoes_faltantes.map((t, i) => <li key={i} className="text-sm flex gap-2"><span className="font-mono text-alerta">?</span>{t}</li>)}</ul>
        </div>
      )}

      {r.mensagem_a && <Variante lead={lead} r={r} qual="a" titulo={r.status === 'revisar' ? 'Rascunho neutro' : 'Opção A · oportunidade'} />}
      {r.mensagem_b && <Variante lead={lead} r={r} qual="b" titulo="Opção B · pergunta de qualificação" />}
      {r.mensagem_a && r.mensagem_b && <p className="text-xs text-tinta-3 -mt-2">São alternativas. Envie só uma.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="folha p-4">
          <div className="rotulo mb-2.5">Por que essa escolha</div>
          <p className="text-sm leading-relaxed">{r.justificativa_curta ?? '-'}</p>
          {r.proxima_acao_sugerida && r.status !== 'nao_contatar' && <>
            <div className="rotulo mt-4 mb-1.5">Próxima ação</div>
            <p className="text-sm">{r.proxima_acao_sugerida}</p>
          </>}
          {r.status !== 'revisar' && r.informacoes_faltantes.length > 0 && <>
            <div className="rotulo mt-4 mb-1.5">Ainda falta saber</div>
            <ul className="space-y-1">{r.informacoes_faltantes.map((t, i) => <li key={i} className="text-sm text-tinta-2">{t}</li>)}</ul>
          </>}
        </div>
        <div className="folha p-4">
          <div className="rotulo mb-2.5">Fatos usados</div>
          {r.evidencias_usadas.length ? (
            <ul className="space-y-2">{r.evidencias_usadas.map((e, i) => (
              <li key={i} className="text-sm leading-snug"><span className="font-mono text-[11px] text-tinta-3 mr-1.5">{e.id}</span>{e.fato}</li>
            ))}</ul>
          ) : <p className="text-sm text-tinta-3">Nenhum.</p>}
          {r.observacao_vendedor && <p className="text-xs text-tinta-3 mt-3">Você informou: {r.observacao_vendedor}</p>}
        </div>
      </div>
      {r.modelo && <p className="text-[11px] text-tinta-3 font-mono">modelo: {r.modelo}</p>}
    </div>
  )
}

function Variante({ lead, r, qual, titulo }: { lead: Lead; r: RascunhoIA; qual: 'a' | 'b'; titulo: string }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const original = (qual === 'a' ? r.mensagem_a : r.mensagem_b) ?? ''
  const [texto, setTexto] = useState(original)
  useEffect(() => setTexto(original), [original])
  const palavras = texto.trim().split(/\s+/).filter(Boolean).length

  async function marcar() {
    await supabase.from('rascunhos_ia').update({ usada: qual }).eq('id', r.id)
    invalidar('rascunhos_ia')
  }

  return (
    <div className={cx('folha p-4 md:p-5', r.usada === qual && 'border-ok/50')}>
      <div className="flex items-center justify-between gap-3">
        <div className="rotulo">{titulo}</div>
        <span className="text-[11px] font-mono text-tinta-3">{palavras} palavras{r.usada === qual && ' · usada'}</span>
      </div>
      <textarea className="inp mt-2 text-[14px]" rows={Math.min(8, Math.max(3, Math.ceil(texto.length / 50)))} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="flex gap-2 mt-3">
        {(lead.whatsapp || lead.telefone) && (
          <button className="btn-wa btn-sm" disabled={!texto.trim()} onClick={() => executar(async () => { await abrirWhatsApp(lead, texto, eu!); await marcar() })}>Enviar pelo WhatsApp</button>
        )}
        <button className="btn-sec btn-sm" onClick={async () => { await navigator.clipboard.writeText(texto); avisar('Mensagem copiada'); marcar() }}><Copy size={13} /> Copiar</button>
      </div>
    </div>
  )
}
