import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { etapaInfo, type Etapa } from '../lib/tipos'
import { cx, iniciais } from '../lib/util'

export function Pagina({ titulo, sub, acoes, children, largura = 'max-w-6xl' }: {
  titulo: ReactNode; sub?: ReactNode; acoes?: ReactNode; children: ReactNode; largura?: string
}) {
  return (
    <div className={cx('mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-28 md:pb-12 animate-entra', largura)}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-[28px] font-semibold leading-tight">{titulo}</h1>
          {sub && <div className="text-sm text-tinta-3 mt-1">{sub}</div>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </header>
      {children}
    </div>
  )
}

export function EtapaTag({ etapa, className }: { etapa: Etapa; className?: string }) {
  const e = etapaInfo(etapa)
  return (
    <span className={cx('inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-tinta-2 whitespace-nowrap', className)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', e.cor)} />
      {e.nome}
    </span>
  )
}

/** Score de 0 a 100 do radar: barra curta em vez de número solto. */
export function Score({ v, mostrarNumero = true }: { v: number; mostrarNumero?: boolean }) {
  const cor = v >= 70 ? 'bg-sinal' : v >= 45 ? 'bg-alerta' : 'bg-tinta-3'
  return (
    <span className="inline-flex items-center gap-2" title={`Score ${v} de 100`}>
      <span className="w-10 h-1 rounded-full bg-realce overflow-hidden">
        <span className={cx('block h-full rounded-full', cor)} style={{ width: `${Math.max(4, v)}%` }} />
      </span>
      {mostrarNumero && <span className="numero text-xs text-tinta-2 w-6">{v}</span>}
    </span>
  )
}

export function Avatar({ nome, tamanho = 'md' }: { nome: string; tamanho?: 'sm' | 'md' | 'lg' }) {
  const t = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-11 h-11 text-sm' }[tamanho]
  return <span className={cx('inline-grid place-items-center rounded-full bg-realce text-tinta-2 font-mono font-medium shrink-0', t)}>{iniciais(nome)}</span>
}

export function Vazio({ titulo, children, icone }: { titulo: string; children?: ReactNode; icone?: ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      {icone && <div className="mx-auto mb-3 w-10 h-10 grid place-items-center rounded-full bg-realce text-tinta-3">{icone}</div>}
      <p className="font-medium">{titulo}</p>
      {children && <div className="text-sm text-tinta-3 mt-1 max-w-sm mx-auto">{children}</div>}
    </div>
  )
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx('rounded bg-realce animate-pulsa', className)} />
}

export function Linhas({ n = 5 }: { n?: number }) {
  return <div className="space-y-2">{Array.from({ length: n }, (_, i) => <Esqueleto key={i} className="h-14" />)}</div>
}

export function Erro({ msg, onTentar }: { msg: string; onTentar?: () => void }) {
  return (
    <div className="folha p-4 border-sinal/40 text-sm flex items-center justify-between gap-3">
      <span><span className="text-sinal font-medium">Não carregou.</span> <span className="text-tinta-3">{msg}</span></span>
      {onTentar && <button className="btn-sec btn-sm" onClick={onTentar}>Tentar de novo</button>}
    </div>
  )
}

export function Secao({ titulo, acao, children, className }: { titulo: ReactNode; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('folha', className)}>
      <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-fio">
        <h2 className="rotulo text-tinta-2">{titulo}</h2>
        {acao}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Kpi({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; destaque?: boolean }) {
  return (
    <div className="folha px-4 py-3.5">
      <div className="rotulo">{rotulo}</div>
      <div className={cx('numero text-[26px] leading-none mt-2.5 font-medium', destaque && 'text-sinal')}>{valor}</div>
      {detalhe && <div className="text-xs text-tinta-3 mt-2">{detalhe}</div>}
    </div>
  )
}

export function Abas<T extends string>({ abas, valor, onChange }: { abas: { id: T; nome: ReactNode }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-fio overflow-x-auto sem-rolagem">
      {abas.map((a) => (
        <button
          key={a.id} role="tab" aria-selected={valor === a.id} onClick={() => onChange(a.id)}
          className={cx('h-10 px-3 text-sm whitespace-nowrap -mb-px border-b-2 transition-colors',
            valor === a.id ? 'border-tinta text-tinta font-medium' : 'border-transparent text-tinta-3 hover:text-tinta')}
        >{a.nome}</button>
      ))}
    </div>
  )
}

export function Segmentos<T extends string>({ opcoes, valor, onChange }: { opcoes: { id: T; nome: ReactNode }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex p-0.5 rounded bg-realce">
      {opcoes.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={cx('h-8 px-3 rounded-[5px] text-[13px] transition-colors', valor === o.id ? 'bg-folha text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta')}
        >{o.nome}</button>
      ))}
    </div>
  )
}

function useEsc(onFechar: () => void) {
  const ref = useRef(onFechar)
  ref.current = onFechar
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && ref.current()
    window.addEventListener('keydown', f)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = overflow }
  }, [])
}

export function Modal({ titulo, onFechar, children, rodape, largura = 'max-w-lg' }: {
  titulo: ReactNode; onFechar: () => void; children: ReactNode; rodape?: ReactNode; largura?: string
}) {
  useEsc(onFechar)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-tinta/40 animate-entra" onClick={onFechar} />
      <div className={cx('relative w-full bg-folha md:rounded-lg rounded-t-lg shadow-flutua animate-entra max-h-[92vh] flex flex-col', largura)}>
        <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-fio shrink-0">
          <h2 className="font-semibold">{titulo}</h2>
          <button className="btn-icone -mr-2" onClick={onFechar} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto rolagem-fina">{children}</div>
        {rodape && <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-fio shrink-0 pb-seguro">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Campo({ rotulo, children, dica, className }: { rotulo: string; children: ReactNode; dica?: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="lbl">{rotulo}</span>
      {children}
      {dica && <span className="block text-xs text-tinta-3 mt-1">{dica}</span>}
    </label>
  )
}

export function Interruptor({ ligado, onChange, rotulo }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onChange(!ligado)} className="flex items-center gap-3 text-sm text-left">
      <span className={cx('relative w-9 h-5 rounded-full transition-colors shrink-0', ligado ? 'bg-ok' : 'bg-fio')}>
        <span className={cx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', ligado ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </span>
      {rotulo}
    </button>
  )
}

/** Ponto vermelho que pisca: o "no ar" do site da Vera, aqui marcando o que pede ação agora. */
export function Sinal({ className }: { className?: string }) {
  return <span className={cx('inline-block w-2 h-2 rounded-full bg-sinal animate-pulsa', className)} />
}
