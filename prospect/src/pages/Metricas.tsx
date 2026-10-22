import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { ETAPAS, type Atividade, type Etapa, type Lead, type RadarExecucao } from '../lib/tipos'
import { brl, cx, data, dataHora, nichoValido, pct } from '../lib/util'
import { Avatar, Erro, Esqueleto, Kpi, Pagina, Secao, Segmentos } from '../components/ui'
import { AMOSTRA_MINIMA, calcular, enviada, type MsgM, type RascM, type RecebidoM, type Taxa } from '../lib/metricas'
import { NOME_ACAO, NOME_TEMPERATURA } from '../lib/inteligencia'

type L = Pick<Lead, 'id' | 'etapa' | 'created_at' | 'responsavel' | 'ultimo_contato_em' | 'ultima_resposta_em' | 'fechado_em' | 'valor_mensal' | 'valor_setup' | 'motivo_perda' | 'nicho' | 'cidade' | 'whatsapp' | 'telefone'>
type Periodo = '7' | '30' | '90'

export default function Metricas() {
  const { equipe } = useSessao()
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const desde = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - Number(periodo) + 1); return d }, [periodo])
  const desdeIso = desde.toISOString()

  const leads = useConsulta('met:leads', () => q<L[]>(supabase.from('leads')
    .select('id, etapa, created_at, responsavel, ultimo_contato_em, ultima_resposta_em, fechado_em, valor_mensal, valor_setup, motivo_perda, nicho, cidade, whatsapp, telefone').limit(10000)), ['leads'])
  const base = useConsulta(`met:comercial:${periodo}`, async () => {
    // Sem a migration 0004, cai para as colunas antigas (todos os envios contam como não confirmados).
    let msgs = await supabase.from('mensagens').select('id, lead_id, direcao, confirmada, origem, enviada_em, autor').limit(50000)
    if (msgs.error) msgs = await supabase.from('mensagens').select('id, lead_id, direcao, origem, enviada_em, autor').limit(50000) as typeof msgs
    const [envios, intel, hist, rasc, props, recebidos] = await Promise.all([
      supabase.from('envios').select('status, aberto_em').gte('aberto_em', desdeIso),
      supabase.from('lead_inteligencia').select('lead_id, estagio, necessidade, sinais, analisado_em'),
      supabase.from('lead_inteligencia_historico').select('lead_id, temperatura, created_at').in('origem', ['ia', 'regra']).order('created_at').limit(20000),
      supabase.from('rascunhos_ia').select('lead_id, usada, enviada_confirmada_em, acao, avaliacao_humana, created_at').limit(20000),
      supabase.from('propostas').select('status, enviada_em'),
      // Receita efetivamente recebida: lançamentos de receita pagos no período (Financeiro).
      supabase.from('fin_lancamentos').select('valor, pago_em').eq('tipo', 'receita').gte('pago_em', desdeIso),
    ])
    // Sem as colunas novas de rascunhos (migration 0005), cai para as antigas.
    let rascunhos = rasc.data as RascM[] | null
    if (rasc.error) rascunhos = ((await supabase.from('rascunhos_ia').select('lead_id, usada, enviada_confirmada_em, acao, created_at').limit(20000)).data ?? []) as RascM[]
    return {
      mensagens: (msgs.data ?? []) as MsgM[], envios: envios.data ?? [], intel: intel.data ?? [], historico: hist.data ?? [],
      rascunhos: rascunhos ?? [], propostas: props.data ?? [], recebidos: (recebidos.data ?? []) as RecebidoM[],
    }
  }, ['mensagens', 'envios', 'lead_inteligencia', 'rascunhos_ia', 'propostas', 'fin'])
  const ativ = useConsulta(`met:ativ:${periodo}`, () => q<Atividade[]>(supabase.from('atividades')
    .select('id, lead_id, tipo, detalhe, usuario, created_at').gte('created_at', desdeIso).limit(20000)), ['atividades'])
  const notas = useConsulta(`met:av:${periodo}`, () => q<{ nota_geral: number | null }[]>(supabase.from('avaliacoes').select('nota_geral').gte('created_at', desdeIso)), ['avaliacoes'])
  const radar = useConsulta('met:radar', () => q<RadarExecucao[]>(supabase.from('radar_execucoes').select('*').order('iniciado_em', { ascending: false }).limit(8)), [])

  const c = useMemo(() => (leads.data && base.data ? calcular({ desde, leads: leads.data, ...base.data }) : null), [leads.data, base.data, desde])

  const m = useMemo(() => {
    if (!leads.data || !ativ.data || !base.data) return null
    const noPeriodo = (s?: string | null) => !!s && new Date(s) >= desde
    // Contato = envio confirmado (abrir o WhatsApp não conta).
    const contatos = base.data.mensagens.filter((x) => enviada(x) && noPeriodo(x.enviada_em)).map((x) => ({ lead_id: x.lead_id, created_at: x.enviada_em, usuario: x.autor }))
    const contatados = new Set(contatos.map((a) => a.lead_id))
    const respondidos = leads.data.filter((l) => noPeriodo(l.ultima_resposta_em))
    const mudancas = ativ.data.filter((a) => a.tipo === 'etapa')
    const chegaram = (e: Etapa) => new Set(mudancas.filter((a) => a.detalhe.para === e).map((a) => a.lead_id))
    const fechados = leads.data.filter((l) => l.etapa === 'fechado' && noPeriodo(l.fechado_em))
    const perdidos = leads.data.filter((l) => l.etapa === 'perdido' && l.motivo_perda)

    // Contatos por dia
    const dias: { dia: Date; n: number }[] = []
    for (let d = new Date(desde); d <= new Date(); d.setDate(d.getDate() + 1)) dias.push({ dia: new Date(d), n: 0 })
    for (const c of contatos) {
      const i = Math.floor((new Date(c.created_at).getTime() - desde.getTime()) / 86400e3)
      if (dias[i]) dias[i].n++
    }

    const porVendedor = equipe.map((v) => {
      const meus = contatos.filter((c) => c.usuario === v.email)
      const leadsMeus = new Set(meus.map((c) => c.lead_id))
      return {
        v, contatos: meus.length, leads: leadsMeus.size,
        respostas: leads.data!.filter((l) => leadsMeus.has(l.id) && noPeriodo(l.ultima_resposta_em)).length,
        reunioes: mudancas.filter((a) => a.detalhe.para === 'reuniao_marcada' && a.usuario === v.email).length,
        fechados: fechados.filter((l) => l.responsavel === v.email).length,
        mrr: fechados.filter((l) => l.responsavel === v.email).reduce((s, l) => s + (l.valor_mensal ?? 0), 0),
      }
    }).filter((x) => x.contatos || x.fechados).sort((a, b) => b.contatos - a.contatos)

    // Onde o radar acerta: taxa de resposta de quem já foi contatado, por nicho e cidade
    const contatadosTotal = leads.data.filter((l) => l.ultimo_contato_em)
    const agrupar = (chave: 'nicho' | 'cidade') => {
      const g = new Map<string, { contatados: number; responderam: number }>()
      for (const l of contatadosTotal) {
        const k = l[chave]
        if (!k || (chave === 'nicho' && !nichoValido(k))) continue
        const x = g.get(k) ?? { contatados: 0, responderam: 0 }
        x.contatados++
        if (l.ultima_resposta_em) x.responderam++
        g.set(k, x)
      }
      return [...g].map(([nome, x]) => ({ nome, ...x, taxa: pct(x.responderam, x.contatados) })).sort((a, b) => b.contatados - a.contatados).slice(0, 8)
    }

    const motivos = new Map<string, number>()
    for (const l of perdidos) motivos.set(l.motivo_perda!, (motivos.get(l.motivo_perda!) ?? 0) + 1)

    return {
      contatos: contatos.length, contatados: contatados.size, respostas: respondidos.length,
      taxa: pct(respondidos.filter((l) => contatados.has(l.id)).length, contatados.size),
      reunioes: chegaram('reuniao_marcada').size, propostas: chegaram('proposta').size,
      fechados: fechados.length, mrr: fechados.reduce((s, l) => s + (l.valor_mensal ?? 0), 0), setup: fechados.reduce((s, l) => s + (l.valor_setup ?? 0), 0),
      novos: leads.data.filter((l) => noPeriodo(l.created_at)).length,
      dias, porVendedor, nichos: agrupar('nicho'), cidades: agrupar('cidade'),
      motivos: [...motivos].sort((a, b) => b[1] - a[1]).slice(0, 6),
      funil: ETAPAS.filter((e) => e.ativa).map((e) => ({ ...e, n: leads.data!.filter((l) => l.etapa === e.id).length })),
      mrrTotal: leads.data.filter((l) => l.etapa === 'fechado').reduce((s, l) => s + (l.valor_mensal ?? 0), 0),
    }
  }, [leads.data, ativ.data, base.data, desde, equipe])

  const validas = (notas.data ?? []).filter((a) => a.nota_geral != null)
  const notaMedia = validas.length ? validas.reduce((s, a) => s + Number(a.nota_geral), 0) / validas.length : null
  const maxDia = Math.max(1, ...(m?.dias.map((d) => d.n) ?? [1]))

  return (
    <Pagina titulo="Métricas" sub={`Desde ${desde.toLocaleDateString('pt-BR')}`}
      acoes={<Segmentos valor={periodo} onChange={setPeriodo} opcoes={[{ id: '7', nome: '7 dias' }, { id: '30', nome: '30 dias' }, { id: '90', nome: '90 dias' }]} />}>
      {(leads.erro || ativ.erro) && <Erro msg={(leads.erro ?? ativ.erro)!} />}
      {!m ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }, (_, i) => <Esqueleto key={i} className="h-24" />)}</div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi rotulo="Envios confirmados" valor={m.contatos} detalhe={`${m.contatados} ${m.contatados === 1 ? 'lead' : 'leads'} · ${c?.semConfirmacao ?? 0} ${(c?.semConfirmacao ?? 0) === 1 ? 'abertura' : 'aberturas'} sem confirmação`} />
            <Kpi rotulo="Resposta humana" valor={c ? fmtTaxa(c.respostaHumana) : '-'} detalhe={c ? `${c.respostaHumana.sim} de ${c.primeirosContatos} primeiros contatos` : ''} />
            <Kpi rotulo="Reuniões marcadas" valor={m.reunioes} detalhe={`${m.propostas} propostas enviadas`} />
            <Kpi rotulo="Fechados" valor={m.fechados} destaque={m.fechados > 0} detalhe={m.fechados ? `${brl(m.mrr)}/mês · ${brl(m.setup)} setup` : 'nenhum no período'} />
          </div>

          {c && <Comercial c={c} />}

          <Secao titulo="Envios confirmados por dia" acao={<span className="text-xs text-tinta-3">{m.novos} leads novos no radar</span>}>
            <div className="flex items-end gap-[3px] h-36" role="img" aria-label="Contatos por dia">
              {m.dias.map((d) => (
                <div key={d.dia.toISOString()} className="group flex-1 h-full flex flex-col justify-end relative" title={`${data(d.dia.toISOString())}: ${d.n} contatos`}>
                  <div className={cx('rounded-t-sm min-h-[2px] transition-colors', d.n ? 'bg-tinta group-hover:bg-sinal' : 'bg-fio')} style={{ height: `${(d.n / maxDia) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between font-mono text-[10px] text-tinta-3 mt-2"><span>{data(m.dias[0]?.dia.toISOString())}</span><span>hoje</span></div>
          </Secao>

          <div className="grid lg:grid-cols-2 gap-6">
            <Secao titulo="Funil agora" acao={<span className="numero text-xs text-tinta-3">{brl(m.mrrTotal)}/mês em carteira</span>}>
              <div className="space-y-3">
                {m.funil.map((e, i) => {
                  const max = Math.max(...m.funil.map((x) => x.n), 1)
                  const depois = m.funil.slice(i).reduce((s, x) => s + x.n, 0)
                  const antes = m.funil.slice(i - 1).reduce((s, x) => s + x.n, 0)
                  return (
                    <div key={e.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{e.nome}</span>
                        <span className="numero text-tinta-2">{e.n}{i > 0 && <span className="text-tinta-3 text-xs ml-2">{pct(depois, antes)}% passam</span>}</span>
                      </div>
                      <div className="h-2 rounded-full bg-realce overflow-hidden"><div className={cx('h-full rounded-full', e.cor)} style={{ width: `${Math.max(1, (e.n / max) * 100)}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </Secao>

            <Secao titulo="Por vendedor">
              {m.porVendedor.length === 0 ? <p className="text-sm text-tinta-3">Sem envios confirmados no período.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="rotulo text-left">{['', 'Envios', 'Respostas', 'Reuniões', 'Fechados'].map((h) => <th key={h} className="font-normal pb-2">{h}</th>)}</tr></thead>
                  <tbody>
                    {m.porVendedor.map((x) => (
                      <tr key={x.v.email} className="border-t border-fio">
                        <td className="py-2.5"><span className="inline-flex items-center gap-2"><Avatar nome={x.v.nome} tamanho="sm" />{x.v.nome.split(' ')[0]}</span></td>
                        <td className="numero">{x.contatos}</td>
                        <td className="numero">{x.respostas} <span className="text-tinta-3 text-xs">{pct(x.respostas, x.leads)}%</span></td>
                        <td className="numero">{x.reunioes}</td>
                        <td className="numero">{x.fechados}{x.mrr ? <span className="text-tinta-3 text-xs ml-1">{brl(x.mrr)}</span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-xs text-tinta-3 mt-3">Nota média das avaliações da IA no período: <span className="numero text-tinta">{notaMedia != null ? notaMedia.toFixed(1).replace('.', ',') : '-'}</span></p>
            </Secao>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <TaxaResposta titulo="Resposta por nicho" linhas={m.nichos} />
            <TaxaResposta titulo="Resposta por cidade" linhas={m.cidades} />
            <Secao titulo="Por que perdemos">
              {m.motivos.length === 0 ? <p className="text-sm text-tinta-3">Nenhum motivo registrado.</p> : (
                <ul className="space-y-2.5">{m.motivos.map(([mot, n]) => (
                  <li key={mot} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{mot}</span><span className="numero text-tinta-3">{n}</span></li>
                ))}</ul>
              )}
            </Secao>
          </div>

          <Secao titulo="Radar · últimas buscas">
            {!radar.data?.length ? <p className="text-sm text-tinta-3">O radar ainda não rodou.</p> : (
              <div className="overflow-x-auto -mx-4"><table className="w-full text-sm min-w-[480px]">
                <thead><tr className="rotulo text-left">{['Quando', 'Buscas', 'Encontrados', 'Novos', ''].map((h) => <th key={h} className="font-normal px-4 pb-2">{h}</th>)}</tr></thead>
                <tbody>{radar.data.map((r) => (
                  <tr key={r.id} className="border-t border-fio">
                    <td className="px-4 py-2">{dataHora(r.iniciado_em)}</td>
                    <td className="px-4 numero">{r.buscas}</td><td className="px-4 numero">{r.encontrados}</td>
                    <td className="px-4 numero font-medium">{r.novos}</td>
                    <td className="px-4 text-xs">{r.erro ? <span className="text-sinal" title={r.erro}>erro</span> : !r.finalizado_em ? <span className="text-alerta">rodando</span> : <span className="text-ok">ok</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Secao>
        </div>
      )}
    </Pagina>
  )
}

function TaxaResposta({ titulo, linhas }: { titulo: string; linhas: { nome: string; contatados: number; responderam: number; taxa: number }[] }) {
  return (
    <Secao titulo={titulo}>
      {linhas.length === 0 ? <p className="text-sm text-tinta-3">Ainda sem contatos.</p> : (
        <ul className="space-y-3">
          {linhas.map((l) => (
            <li key={l.nome}>
              <div className="flex justify-between gap-3 text-sm"><span className="truncate capitalize">{l.nome}</span><span className="numero text-tinta-2 whitespace-nowrap">{l.taxa}% <span className="text-tinta-3 text-xs">de {l.contatados}</span></span></div>
              <div className="h-1 rounded-full bg-realce mt-1.5 overflow-hidden"><div className="h-full bg-tinta rounded-full" style={{ width: `${Math.max(2, l.taxa)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}

const fmtTaxa = (t: Taxa) => (t.pct == null ? (t.n ? 'poucos dados' : '-') : `${t.pct}%`)
const horas = (h: number | null) => (h == null ? '-' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1).replace('.', ',')} h` : `${Math.round(h / 24)} dias`)

/* Indicadores da inteligência comercial. Observado = contado no banco; o resto é dito como retrato de agora. */
function Comercial({ c }: { c: ReturnType<typeof calcular> }) {
  const linha = (rotulo: string, valor: React.ReactNode, detalhe?: string) => (
    <div key={rotulo} className="flex items-baseline justify-between gap-3 py-1.5 border-t border-fio first:border-t-0">
      <span className="text-sm">{rotulo}{detalhe && <span className="block text-xs text-tinta-3">{detalhe}</span>}</span>
      <span className="numero text-sm whitespace-nowrap">{valor}</span>
    </div>
  )
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Secao titulo="Do radar à conversa">
        {linha('Leads pesquisados', c.pesquisados, 'novos no radar no período')}
        {linha('Leads analisados', c.analisados, 'pela inteligência comercial, no período')}
        {linha('Aptos a contato', c.aptos, 'abertos e com telefone, agora')}
        {linha('Primeiros contatos confirmados', c.primeirosContatos)}
        {linha('Resposta humana', fmtTaxa(c.respostaHumana), `${c.respostaHumana.sim} de ${c.respostaHumana.n}, qualquer resposta`)}
        {linha('Resposta sem recusa', fmtTaxa(c.respostaPositiva), `${c.respostasNegativas} ${c.respostasNegativas === 1 ? 'resposta negativa fica' : 'respostas negativas ficam'} fora`)}
        {linha('Respostas com informação útil', c.respostasUteis, 'segundo a análise da conversa')}
        {linha('Tempo até a resposta (mediana)', horas(c.medianaHorasResposta), `${c.amostraTempo} respostas`)}
        {(c.legados > 0 || c.naoEnviados > 0) && <p className="text-xs text-tinta-3 mt-2">
          {c.legados > 0 && (c.legados === 1 ? '1 mensagem antiga sem envio comprovado fica fora das contas. ' : `${c.legados} mensagens antigas sem envio comprovado ficam fora das contas. `)}
          {c.naoEnviados > 0 && (c.naoEnviados === 1 ? '1 abertura marcada como não enviada.' : `${c.naoEnviados} aberturas marcadas como não enviadas.`)}
        </p>}
      </Secao>
      <Secao titulo="Da conversa ao contrato">
        {linha('Conversas qualificadas', c.conversasQualificadas, 'retrato de agora')}
        {linha('Demonstrações pedidas', c.demonstracoes, 'retrato de agora')}
        {linha('Propostas apresentadas', c.propostas)}
        {linha('Oportunidades ganhas', c.ganhas)}
        {linha('Oportunidades perdidas', c.perdidas, 'no funil hoje')}
        {linha('Receita contratada', c.receitaSetup || c.receitaMensal ? `${brl(c.receitaSetup)} + ${brl(c.receitaMensal)}/mês` : '-', c.fechadosSemValor ? `${c.fechadosSemValor} fechados sem valor informado` : 'quando informada')}
        {linha('Receita recebida', c.receitaRecebida ? brl(c.receitaRecebida) : '-', 'pagamentos registrados no Financeiro')}
      </Secao>
      <Secao titulo="O que funciona">
        <div className="rotulo mb-1">Por variante de mensagem</div>
        {linha('Opção A · natural', fmtTaxa(c.variantes.a), `${c.variantes.a.n} envios confirmados`)}
        {linha('Opção B · estratégica', fmtTaxa(c.variantes.b), `${c.variantes.b.n} envios confirmados`)}
        {c.abordagens.length > 0 && <>
          <div className="rotulo mt-4 mb-1">Por abordagem</div>
          {c.abordagens.slice(0, 5).map((x) => linha(NOME_ACAO[x.acao as keyof typeof NOME_ACAO] ?? x.acao, fmtTaxa(x), `${x.sim} de ${x.n} responderam`))}
        </>}
        <div className="rotulo mt-4 mb-1">Por temperatura inicial</div>
        {c.porTemperatura.filter((t) => t.temperatura !== 'desconhecido' || t.resposta.n > 0).map((t) => linha(NOME_TEMPERATURA[t.temperatura as keyof typeof NOME_TEMPERATURA] ?? t.temperatura, fmtTaxa(t.resposta), `${t.resposta.n} leads · ${t.fechados} fechados`))}
        {c.segmentos.length > 0 && <>
          <div className="rotulo mt-4 mb-1">Por segmento</div>
          {c.segmentos.slice(0, 5).map((x) => linha(x.nome, fmtTaxa(x), `${x.sim} de ${x.n} responderam`))}
        </>}
        {(c.avaliacaoHumana.boas + c.avaliacaoHumana.ruins) > 0 && <>
          <div className="rotulo mt-4 mb-1">Qualidade das sugestões (equipe)</div>
          {linha('Marcadas como boas', c.avaliacaoHumana.boas)}
          {linha('Marcadas como ruins', c.avaliacaoHumana.ruins)}
        </>}
        <p className="text-xs text-tinta-3 mt-2">Taxas só aparecem com {AMOSTRA_MINIMA} ou mais casos. Notas dadas pela própria IA não entram como resultado.</p>
      </Secao>
    </div>
  )
}
