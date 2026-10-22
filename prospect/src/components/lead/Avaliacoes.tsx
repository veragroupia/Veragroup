import { useState } from 'react'
import { Copy, Sparkles } from 'lucide-react'
import { chamarFuncao } from '../../lib/supabase'
import { invalidar } from '../../lib/dados'
import { useSessao } from '../../lib/sessao'
import { abrirWhatsApp } from '../../lib/acoes'
import type { Avaliacao, Lead } from '../../lib/tipos'
import { cx, dataHora } from '../../lib/util'
import { useAviso, useExecutar } from '../Aviso'
import { Linhas, Vazio } from '../ui'

// Ordem do Método Vera: Dor, Perda, Potencial e só então Solução.
const CRITERIOS = [
  { id: 'dor', nome: 'Dor', dica: 'Achou o problema real do negócio' },
  { id: 'perda', nome: 'Perda', dica: 'Transformou a dor em reais por mês' },
  { id: 'potencial', nome: 'Potencial', dica: 'Mostrou o quanto pode ganhar' },
  { id: 'solucao', nome: 'Solução', dica: 'Ofereceu na hora certa' },
  { id: 'rapport', nome: 'Rapport', dica: 'Conversa humana, confiança' },
  { id: 'clareza', nome: 'Clareza', dica: 'Mensagens curtas e diretas' },
] as const

const TEMPERATURA = { frio: 'text-info', morno: 'text-alerta', quente: 'text-sinal' } as const

export function Avaliacoes({ lead, avaliacoes, temMensagens }: { lead: Lead; avaliacoes?: Avaliacao[]; temMensagens: boolean }) {
  const executar = useExecutar()
  const avisar = useAviso()
  const { eu } = useSessao()
  const [avaliando, setAvaliando] = useState(false)
  const [sel, setSel] = useState(0)

  async function avaliar() {
    setAvaliando(true)
    const ok = await executar(() => chamarFuncao('avaliar', { lead_id: lead.id }))
    setAvaliando(false)
    if (ok) { invalidar('avaliacoes', 'followups'); setSel(0); avisar('Avaliação pronta') }
  }

  if (!avaliacoes) return <Linhas n={3} />
  const a = avaliacoes[sel]

  if (!a) return (
    <div className="folha">
      <Vazio titulo="Nenhuma avaliação ainda." icone={<Sparkles size={18} />}>
        {temMensagens ? 'A IA lê a conversa e dá nota em cada etapa do Método Vera. Para temperatura, próxima ação e mensagem, use a aba Inteligência.' : 'Registre ou importe a conversa primeiro. A IA precisa de mensagens para avaliar.'}
      </Vazio>
      {temMensagens && <div className="text-center pb-8"><button className="btn-pri" onClick={avaliar} disabled={avaliando}><Sparkles size={15} /> {avaliando ? 'Avaliando…' : 'Avaliar conversa'}</button></div>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="folha p-4 md:p-5">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <div className="rotulo">Nota geral</div>
            <div className="numero text-5xl font-medium mt-1">{a.nota_geral != null ? String(a.nota_geral).replace('.', ',') : '-'}<span className="text-xl text-tinta-3">/10</span></div>
          </div>
          {a.temperatura && <div><div className="rotulo">Temperatura</div><div className={cx('text-xl font-semibold mt-2 capitalize', TEMPERATURA[a.temperatura])}>{a.temperatura}</div></div>}
          {a.probabilidade != null && <div title="Palpite do modelo de IA nesta avaliação. Não é probabilidade estatística de fechamento."><div className="rotulo">Palpite da IA</div><div className="numero text-xl mt-2">{a.probabilidade}<span className="text-sm text-tinta-3">/100</span></div><div className="text-[11px] text-tinta-3 mt-0.5">não é probabilidade</div></div>}
          <div className="ml-auto text-right">
            <div className="text-xs text-tinta-3">{a.alvo === 'reuniao' ? 'Reunião' : 'Conversa'} · {dataHora(a.created_at)}</div>
            <button className="btn-sec btn-sm mt-2" onClick={avaliar} disabled={avaliando}><Sparkles size={13} /> {avaliando ? 'Avaliando…' : 'Avaliar de novo'}</button>
          </div>
        </div>
        {a.resumo && <p className="mt-5 text-[15px] leading-relaxed">{a.resumo}</p>}
      </div>

      {(a.proxima_acao || a.proxima_mensagem) && (
        <div className="folha p-4 md:p-5 border-l-[3px] border-l-sinal">
          {a.proxima_acao && <><div className="rotulo">Próxima ação</div><p className="mt-1.5 font-medium">{a.proxima_acao}</p></>}
          {a.proxima_mensagem && (
            <>
              <div className="rotulo mt-4">Mensagem sugerida</div>
              <p className="mt-1.5 text-[14px] leading-relaxed whitespace-pre-wrap bg-realce rounded p-3">{a.proxima_mensagem}</p>
              <div className="flex gap-2 mt-3">
                <button className="btn-wa btn-sm" onClick={() => executar(() => abrirWhatsApp(lead, a.proxima_mensagem!, eu!))}>Enviar pelo WhatsApp</button>
                <button className="btn-sec btn-sm" onClick={() => { navigator.clipboard.writeText(a.proxima_mensagem!); avisar('Mensagem copiada') }}><Copy size={13} /> Copiar</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="folha p-4 md:p-5">
        <div className="rotulo mb-4">Método Vera</div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
          {CRITERIOS.map((c) => {
            const v = a.notas?.[c.id] ?? 0
            return (
              <div key={c.id} title={c.dica}>
                <div className="flex justify-between text-sm"><span>{c.nome}</span><span className="numero text-tinta-2">{String(v).replace('.', ',')}</span></div>
                <div className="h-1.5 rounded-full bg-realce mt-1.5 overflow-hidden">
                  <div className={cx('h-full rounded-full', v >= 7 ? 'bg-ok' : v >= 4 ? 'bg-alerta' : 'bg-sinal')} style={{ width: `${v * 10}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <ListaAv titulo="Pontos fortes" itens={a.pontos_fortes} marca="+" cor="text-ok" />
        <ListaAv titulo="O que melhorar" itens={a.melhorias} marca="→" cor="text-alerta" />
        <ListaAv titulo="Objeções do lead" itens={a.objecoes} marca="?" cor="text-info" />
      </div>

      {avaliacoes.length > 1 && (
        <div className="folha">
          <div className="rotulo px-4 pt-4 pb-2">Avaliações anteriores</div>
          <ul className="divide-y divide-fio">
            {avaliacoes.map((x, i) => (
              <li key={x.id}>
                <button onClick={() => setSel(i)} className={cx('w-full flex items-center gap-4 px-4 py-2.5 text-sm text-left hover:bg-realce/60', i === sel && 'bg-realce')}>
                  <span className="numero w-10">{x.nota_geral != null ? String(x.nota_geral).replace('.', ',') : '-'}</span>
                  <span className="flex-1 truncate text-tinta-2">{x.resumo}</span>
                  <span className="text-xs text-tinta-3 whitespace-nowrap">{x.alvo === 'reuniao' ? 'Reunião · ' : ''}{dataHora(x.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.modelo && <p className="text-[11px] text-tinta-3 font-mono">modelo: {a.modelo}</p>}
    </div>
  )
}

function ListaAv({ titulo, itens, marca, cor }: { titulo: string; itens: string[]; marca: string; cor: string }) {
  return (
    <div className="folha p-4">
      <div className="rotulo mb-2.5">{titulo}</div>
      {itens?.length ? (
        <ul className="space-y-2">{itens.map((t, i) => <li key={i} className="text-sm flex gap-2 leading-snug"><span className={cn(cor)}>{marca}</span><span>{t}</span></li>)}</ul>
      ) : <p className="text-sm text-tinta-3">Nada.</p>}
    </div>
  )
}
const cn = (c: string) => cx('font-mono shrink-0', c)
