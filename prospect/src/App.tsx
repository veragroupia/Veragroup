import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, CalendarCheck, CalendarDays, Columns3, List, LogOut, Moon, Search, Settings, Sun } from 'lucide-react'
import { SessaoProvider, useSessao } from './lib/sessao'
import { supabase } from './lib/supabase'
import { invalidar } from './lib/dados'
import { cx } from './lib/util'
import { AvisoProvider } from './components/Aviso'
import { Comando } from './components/Comando'
import { Avatar, Esqueleto } from './components/ui'
import { Marca } from './components/Marca'
import Login from './pages/Login'

const Hoje = lazy(() => import('./pages/Hoje'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Funil = lazy(() => import('./pages/Funil'))
const Leads = lazy(() => import('./pages/Leads'))
const LeadDetalhe = lazy(() => import('./pages/LeadDetalhe'))
const Metricas = lazy(() => import('./pages/Metricas'))
const Config = lazy(() => import('./pages/Config'))

const NAV = [
  { to: '/', nome: 'Hoje', icon: CalendarCheck, tecla: '1' },
  { to: '/agenda', nome: 'Agenda', icon: CalendarDays, tecla: '2' },
  { to: '/funil', nome: 'Funil', icon: Columns3, tecla: '3' },
  { to: '/leads', nome: 'Leads', icon: List, tecla: '4' },
  { to: '/metricas', nome: 'Métricas', icon: BarChart3, tecla: '5' },
  { to: '/config', nome: 'Configurações', curto: 'Config', icon: Settings, tecla: '6' },
]

function useTema() {
  const [escuro, setEscuro] = useState(() => document.documentElement.dataset.tema === 'escuro')
  useEffect(() => {
    if (escuro) document.documentElement.dataset.tema = 'escuro'
    else delete document.documentElement.dataset.tema
    try { localStorage.setItem('vp-tema', escuro ? 'escuro' : 'claro') } catch { /* modo privado */ }
  }, [escuro])
  return [escuro, () => setEscuro((v) => !v)] as const
}

function useRealtime(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const canal = supabase.channel('painel')
    for (const t of ['leads', 'mensagens', 'followups', 'agenda']) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => invalidar(t))
    }
    canal.subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [ativo])
}

const ehCampo = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

function Shell() {
  const { sessao, eu, carregando, sair } = useSessao()
  const [escuro, alternarTema] = useTema()
  const [comando, setComando] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  useRealtime(!!eu)

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setComando((v) => !v); return }
      if (ehCampo(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') { e.preventDefault(); setComando(true); return }
      const item = NAV.find((n) => n.tecla === e.key)
      if (item && !document.querySelector('[role="dialog"]')) nav(item.to)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [nav])

  if (carregando) return <div className="h-full grid place-items-center"><Esqueleto className="w-40 h-2" /></div>
  if (!sessao) return <Login />
  if (!eu) return (
    <div className="h-full grid place-items-center p-6">
      <div className="folha p-6 max-w-sm text-center">
        <p className="font-semibold mb-1">Acesso não liberado</p>
        <p className="text-sm text-tinta-3 mb-5">{sessao.user.email} ainda não faz parte da equipe. Peça para um admin te adicionar em Configurações.</p>
        <button className="btn-sec" onClick={sair}>Sair</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-full md:pl-60">
      {/* Menu lateral (computador) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-fio bg-folha">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-fio">
          <Marca />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight" style={{ fontStretch: '115%' }}>Vera Prospect</div>
            <div className="rotulo !text-[10px]">Painel comercial</div>
          </div>
        </div>
        <button onClick={() => setComando(true)} className="mx-3 mt-4 h-9 px-3 flex items-center gap-2 rounded border border-fio text-sm text-tinta-3 hover:border-tinta-3 transition-colors">
          <Search size={15} /> <span className="flex-1 text-left">Buscar lead</span> <span className="tecla">Ctrl K</span>
        </button>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => cx('group flex items-center gap-3 h-9 px-3 rounded text-sm transition-colors',
                isActive ? 'bg-tinta text-fundo font-medium' : 'text-tinta-2 hover:bg-realce hover:text-tinta')}>
              <n.icon size={17} strokeWidth={1.8} />
              <span className="flex-1">{n.nome}</span>
              <span className="font-mono text-[10px] opacity-0 group-hover:opacity-60">{n.tecla}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-fio p-3 flex items-center gap-2.5">
          <Avatar nome={eu.nome} />
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-medium truncate">{eu.nome}</div>
            <div className="text-xs text-tinta-3 truncate">{eu.papel === 'admin' ? 'Admin' : 'Vendedor'}</div>
          </div>
          <button className="btn-icone" onClick={alternarTema} title={escuro ? 'Tema claro' : 'Tema escuro'}>{escuro ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button className="btn-icone" onClick={sair} title="Sair"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="md:hidden sticky top-0 z-30 h-14 flex items-center gap-2 px-4 bg-fundo/90 backdrop-blur border-b border-fio">
        <Marca />
        <span className="font-semibold flex-1" style={{ fontStretch: '115%' }}>Vera Prospect</span>
        <button className="btn-icone" onClick={() => setComando(true)} aria-label="Buscar"><Search size={18} /></button>
        <button className="btn-icone" onClick={alternarTema} aria-label="Trocar tema">{escuro ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="btn-icone" onClick={sair} aria-label="Sair"><LogOut size={18} /></button>
      </header>

      <main key={loc.pathname.split('/')[1]}>
        <Suspense fallback={<div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-3"><Esqueleto className="h-8 w-48" /><Esqueleto className="h-64" /></div>}>
          <Routes>
            <Route path="/" element={<Hoje />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/funil" element={<Funil />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetalhe />} />
            <Route path="/metricas" element={<Metricas />} />
            <Route path="/config" element={<Config />} />
            <Route path="*" element={<Hoje />} />
          </Routes>
        </Suspense>
      </main>

      {/* Barra inferior (celular) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-folha/95 backdrop-blur border-t border-fio pb-seguro">
        <div className="grid grid-cols-6">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => cx('flex flex-col items-center justify-center gap-1 h-14 text-[10.5px]', isActive ? 'text-tinta font-medium' : 'text-tinta-3')}>
              {({ isActive }) => (<>
                <n.icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                {n.curto ?? n.nome}
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>

      {comando && <Comando onFechar={() => setComando(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <SessaoProvider>
      <AvisoProvider>
        <Shell />
      </AvisoProvider>
    </SessaoProvider>
  )
}
