import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, TriangleAlert } from 'lucide-react'
import { cx } from '../lib/util'

type Tipo = 'ok' | 'erro'
interface Item { id: number; texto: string; tipo: Tipo; acao?: { nome: string; fn: () => void } }
type Avisar = (texto: string, tipo?: Tipo, acao?: Item['acao']) => void

const C = createContext<Avisar>(() => {})
export const useAviso = () => useContext(C)

let seq = 0
export function AvisoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([])
  const avisar = useCallback<Avisar>((texto, tipo = 'ok', acao) => {
    const id = ++seq
    setItens((l) => [...l.slice(-2), { id, texto, tipo, acao }])
    setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), tipo === 'erro' ? 7000 : acao ? 6000 : 3200)
  }, [])

  return (
    <C.Provider value={avisar}>
      {children}
      {createPortal(
        <div className="fixed z-[60] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[calc(100%-32px)] max-w-md pointer-events-none" aria-live="polite">
          {itens.map((i) => (
            <div key={i.id} className={cx('pointer-events-auto flex items-center gap-3 w-full rounded-lg px-4 py-3 text-sm shadow-flutua animate-entra',
              i.tipo === 'erro' ? 'bg-sinal text-white' : 'bg-tinta text-fundo')}>
              {i.tipo === 'erro' ? <TriangleAlert size={16} className="shrink-0" /> : <Check size={16} className="shrink-0 text-ok" />}
              <span className="flex-1">{i.texto}</span>
              {i.acao && (
                <button className="font-medium underline underline-offset-2" onClick={() => { i.acao!.fn(); setItens((l) => l.filter((x) => x.id !== i.id)) }}>
                  {i.acao.nome}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </C.Provider>
  )
}

/** Envolve uma ação assíncrona: mostra erro sozinho e devolve se deu certo. */
export function useExecutar() {
  const avisar = useAviso()
  return async function executar(fn: () => Promise<unknown>, sucesso?: string) {
    try {
      await fn()
      if (sucesso) avisar(sucesso)
      return true
    } catch (e: any) {
      avisar(e?.message ?? 'Algo deu errado', 'erro')
      return false
    }
  }
}
