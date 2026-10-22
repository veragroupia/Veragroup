import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, MessageCircle, Plus, Printer, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { aceitarProposta, PACOTES, salvarProposta, STATUS_PROPOSTA, textoProposta, totaisProposta, type ItemProposta, type Proposta } from '../lib/gestao'
import { brl, cx, numeroWa, waLink } from '../lib/util'
import { useAviso, useExecutar } from '../components/Aviso'
import { Campo, Esqueleto, Interruptor, Modal } from '../components/ui'
import { useClientesSelect } from '../components/gestao/Formularios'

const CONDICOES = '50% na aprovação e 50% na entrega, por Pix ou boleto.\nInclui uma rodada de ajustes depois da prévia. Domínio pago à parte, no nome do cliente.'
const emDias = (n: number) => new Date(Date.now() + n * 86400e3).toLocaleDateString('sv-SE')

export default function PropostaEditor() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const nova = !id || id === 'nova'
  const existente = useConsulta(nova ? null : `proposta:${id}`, () => q<Proposta>(supabase.from('propostas').select('*').eq('id', id!).single()), ['propostas'])
  if (!nova && !existente.data) return <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8"><Esqueleto className="h-96" /></div>
  return <Editor key={existente.data?.updated_at ?? 'nova'} inicial={existente.data} clienteId={params.get('cliente')} leadId={params.get('lead')} />
}

function Editor({ inicial, clienteId, leadId }: { inicial?: Proposta; clienteId: string | null; leadId: string | null }) {
  const nav = useNavigate()
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  const clientes = useClientesSelect()
  const [p, setP] = useState<Partial<Proposta>>(inicial ?? {
    titulo: 'Site para o seu negócio', itens: [], cliente_id: clienteId, lead_id: leadId, validade: emDias(15), condicoes: CONDICOES, status: 'rascunho', responsavel: eu!.email,
  })
  const [aceitar, setAceitar] = useState(false)
  const [recusar, setRecusar] = useState(false)
  const lead = useConsulta(p.lead_id ? `lead-mini:${p.lead_id}` : null, () => q<{ nome: string; whatsapp: string | null; telefone: string | null }>(supabase.from('leads').select('nome, whatsapp, telefone').eq('id', p.lead_id!).single()), ['leads'])
  const cliente = useConsulta(p.cliente_id ? `cliente-mini:${p.cliente_id}` : null, () => q<{ nome: string; whatsapp: string | null; telefone: string | null }>(supabase.from('clientes').select('nome, whatsapp, telefone').eq('id', p.cliente_id!).single()), ['clientes'])
  const destino = cliente.data ?? lead.data
  const itens = p.itens ?? []
  const t = totaisProposta(itens)
  const bloqueada = inicial?.status === 'aceita'
  const st = STATUS_PROPOSTA.find((s) => s.id === (p.status ?? 'rascunho'))!

  // Título automático enquanto ninguém mexeu nele.
  useEffect(() => {
    if (!inicial && destino && p.titulo === 'Site para o seu negócio') setP((x) => ({ ...x, titulo: `Proposta · ${destino.nome.split('|')[0].split(' - ')[0].trim()}` }))
  }, [destino?.nome]) // eslint-disable-line react-hooks/exhaustive-deps

  const atItem = (n: number, campo: keyof ItemProposta, v: unknown) => setP((x) => ({ ...x, itens: itens.map((it, k) => (k === n ? { ...it, [campo]: v } : it)) }))

  async function salvar(extra: Partial<Proposta> = {}, msg = 'Proposta salva') {
    let novoId = ''
    const ok = await executar(async () => { novoId = await salvarProposta({ ...p, ...extra }) }, msg)
    if (ok && !inicial) nav(`/propostas/${novoId}`, { replace: true })
    if (ok) setP((x) => ({ ...x, ...extra }))
    return ok
  }
  function copiar() {
    navigator.clipboard.writeText(textoProposta({ numero: inicial?.numero ?? 0, titulo: p.titulo ?? '', itens, validade: p.validade ?? null, condicoes: p.condicoes ?? null }, destino?.nome ?? ''))
    avisar('Texto copiado para colar no WhatsApp')
  }
  async function enviarWhats() {
    const n = numeroWa(destino?.whatsapp, destino?.telefone)
    if (!n) return avisar('O destinatário não tem WhatsApp cadastrado.', 'erro')
    window.open(waLink(n, textoProposta({ numero: inicial?.numero ?? 0, titulo: p.titulo ?? '', itens, validade: p.validade ?? null, condicoes: p.condicoes ?? null }, destino?.nome ?? '')), '_blank', 'noopener')
    if (p.status === 'rascunho') await salvar({ status: 'enviada', enviada_em: new Date().toISOString() }, 'Proposta marcada como enviada')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-28 md:pb-12 animate-entra">
      <div className="print:hidden">
        <button onClick={() => nav('/propostas')} className="inline-flex items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta mb-3"><ArrowLeft size={15} /> Propostas</button>
        <header className="flex flex-wrap items-start gap-3 mb-6">
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-3 text-sm text-tinta-3">
              {inicial && <span className="numero">nº {inicial.numero}</span>}
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider"><span className={cx('w-1.5 h-1.5 rounded-full', st.cor)} />{st.nome}</span>
            </div>
            <input className="w-full bg-transparent text-2xl md:text-[28px] font-semibold mt-1 outline-none border-b border-transparent focus:border-fio" value={p.titulo ?? ''} disabled={bloqueada} onChange={(e) => setP({ ...p, titulo: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-sec" onClick={() => window.print()} disabled={!itens.length}><Printer size={14} /> PDF</button>
            <button className="btn-sec" onClick={copiar} disabled={!itens.length}><Copy size={14} /> Copiar</button>
            <button className="btn-wa" onClick={enviarWhats} disabled={!itens.length || !destino}><MessageCircle size={15} /> Enviar</button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo rotulo="Para (cliente)">
                <select className="inp" value={p.cliente_id ?? ''} disabled={bloqueada} onChange={(e) => setP({ ...p, cliente_id: e.target.value || null })}>
                  <option value="">{lead.data ? `Lead: ${lead.data.nome}` : 'Escolha um cliente'}</option>
                  {(clientes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Válida até"><input type="date" className="inp" value={p.validade ?? ''} disabled={bloqueada} onChange={(e) => setP({ ...p, validade: e.target.value })} /></Campo>
            </div>

            {!bloqueada && (
              <div>
                <span className="lbl">Adicionar pacote</span>
                <div className="flex flex-wrap gap-1.5">
                  {PACOTES.map((pc) => (
                    <button key={pc.nome} className="btn-sec btn-sm" onClick={() => setP({ ...p, itens: [...itens, { nome: pc.nome, descricao: pc.descricao, valor: pc.valor, prazo_dias: pc.prazo_dias, recorrente: pc.recorrente }] })}>
                      <Plus size={12} /> {pc.nome}{pc.valor ? <span className="text-tinta-3 numero">{brl(pc.valor)}{pc.recorrente ? '/mês' : ''}</span> : null}
                    </button>
                  ))}
                  <button className="btn-fantasma btn-sm" onClick={() => setP({ ...p, itens: [...itens, { nome: '', descricao: '', valor: 0, prazo_dias: null, recorrente: false }] })}><Plus size={12} /> Item em branco</button>
                </div>
              </div>
            )}

            {itens.length === 0 ? <p className="folha p-6 text-sm text-tinta-3 text-center">Adicione um pacote acima para começar.</p> : (
              <ul className="space-y-3">
                {itens.map((it, n) => (
                  <li key={n} className="folha p-4 space-y-3">
                    <div className="flex gap-2">
                      <input className="inp font-medium" placeholder="Nome do item" value={it.nome} disabled={bloqueada} onChange={(e) => atItem(n, 'nome', e.target.value)} />
                      {!bloqueada && <button className="btn-icone shrink-0 text-tinta-3 hover:text-sinal" onClick={() => setP({ ...p, itens: itens.filter((_, k) => k !== n) })} aria-label="Remover"><Trash2 size={15} /></button>}
                    </div>
                    <textarea className="inp text-sm" rows={2} placeholder="O que está incluído" value={it.descricao} disabled={bloqueada} onChange={(e) => atItem(n, 'descricao', e.target.value)} />
                    <div className="flex flex-wrap items-end gap-3">
                      <Campo rotulo={it.recorrente ? 'Valor por mês' : 'Valor'} className="w-32"><input className="inp numero" inputMode="decimal" value={it.valor || ''} disabled={bloqueada} onChange={(e) => atItem(n, 'valor', Number(e.target.value.replace(',', '.')) || 0)} /></Campo>
                      {!it.recorrente && <Campo rotulo="Prazo (dias)" className="w-28"><input className="inp numero" inputMode="numeric" value={it.prazo_dias ?? ''} disabled={bloqueada} onChange={(e) => atItem(n, 'prazo_dias', Number(e.target.value) || null)} /></Campo>}
                      <div className="pb-2"><Interruptor ligado={it.recorrente} onChange={(v) => !bloqueada && atItem(n, 'recorrente', v)} rotulo={<span className="text-sm">Mensal</span>} /></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Campo rotulo="Condições"><textarea className="inp text-sm" rows={3} value={p.condicoes ?? ''} disabled={bloqueada} onChange={(e) => setP({ ...p, condicoes: e.target.value })} /></Campo>
          </div>

          <aside className="space-y-4">
            <div className="folha p-4 space-y-2.5 lg:sticky lg:top-6">
              <div className="flex justify-between text-sm"><span className="text-tinta-3">Investimento</span><span className="numero font-medium">{brl(t.setup)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-tinta-3">Mensalidade</span><span className="numero font-medium">{t.mensal ? `${brl(t.mensal)}/mês` : '-'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-tinta-3">Prazo</span><span className="numero">{t.prazo ? `${t.prazo} dias` : '-'}</span></div>
              <div className="divisor !my-3" />
              {!bloqueada && <button className="btn-pri w-full" onClick={() => salvar()} disabled={!p.titulo?.trim()}>Salvar</button>}
              {inicial && !bloqueada && (
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-sec !border-ok !text-ok" onClick={() => setAceitar(true)} disabled={!itens.length}><Check size={14} /> Aceita</button>
                  <button className="btn-sec !text-sinal" onClick={() => setRecusar(true)}><X size={14} /> Recusada</button>
                </div>
              )}
              {bloqueada && <p className="text-sm text-ok">Aceita em {new Date(inicial!.respondida_em!).toLocaleDateString('pt-BR')}. Cliente, projeto e cobranças já foram criados.</p>}
              {inicial?.status === 'recusada' && inicial.motivo_recusa && <p className="text-sm text-sinal">Recusada: {inicial.motivo_recusa}</p>}
              {bloqueada && p.cliente_id && <button className="btn-sec w-full" onClick={() => nav(`/clientes/${p.cliente_id}`)}>Abrir cliente</button>}
            </div>
            {inicial && (
              <div className="folha p-4 space-y-3">
                <div className="rotulo">Contrato</div>
                <input className="inp" placeholder="Link do contrato (Drive, DocuSign…)" value={p.contrato_url ?? ''} onChange={(e) => setP({ ...p, contrato_url: e.target.value })} onBlur={() => inicial.contrato_url !== p.contrato_url && salvar({}, 'Contrato salvo')} />
                <Interruptor ligado={!!p.contrato_assinado} onChange={(v) => salvar({ contrato_assinado: v }, v ? 'Contrato assinado' : 'Salvo')} rotulo={<span className="text-sm">Assinado pelo cliente</span>} />
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Versão para imprimir ou salvar em PDF */}
      <Impressao numero={inicial?.numero} titulo={p.titulo ?? ''} para={destino?.nome ?? ''} itens={itens} validade={p.validade ?? null} condicoes={p.condicoes ?? ''} />

      {aceitar && inicial && <Aceitar proposta={{ ...inicial, ...p } as Proposta} onFechar={() => setAceitar(false)} />}
      {recusar && inicial && <Recusar onFechar={() => setRecusar(false)} onSalvar={(motivo) => salvar({ status: 'recusada', motivo_recusa: motivo, respondida_em: new Date().toISOString() }, 'Proposta marcada como recusada').then(() => setRecusar(false))} />}
    </div>
  )
}

function Aceitar({ proposta, onFechar }: { proposta: Proposta; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const nav = useNavigate()
  const t = totaisProposta(proposta.itens)
  const [inicio, setInicio] = useState(new Date().toLocaleDateString('sv-SE'))
  const [venc, setVenc] = useState(new Date().toLocaleDateString('sv-SE'))
  const [dia, setDia] = useState(10)
  const [pago, setPago] = useState(false)

  async function confirmar() {
    let cliente = ''
    const ok = await executar(async () => { cliente = (await aceitarProposta(proposta, { inicio, vencimentoSetup: venc, diaMensalidade: dia, setupPago: pago, responsavel: eu!.email })).clienteId }, 'Fechado! Cliente, projeto e cobranças criados.')
    if (ok) { onFechar(); nav(`/clientes/${cliente}`) }
  }

  return (
    <Modal titulo="Proposta aceita" onFechar={onFechar} rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" onClick={confirmar}>Confirmar</button></>}>
      <p className="text-sm text-tinta-2 mb-4">Ao confirmar, o painel cria o cliente{proposta.lead_id && !proposta.cliente_id ? ' a partir do lead' : ''}, o projeto com o checklist do pacote, a cobrança do setup{t.mensal ? ' e a mensalidade de todo mês' : ''}.</p>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Início do projeto"><input type="date" className="inp" value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
        {t.setup > 0 && <Campo rotulo={`Vencimento do setup (${brl(t.setup)})`}><input type="date" className="inp" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>}
        {t.mensal > 0 && <Campo rotulo={`Dia da mensalidade (${brl(t.mensal)})`} dica="De 1 a 28"><input type="number" min={1} max={28} className="inp numero" value={dia} onChange={(e) => setDia(Math.min(28, Math.max(1, Number(e.target.value) || 10)))} /></Campo>}
      </div>
      {t.setup > 0 && <div className="mt-4"><Interruptor ligado={pago} onChange={setPago} rotulo="O setup (ou a entrada) já foi pago" /></div>}
    </Modal>
  )
}

function Recusar({ onFechar, onSalvar }: { onFechar: () => void; onSalvar: (m: string) => void }) {
  const [m, setM] = useState('')
  const motivos = ['Achou caro', 'Vai deixar para depois', 'Fechou com outro', 'Não viu valor', 'Sumiu']
  return (
    <Modal titulo="Proposta recusada" onFechar={onFechar} rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-sinal" disabled={!m.trim()} onClick={() => onSalvar(m.trim())}>Salvar</button></>}>
      <div className="flex flex-wrap gap-1.5 mb-3">{motivos.map((x) => <button key={x} className={m === x ? 'btn-pri btn-sm' : 'btn-sec btn-sm'} onClick={() => setM(x)}>{x}</button>)}</div>
      <input className="inp" placeholder="Ou escreva o motivo" value={m} onChange={(e) => setM(e.target.value)} />
    </Modal>
  )
}

function Impressao({ numero, titulo, para, itens, validade, condicoes }: { numero?: number; titulo: string; para: string; itens: ItemProposta[]; validade: string | null; condicoes: string }) {
  const t = totaisProposta(itens)
  return (
    <div className="hidden print:block text-[#141413] bg-white">
      <div className="flex items-start justify-between border-b-2 border-[#141413] pb-4 mb-8">
        <div>
          <div className="text-2xl font-semibold" style={{ fontStretch: '115%' }}>Vera Group</div>
          <div className="text-xs mt-1">Sites, lojas e sistemas · Itu, Salto, Sorocaba e região</div>
        </div>
        <div className="text-right text-xs font-mono">PROPOSTA {numero ? `Nº ${numero}` : ''}<br />{new Date().toLocaleDateString('pt-BR')}</div>
      </div>
      <h1 className="text-3xl font-semibold" style={{ fontStretch: '112%' }}>{titulo}</h1>
      {para && <p className="mt-1 text-sm">Para: {para}</p>}
      <table className="w-full mt-8 text-sm">
        <thead><tr className="border-b border-[#141413] text-left font-mono text-[10px] uppercase tracking-widest"><th className="py-2">Item</th><th className="py-2 text-right w-24">Prazo</th><th className="py-2 text-right w-32">Valor</th></tr></thead>
        <tbody>
          {itens.map((i, n) => (
            <tr key={n} className="border-b border-[#ccc] align-top">
              <td className="py-3 pr-4"><div className="font-semibold">{i.nome}</div><div className="text-[13px] mt-0.5">{i.descricao}</div></td>
              <td className="py-3 text-right">{i.prazo_dias ? `${i.prazo_dias} dias` : '-'}</td>
              <td className="py-3 text-right font-mono">{i.valor ? `${brl(i.valor)}${i.recorrente ? '/mês' : ''}` : 'a combinar'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 ml-auto w-72 text-sm space-y-1">
        <div className="flex justify-between"><span>Investimento</span><span className="font-mono font-semibold">{brl(t.setup)}</span></div>
        {t.mensal > 0 && <div className="flex justify-between"><span>Mensalidade</span><span className="font-mono font-semibold">{brl(t.mensal)}/mês</span></div>}
        {t.prazo && <div className="flex justify-between"><span>Prazo de entrega</span><span>{t.prazo} dias</span></div>}
      </div>
      {condicoes && <div className="mt-10 text-sm"><div className="font-mono text-[10px] uppercase tracking-widest mb-2">Condições</div><p className="whitespace-pre-wrap">{condicoes}</p></div>}
      {validade && <p className="mt-6 text-sm">Proposta válida até {new Date(validade + 'T12:00').toLocaleDateString('pt-BR')}.</p>}
      <div className="mt-16 grid grid-cols-2 gap-12 text-xs">
        <div className="border-t border-[#141413] pt-2">Vera Group</div>
        <div className="border-t border-[#141413] pt-2">{para || 'Cliente'}</div>
      </div>
    </div>
  )
}
