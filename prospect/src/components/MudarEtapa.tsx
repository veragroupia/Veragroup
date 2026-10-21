import { useState } from 'react'
import { mudarEtapa } from '../lib/acoes'
import { etapaInfo, type Etapa, type Lead } from '../lib/tipos'
import { nomeCurto } from '../lib/util'
import { useAviso, useExecutar } from './Aviso'
import { Campo, Modal } from './ui'

const MOTIVOS = ['Sem orçamento agora', 'Já tem fornecedor', 'Não vê valor em site', 'Não respondeu', 'Fechou com concorrente', 'Negócio fechou ou mudou']
const PLANOS = ['Landing page', 'Site institucional', 'Site + automação de WhatsApp', 'Sistema sob medida', 'Combo completo']

/** Etapas que pedem dado extra abrem um diálogo; as outras mudam direto. */
export function precisaDetalhe(e: Etapa) { return e === 'perdido' || e === 'fechado' }

export function useMudarEtapa() {
  const executar = useExecutar()
  const avisar = useAviso()
  const [pedido, setPedido] = useState<{ lead: Pick<Lead, 'id' | 'nome' | 'etapa'>; para: Etapa } | null>(null)

  async function mudar(lead: Pick<Lead, 'id' | 'nome' | 'etapa'>, para: Etapa) {
    if (lead.etapa === para) return
    if (precisaDetalhe(para)) { setPedido({ lead, para }); return }
    const de = lead.etapa
    if (await executar(() => mudarEtapa(lead.id, para))) {
      avisar(`${nomeCurto(lead.nome)} foi para ${etapaInfo(para).nome}`, 'ok', { nome: 'Desfazer', fn: () => executar(() => mudarEtapa(lead.id, de)) })
    }
  }

  const dialogo = pedido && <DialogoEtapa {...pedido} onFechar={() => setPedido(null)} />
  return { mudar, dialogo }
}

function DialogoEtapa({ lead, para, onFechar }: { lead: Pick<Lead, 'id' | 'nome'>; para: Etapa; onFechar: () => void }) {
  const executar = useExecutar()
  const [motivo, setMotivo] = useState('')
  const [plano, setPlano] = useState('')
  const [setup, setSetup] = useState('')
  const [mensal, setMensal] = useState('')
  const fechado = para === 'fechado'
  const valido = fechado ? !!plano : !!motivo.trim()

  async function salvar() {
    const extra = fechado
      ? { plano, valor_setup: Number(setup.replace(',', '.')) || null, valor_mensal: Number(mensal.replace(',', '.')) || null }
      : { motivo_perda: motivo.trim() }
    if (await executar(() => mudarEtapa(lead.id, para, extra), fechado ? 'Venda registrada' : 'Lead marcado como perdido')) onFechar()
  }

  return (
    <Modal titulo={fechado ? `Fechou com ${nomeCurto(lead.nome)}` : `Perdeu ${nomeCurto(lead.nome)}`} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className={fechado ? 'btn-pri' : 'btn-sinal'} disabled={!valido} onClick={salvar}>Salvar</button></>}>
      {fechado ? (
        <div className="space-y-4">
          <Campo rotulo="Plano">
            <input className="inp" list="planos" value={plano} onChange={(e) => setPlano(e.target.value)} autoFocus placeholder="Ex.: Landing page" />
            <datalist id="planos">{PLANOS.map((p) => <option key={p} value={p} />)}</datalist>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Setup (R$)"><input className="inp numero" inputMode="decimal" value={setup} onChange={(e) => setSetup(e.target.value)} placeholder="690" /></Campo>
            <Campo rotulo="Mensalidade (R$)"><input className="inp numero" inputMode="decimal" value={mensal} onChange={(e) => setMensal(e.target.value)} placeholder="97" /></Campo>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS.map((m) => (
              <button key={m} onClick={() => setMotivo(m)} className={motivo === m ? 'btn-pri btn-sm' : 'btn-sec btn-sm'}>{m}</button>
            ))}
          </div>
          <Campo rotulo="Motivo"><input className="inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ou escreva o motivo" /></Campo>
          <p className="text-xs text-tinta-3">O motivo aparece em Métricas. Follow-ups pendentes deste lead são cancelados.</p>
        </div>
      )}
    </Modal>
  )
}
