import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { ETAPAS, type Atividade, type Etapa, type Lead, type RadarExecucao } from '../lib/tipos'
import { brl, cx, data, dataHora, nichoValido, pct } from '../lib/util'
import { Avatar, Erro, Esqueleto, Kpi, Pagina, Secao, Segmentos } from '../components/ui'

type L = Pick<Lead, 'id' | 'etapa' | 'created_at' | 'responsavel' | 'ultimo_contato_em' | 'ultima_resposta_em' | 'fechado_em' | 'valor_mensal' | 'valor_setup' | 'motivo_perda' | 'nicho' | 'cidade'>
type Periodo = '7' | '30' | '90'

export default function Metricas() {
  const { equipe } = useSessao()
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const desde = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - Number(periodo) + 1); return d }, [periodo])
  const desdeIso = desde.toISOString()

  const leads = useConsulta('met:leads', () => q<L[]>(supabase.from('leads')
    .select('id, etapa, created_at, responsavel, ultimo_contato_em, ultima_resposta_em, fechado_em, valor_mensal, valor_setup, motivo_perda, nicho, cidade').limit(10000)), ['leads'])
  const ativ = useConsulta(`met:ativ:${periodo}`, () => q<Atividade[]>(supabase.from('atividades')
    .select('id, lead_id, tipo, detalhe, usuario, created_at').gte('created_at', desdeIso).limit(20000)), ['atividades'])
  const notas = useConsulta(`met:av:${periodo}`, () => q<{ nota_geral: number | null }[]>(supabase.from('avaliacoes').select('nota_geral').gte('created_at', desdeIso)), ['avaliacoes'])
  const radar = useConsulta('met:radar', () => q<RadarExecucao[]>(supabase.from('radar_execucoes').select('*').order('iniciado_em', { ascending: false }).limit(8)), [])

  const m = useMemo(() => {
    if (!leads.data || !ativ.data) return null
    const noPeriodo = (s?: string | null) => !!s && new Date(s) >= desde
    const contatos = ativ.data.filter((a) => a.tipo === 'whatsapp_aberto')
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
  }, [leads.data, ativ.data, desde, equipe])

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
            <Kpi rotulo="Contatos feitos" valor={m.contatos} detalhe={`${m.contatados} leads diferentes`} />
            <Kpi rotulo="Taxa de resposta" valor={`${m.taxa}%`} detalhe={`${m.respostas} responderam`} />
            <Kpi rotulo="Reuniões marcadas" valor={m.reunioes} detalhe={`${m.propostas} propostas enviadas`} />
            <Kpi rotulo="Fechados" valor={m.fechados} destaque={m.fechados > 0} detalhe={m.fechados ? `${brl(m.mrr)}/mês · ${brl(m.setup)} setup` : 'nenhum no período'} />
          </div>

          <Secao titulo="Contatos por dia" acao={<span className="text-xs text-tinta-3">{m.novos} leads novos no radar</span>}>
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
              {m.porVendedor.length === 0 ? <p className="text-sm text-tinta-3">Sem contatos no período.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="rotulo text-left">{['', 'Contatos', 'Respostas', 'Reuniões', 'Fechados'].map((h) => <th key={h} className="font-normal pb-2">{h}</th>)}</tr></thead>
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
