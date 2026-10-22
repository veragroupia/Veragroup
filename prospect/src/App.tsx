import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Building2, CalendarCheck, CalendarDays, Columns3, FileText, FolderKanban, List, LogOut, Menu, Moon, Search, Settings, Sun, Wallet, X,
} from 'lucide-react'
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
const Propostas = lazy(() => import('./pages/Propostas'))
const PropostaEditor = lazy(() => import('./pages/PropostaEditor'))
const Clientes = lazy(() => import('./pages/Clientes'))
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe'))
const Projetos = lazy(() => import('./pages/Projetos'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const Metricas = lazy(() => import('./pages/Metricas'))
const Config = lazy(() => import('./pages/Config'))

type Item = { to: string; nome: string; icon: typeof Menu; tecla?: string }
// O menu agrupado pelo que a Vera faz: vender, entregar, receber.
const GRUPOS: { titulo?: string; itens: Item[] }[] = [
  { itens: [
    { to: '/', nome: 'Hoje', icon: CalendarCheck, tecla: '1' },
    { to: '/agenda', nome: 'Agenda', icon: CalendarDays, tecla: '2' },
  ] },
  { titulo: 'Comercial', itens: [
    { to: '/funil', nome: 'Funil', icon: Columns3, tecla: '3' },
    { to: '/leads', nome: 'Leads', icon: List, tecla: '4' },
    { to: '/propostas', nome: 'Propostas', icon: FileText, tecla: '5' },
  ] },
  { titulo: 'Clientes', itens: [
    { to: '/clientes', nome: 'Clientes', icon: Building2, tecla: '6' },
    { to: '/projetos', nome: 'Projetos', icon: FolderKanban, tecla: '7' },
  ] },
  { titulo: 'Gestão', itens: [
    { to: '/financeiro', nome: 'Financeiro', icon: Wallet, tecla: '8' },
    { to: '/metricas', nome: 'Métricas', icon: BarChart3, tecla: '9' },
    { to: '/config', nome: 'Configurações', icon: Settings },
  ] },
]
const TODOS = GRUPOS.flatMap((g) => g.itens)
// Celular: os quatro mais usados na barra, o resto em "Mais".
const BARRA = ['/', '/agenda', '/clientes', '/financeiro']

function useTema() {
  const [escuro, setEscuro] = useState(() => document.documentElement.dataset.tema === 'escuro')
  useEffect(() => {
    if (escuro) document.documentElement.dataset.tema = 'escuro'
    else delete document.documentElement.dataset.tema
    try { localStorage.setItem('vp-tema', escuro ? 'escuro' : 'claro') } catch { /* modo privado */ }
  }, [escuro])
  return [escuro, () => setEscuro((v) => !v)] as const
}

// Tabelas em que a mudança feita por um aparece na tela do outro.
const TEMPO_REAL: Record<string, string> = {
  leads: 'leads', mensagens: 'mensagens', followups: 'followups', agenda: 'agenda',
  clientes: 'clientes', projetos: 'projetos', propostas: 'propostas', fin_lancamentos: 'fin',
}

function useRealtime(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const canal = supabase.channel('painel')
    for (const [tabela, chave] of Object.entries(TEMPO_REAL)) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => invalidar(chave))
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
  const [mais, setMais] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  useRealtime(!!eu)
  useEffect(() => setMais(false), [loc.pathname])

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setComando((v) => !v); return }
      if (ehCampo(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') { e.preventDefault(); setComando(true); return }
      const item = TODOS.find((n) => n.tecla === e.key)
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

  const linkMenu = (n: Item) => (
    <NavLink key={n.to} to={n.to} end={n.to === '/'}
      className={({ isActive }) => cx('group flex items-center gap-3 h-9 px-3 rounded text-sm transition-colors',
        isActive ? 'bg-tinta text-fundo font-medium' : 'text-tinta-2 hover:bg-realce hover:text-tinta')}>
      <n.icon size={17} strokeWidth={1.8} />
      <span className="flex-1">{n.nome}</span>
      {n.tecla && <span className="font-mono text-[10px] opacity-0 group-hover:opacity-60">{n.tecla}</span>}
    </NavLink>
  )

  return (
    <div className="min-h-full md:pl-60 print:pl-0">
      {/* Menu lateral (computador) */}
      <aside className="hidden md:flex print:!hidden fixed inset-y-0 left-0 w-60 flex-col border-r border-fio bg-folha">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-fio shrink-0">
          <Marca />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight" style={{ fontStretch: '115%' }}>Vera Group</div>
            <div className="rotulo !text-[10px]">Manager</div>
          </div>
        </div>
        <button onClick={() => setComando(true)} className="mx-3 mt-4 h-9 px-3 flex items-center gap-2 rounded border border-fio text-sm text-tinta-3 hover:border-tinta-3 transition-colors shrink-0">
          <Search size={15} /> <span className="flex-1 text-left">Buscar</span> <span className="tecla">Ctrl K</span>
        </button>
        <nav className="flex-1 overflow-y-auto rolagem-fina px-3 py-3 space-y-4">
          {GRUPOS.map((g, i) => (
            <div key={i} className="space-y-0.5">
              {g.titulo && <div className="rotulo !text-[10px] px-3 pb-1">{g.titulo}</div>}
              {g.itens.map(linkMenu)}
            </div>
          ))}
        </nav>
        <div className="border-t border-fio p-3 flex items-center gap-2.5 shrink-0">
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
      <header className="md:hidden print:hidden sticky top-0 z-30 h-14 flex items-center gap-2 px-4 bg-fundo/90 backdrop-blur border-b border-fio">
        <Marca />
        <span className="font-semibold flex-1" style={{ fontStretch: '115%' }}>Vera Group</span>
        <button className="btn-icone" onClick={() => setComando(true)} aria-label="Buscar"><Search size={18} /></button>
        <button className="btn-icone" onClick={alternarTema} aria-label="Trocar tema">{escuro ? <Sun size={18} /> : <Moon size={18} />}</button>
      </header>

      <main key={loc.pathname.split('/')[1]}>
        <Suspense fallback={<div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-3"><Esqueleto className="h-8 w-48" /><Esqueleto className="h-64" /></div>}>
          <Routes>
            <Route path="/" element={<Hoje />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/funil" element={<Funil />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetalhe />} />
            <Route path="/propostas" element={<Propostas />} />
            <Route path="/propostas/:id" element={<PropostaEditor />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/metricas" element={<Metricas />} />
            <Route path="/config" element={<Config />} />
            <Route path="*" element={<Hoje />} />
          </Routes>
        </Suspense>
      </main>

      {/* Barra inferior (celular) */}
      <nav className="md:hidden print:hidden fixed bottom-0 inset-x-0 z-30 bg-folha/95 backdrop-blur border-t border-fio pb-seguro">
        <div className="grid grid-cols-5">
          {BARRA.map((to) => TODOS.find((n) => n.to === to)!).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) => cx('flex flex-col items-center justify-center gap-1 h-14 text-[11px]', isActive ? 'text-tinta font-medium' : 'text-tinta-3')}>
              {({ isActive }) => (<><n.icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />{n.nome}</>)}
            </NavLink>
          ))}
          <button onClick={() => setMais(true)} className={cx('flex flex-col items-center justify-center gap-1 h-14 text-[11px]', !BARRA.includes('/' + loc.pathname.split('/')[1]) && loc.pathname !== '/' ? 'text-tinta font-medium' : 'text-tinta-3')}>
            <Menu size={20} strokeWidth={1.7} />Mais
          </button>
        </div>
      </nav>

      {/* "Mais" no celular: o menu inteiro */}
      {mais && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-tinta/40" onClick={() => setMais(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-folha rounded-t-lg p-4 pb-seguro animate-entra max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5"><Avatar nome={eu.nome} tamanho="sm" /><span className="text-sm font-medium">{eu.nome}</span></div>
              <button className="btn-icone" onClick={() => setMais(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            {GRUPOS.map((g, i) => (
              <div key={i} className="mb-3">
                {g.titulo && <div className="rotulo px-1 pb-1.5">{g.titulo}</div>}
                <div className="grid grid-cols-3 gap-2">
                  {g.itens.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs', isActive ? 'border-tinta bg-realce' : 'border-fio')}>
                      <n.icon size={20} strokeWidth={1.7} />{n.nome}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn-sec w-full mt-2" onClick={sair}><LogOut size={15} /> Sair</button>
          </div>
        </div>
      )}

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
