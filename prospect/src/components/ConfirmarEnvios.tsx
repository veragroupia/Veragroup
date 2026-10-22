import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MessageCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { confirmarEnvio, marcarNaoEnviado } from '../lib/acoes'
import type { Envio } from '../lib/inteligencia'
import { nomeCurto, relativo } from '../lib/util'
import { useExecutar } from './Aviso'

type EnvioComLead = Envio & { lead: { nome: string } | null }

/** WhatsApp aberto por mim e ainda sem resposta sobre o envio (últimas 48 h). */
export function useEnviosAbertos() {
  const { eu } = useSessao()
  return useConsulta(eu ? `envios:abertos:${eu.email}` : null, async () => {
    const desde = new Date(Date.now() - 48 * 3600e3).toISOString()
    const { data, error } = await supabase.from('envios').select('*, lead:leads(nome)')
      .eq('status', 'aberto').eq('autor', eu!.email).gte('aberto_em', desde).order('aberto_em', { ascending: false })
    return error ? [] : (data as EnvioComLead[])
  }, ['envios'])
}

/* Abrir o WhatsApp não prova que a mensagem saiu. Este cartão pergunta, e só "Enviei" grava a mensagem. */
export function ConfirmarEnvios() {
  const { eu } = useSessao()
  const executar = useExecutar()
  const abertos = useEnviosAbertos()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const lista = abertos.data ?? []
  if (!lista.length) return null

  async function responder(e: EnvioComLead, enviou: boolean) {
    setOcupado(e.id)
    await executar(() => (enviou ? confirmarEnvio(e, eu!) : marcarNaoEnviado(e.id)), enviou ? 'Envio registrado' : 'Marcado como não enviado')
    setOcupado(null)
  }

  return (
    <div className="fixed z-40 right-3 left-3 md:left-auto md:right-6 bottom-20 md:bottom-6 md:w-[360px] space-y-2 print:hidden" aria-live="polite">
      {lista.slice(0, 3).map((e) => (
        <div key={e.id} className="folha shadow-flutua p-3.5 animate-entra">
          <div className="flex items-start gap-2.5">
            <MessageCircle size={16} className="text-[#1d8f4e] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">Você enviou a mensagem para <Link to={`/leads/${e.lead_id}`} className="font-medium underline-offset-2 hover:underline">{e.lead ? nomeCurto(e.lead.nome) : 'o lead'}</Link>?</p>
              {e.texto && <p className="text-xs text-tinta-3 mt-1 line-clamp-2">{e.texto}</p>}
              <p className="text-[11px] text-tinta-3 mt-1 font-mono">WhatsApp aberto {relativo(e.aberto_em)}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-pri btn-sm flex-1" disabled={ocupado === e.id} onClick={() => responder(e, true)}><Check size={14} /> Enviei</button>
            <button className="btn-sec btn-sm flex-1" disabled={ocupado === e.id} onClick={() => responder(e, false)}><X size={14} /> Não enviei</button>
          </div>
        </div>
      ))}
      {lista.length > 3 && <p className="text-xs text-tinta-3 text-right pr-1">+ {lista.length - 3} aguardando confirmação</p>}
    </div>
  )
}
