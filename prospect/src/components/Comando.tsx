import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Lead } from '../lib/tipos'
import { cx, nomeCurto } from '../lib/util'
import { EtapaTag } from './ui'

type Item = { id: string; titulo: string; sub?: string; lead?: Pick<Lead, 'etapa'>; ir: string }

const ATALHOS: Item[] = [
  { id: 'p-hoje', titulo: 'Ir para Hoje', ir: '/' },
  { id: 'p-agenda', titulo: 'Ir para Agenda', ir: '/agenda' },
  { id: 'p-funil', titulo: 'Ir para Funil', ir: '/funil' },
  { id: 'p-propostas', titulo: 'Ir para Propostas', ir: '/propostas' },
  { id: 'p-clientes', titulo: 'Ir para Clientes', ir: '/clientes' },
  { id: 'p-projetos', titulo: 'Ir para Projetos', ir: '/projetos' },
  { id: 'p-financeiro', titulo: 'Ir para Financeiro', ir: '/financeiro' },
  { id: 'p-proposta', titulo: 'Nova proposta', ir: '/propostas/nova' },
  { id: 'p-leads', titulo: 'Ir para Leads', ir: '/leads' },
  { id: 'p-metricas', titulo: 'Ir para Métricas', ir: '/metricas' },
  { id: 'p-config', titulo: 'Ir para Configurações', ir: '/config' },
  { id: 'p-novo', titulo: 'Cadastrar lead', ir: '/leads?novo=1' },
]

export function Comando({ onFechar }: { onFechar: () => void }) {
  const nav = useNavigate()
  const [busca, setBusca] = useState('')
  const [leads, setLeads] = useState<Item[]>([])
  const [sel, setSel] = useState(0)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  useEffect(() => {
    const termo = busca.trim()
    if (termo.length < 2) { setLeads([]); return }
    const t = setTimeout(async () => {
      const digitos = termo.replace(/\D/g, '')
      const filtro = digitos.length >= 4
        ? `telefone.ilike.%${digitos}%,whatsapp.ilike.%${digitos}%`
        : `nome.ilike.%${termo.replaceAll(',', ' ')}%`
      const filtroCli = digitos.length >= 4 ? `whatsapp.ilike.%${digitos}%,telefone.ilike.%${digitos}%` : `nome.ilike.%${termo.replaceAll(',', ' ')}%,contato_nome.ilike.%${termo.replaceAll(',', ' ')}%`
      const [{ data }, { data: cli }] = await Promise.all([
        supabase.from('leads').select('id, nome, nicho, cidade, etapa').or(filtro).order('score', { ascending: false }).limit(6),
        supabase.from('clientes').select('id, nome, cidade, contato_nome').or(filtroCli).limit(4),
      ])
      setLeads([
        ...(cli ?? []).map((c: any) => ({ id: 'c' + c.id, titulo: c.nome, sub: ['Cliente', c.contato_nome, c.cidade].filter(Boolean).join(' · '), ir: `/clientes/${c.id}` })),
        ...(data ?? []).map((l: any) => ({ id: l.id, titulo: nomeCurto(l.nome), sub: [l.nicho, l.cidade].filter(Boolean).join(' · '), lead: l, ir: `/leads/${l.id}` })),
      ])
      setSel(0)
    }, 180)
    return () => clearTimeout(t)
  }, [busca])

  const itens = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const atalhos = ATALHOS.filter((a) => !t || a.titulo.toLowerCase().includes(t))
    return [...leads, ...atalhos]
  }, [leads, busca])

  function escolher(i: Item | undefined) {
    if (!i) return
    onFechar()
    nav(i.ir)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal aria-label="Buscar">
      <div className="absolute inset-0 bg-tinta/40" onClick={onFechar} />
      <div className="relative w-full max-w-xl bg-folha rounded-lg shadow-flutua animate-entra overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-fio">
          <Search size={18} className="text-tinta-3 shrink-0" />
          <input
            ref={ref} value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, lead ou telefone, ou ir para uma tela"
            className="flex-1 h-14 bg-transparent outline-none text-[15px] placeholder:text-tinta-3"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onFechar()
              else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, itens.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
              else if (e.key === 'Enter') escolher(itens[sel])
            }}
          />
          <span className="tecla">Esc</span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto rolagem-fina py-2">
          {itens.length === 0 && <li className="px-4 py-6 text-sm text-tinta-3 text-center">Nada encontrado.</li>}
          {itens.map((i, idx) => (
            <li key={i.id}>
              <button
                onMouseEnter={() => setSel(idx)} onClick={() => escolher(i)}
                className={cx('w-full flex items-center gap-3 px-4 py-2.5 text-left', idx === sel && 'bg-realce')}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{i.titulo}</span>
                  {i.sub && <span className="block text-xs text-tinta-3 truncate">{i.sub}</span>}
                </span>
                {i.lead ? <EtapaTag etapa={i.lead.etapa} /> : <ArrowRight size={14} className="text-tinta-3" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
