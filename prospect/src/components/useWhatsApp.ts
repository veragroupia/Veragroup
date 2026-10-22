import { useSessao } from '../lib/sessao'
import { abrirWhatsApp, AVISO_SEM_REGISTRO, semRegistro } from '../lib/acoes'
import { useAviso, useExecutar } from './Aviso'

/** Abre o WhatsApp com o tratamento de sempre: erro vira aviso, e sem registro de envio a pessoa é avisada.
    Devolve o envio aberto (para pedir confirmação), `false` se falhou, ou `null` quando não há o que confirmar. */
export function useAbrirWhatsApp() {
  const { eu } = useSessao()
  const executar = useExecutar()
  const avisar = useAviso()
  return async (...args: [Parameters<typeof abrirWhatsApp>[0], string, string?, Parameters<typeof abrirWhatsApp>[4]?]): Promise<{ id: string } | null | false> => {
    const [lead, texto, followupId, origem] = args
    let ret: Awaited<ReturnType<typeof abrirWhatsApp>> = null
    const ok = await executar(async () => { ret = await abrirWhatsApp(lead, texto, eu!, followupId, origem) })
    if (!ok) return false
    if (semRegistro(ret)) { avisar(AVISO_SEM_REGISTRO, 'erro'); return null }
    return ret as { id: string } | null
  }
}
