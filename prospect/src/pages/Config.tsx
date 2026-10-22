import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Play, Plus, Radar, UserPlus, X } from 'lucide-react'
import { supabase, chamarFuncao } from '../lib/supabase'
import { invalidar, q, useConsulta } from '../lib/dados'
import { useSessao } from '../lib/sessao'
import { esquecerLeitura } from '../lib/acoes'
import type { Membro, RadarConfig } from '../lib/tipos'
import { cx, relativo } from '../lib/util'
import { useAviso, useExecutar } from '../components/Aviso'
import { Abas, Avatar, Campo, Erro, Interruptor, Linhas, Modal, Pagina } from '../components/ui'

type Aba = 'radar' | 'mensagem' | 'equipe' | 'integracoes'

export default function Config() {
  const [aba, setAba] = useState<Aba>('radar')
  const cfg = useConsulta('config', () => q<RadarConfig>(supabase.from('radar_config').select('*').eq('id', 1).single()), ['radar_config'])
  return (
    <Pagina titulo="Configurações" largura="max-w-4xl">
      <Abas valor={aba} onChange={setAba} abas={[
        { id: 'radar', nome: 'Radar' }, { id: 'mensagem', nome: 'Mensagem' }, { id: 'equipe', nome: 'Equipe' }, { id: 'integracoes', nome: 'Integrações' },
      ]} />
      <div className="pt-6">
        {cfg.erro && <Erro msg={cfg.erro} onTentar={cfg.recarregar} />}
        {aba === 'radar' && (cfg.data ? <AbaRadar cfg={cfg.data} /> : <Linhas n={3} />)}
        {aba === 'mensagem' && (cfg.data ? <AbaMensagem cfg={cfg.data} /> : <Linhas n={3} />)}
        {aba === 'equipe' && <AbaEquipe />}
        {aba === 'integracoes' && <AbaIntegracoes />}
      </div>
    </Pagina>
  )
}

async function salvarConfig(campos: Partial<RadarConfig>) {
  await q(supabase.from('radar_config').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', 1))
  invalidar('radar_config')
}

function Lista({ rotulo, itens, onChange, placeholder }: { rotulo: string; itens: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [novo, setNovo] = useState('')
  const add = () => { const v = novo.trim(); if (v && !itens.includes(v)) onChange([...itens, v]); setNovo('') }
  return (
    <div>
      <span className="lbl">{rotulo} · {itens.length}</span>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {itens.map((i) => (
          <span key={i} className="inline-flex items-center gap-1 h-8 pl-3 pr-1.5 rounded-full bg-realce text-sm">
            {i}<button className="w-5 h-5 grid place-items-center rounded-full hover:bg-fio" onClick={() => onChange(itens.filter((x) => x !== i))} aria-label={`Remover ${i}`}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="inp" value={novo} placeholder={placeholder} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button className="btn-sec" onClick={add} disabled={!novo.trim()}><Plus size={15} /></button>
      </div>
    </div>
  )
}

function AbaRadar({ cfg }: { cfg: RadarConfig }) {
  const executar = useExecutar()
  const avisar = useAviso()
  const [cidades, setCidades] = useState(cfg.cidades)
  const [nichos, setNichos] = useState(cfg.nichos)
  const [max, setMax] = useState(cfg.max_novos_por_dia)
  const [rodar, setRodar] = useState({ cidade: '', nicho: '' })
  const [rodando, setRodando] = useState(false)
  const mudou = JSON.stringify([cidades, nichos, max]) !== JSON.stringify([cfg.cidades, cfg.nichos, cfg.max_novos_por_dia])
  const combinacoes = cidades.length * nichos.length

  async function rodarAgora() {
    setRodando(true)
    let r: { novos: number; buscas: number; erro: string | null } | undefined
    await executar(async () => {
      r = await chamarFuncao('radar', { forcar: true, ...(rodar.cidade && rodar.nicho ? { cidade: rodar.cidade, nicho: rodar.nicho } : {}) })
    })
    setRodando(false)
    if (r) { invalidar('leads'); avisar(r.erro ? `Radar parou: ${r.erro}` : `Radar terminou: ${r.novos} leads novos em ${r.buscas} buscas`, r.erro ? 'erro' : 'ok') }
  }

  return (
    <div className="space-y-6">
      <div className="folha p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Interruptor ligado={cfg.ativo} onChange={(v) => executar(() => salvarConfig({ ativo: v }), v ? 'Radar ligado' : 'Radar desligado')}
            rotulo={<span><b className="font-medium">Radar automático {cfg.ativo ? 'ligado' : 'desligado'}</b><span className="block text-tinta-3 text-xs">Busca no Google Maps negócios sem site, todo dia, girando entre as combinações.</span></span>} />
        </div>
        <span className="text-xs text-tinta-3">Atualizado {relativo(cfg.updated_at)}</span>
      </div>

      <div className="folha p-5 space-y-6">
        <Lista rotulo="Cidades" itens={cidades} onChange={setCidades} placeholder="Ex.: Porto Feliz, SP" />
        <Lista rotulo="Nichos" itens={nichos} onChange={setNichos} placeholder="Ex.: pet shop" />
        <Campo rotulo="Máximo de leads novos por dia" dica={`${combinacoes} combinações de cidade e nicho. O radar continua de onde parou no dia seguinte.`}>
          <input type="number" min={1} max={200} className="inp w-32 numero" value={max} onChange={(e) => setMax(Number(e.target.value))} />
        </Campo>
        <div className="flex justify-end gap-2 border-t border-fio pt-4">
          {mudou && <button className="btn-fantasma" onClick={() => { setCidades(cfg.cidades); setNichos(cfg.nichos); setMax(cfg.max_novos_por_dia) }}>Desfazer</button>}
          <button className="btn-pri" disabled={!mudou} onClick={() => executar(() => salvarConfig({ cidades, nichos, max_novos_por_dia: max }), 'Radar salvo')}>Salvar</button>
        </div>
      </div>

      <div className="folha p-5">
        <h2 className="font-semibold flex items-center gap-2"><Radar size={16} /> Rodar agora</h2>
        <p className="text-sm text-tinta-3 mt-1 mb-4">Deixe em branco para seguir a rotação normal, ou escolha uma busca específica.</p>
        <div className="flex flex-wrap gap-2">
          <select className="inp w-auto" value={rodar.cidade} onChange={(e) => setRodar({ ...rodar, cidade: e.target.value })}>
            <option value="">Cidade (rotação)</option>{cfg.cidades.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="inp w-auto flex-1 min-w-[160px]" list="cfg-nichos" placeholder="Nicho (rotação)" value={rodar.nicho} onChange={(e) => setRodar({ ...rodar, nicho: e.target.value })} />
          <datalist id="cfg-nichos">{cfg.nichos.map((n) => <option key={n} value={n} />)}</datalist>
          <button className="btn-sinal" onClick={rodarAgora} disabled={rodando || (!!rodar.cidade !== !!rodar.nicho)}>
            <Play size={14} fill="currentColor" className={cx(rodando && 'animate-pulsa')} /> {rodando ? 'Buscando… pode levar 1 min' : 'Rodar radar'}
          </button>
        </div>
        {!!rodar.cidade !== !!rodar.nicho && <p className="text-xs text-alerta mt-2">Escolha cidade e nicho juntos, ou deixe os dois em branco.</p>}
      </div>
    </div>
  )
}

const EXEMPLO = { empresa: 'Doce Encanto Confeitaria', cidade: 'Salto', nicho: 'confeitaria', elogio: 'Vocês têm nota 4,8 com 132 avaliações, parabéns!' }

function AbaMensagem({ cfg }: { cfg: RadarConfig }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const [tpl, setTpl] = useState(cfg.template_mensagem)
  useEffect(() => setTpl(cfg.template_mensagem), [cfg.template_mensagem])
  const previa = tpl.replaceAll('{vendedor}', eu!.nome.split(' ')[0]).replaceAll('{empresa}', EXEMPLO.empresa)
    .replaceAll('{cidade}', EXEMPLO.cidade).replaceAll('{nicho}', EXEMPLO.nicho).replaceAll('{elogio}', EXEMPLO.elogio)
  const vars = ['{vendedor}', '{empresa}', '{cidade}', '{nicho}', '{elogio}']

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="folha p-5">
          <span className="lbl">Primeira mensagem do radar</span>
          <textarea className="inp text-[14px]" rows={9} value={tpl} onChange={(e) => setTpl(e.target.value)} />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {vars.map((v) => <button key={v} className="font-mono text-[11px] px-2 py-1 rounded bg-realce hover:bg-fio" onClick={() => setTpl((t) => t + v)}>{v}</button>)}
          </div>
          <p className="text-xs text-tinta-3 mt-3">Vale para os próximos leads do radar. Os que já existem guardam a mensagem com que chegaram. O {'{elogio}'} usa a nota do Google ou o Instagram do lead.</p>
          <div className="flex justify-end mt-4">
            <button className="btn-pri" disabled={tpl === cfg.template_mensagem} onClick={() => executar(() => salvarConfig({ template_mensagem: tpl }), 'Mensagem salva')}>Salvar</button>
          </div>
        </div>
        <div>
          <span className="lbl">Como chega no WhatsApp</span>
          <div className="rounded-lg p-4 bg-[#e9e4da] dark:bg-realce">
            <div className="ml-auto max-w-[90%] rounded-lg rounded-br-sm bg-[#d9fdd3] dark:bg-[#1f4d34] text-[#111] dark:text-tinta px-3 py-2 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm">{previa}</div>
          </div>
          <p className="text-xs text-tinta-3 mt-2">{previa.length} caracteres. Mensagens com menos de 400 costumam ter mais resposta.</p>
        </div>
      </div>

      <div className="folha p-5">
        <Interruptor ligado={cfg.whatsapp_leitura_ativo}
          onChange={(v) => executar(async () => { await salvarConfig({ whatsapp_leitura_ativo: v }); esquecerLeitura() }, 'Salvo')}
          rotulo={<span><b className="font-medium">Leitura automática do WhatsApp</b><span className="block text-tinta-3 text-xs">Ligue só se o número da empresa estiver conectado ao webhook. Assim as mensagens entram sozinhas e o painel para de registrar o envio manualmente.</span></span>} />
      </div>
    </div>
  )
}

function AbaEquipe() {
  const { equipe, ehAdmin, eu } = useSessao()
  const executar = useExecutar()
  const [novo, setNovo] = useState(false)
  const [lista, setLista] = useState<Membro[]>(equipe)
  useEffect(() => setLista(equipe), [equipe])

  async function alterar(m: Membro, campos: Partial<Membro>) {
    if (await executar(() => q(supabase.from('equipe').update(campos).eq('email', m.email)), 'Equipe atualizada')) {
      setLista((l) => l.map((x) => (x.email === m.email ? { ...x, ...campos } : x)))
    }
  }

  return (
    <div className="space-y-4">
      {ehAdmin && <div className="flex justify-end"><button className="btn-pri" onClick={() => setNovo(true)}><UserPlus size={15} /> Adicionar pessoa</button></div>}
      <ul className="folha divide-y divide-fio">
        {lista.map((m) => (
          <li key={m.email} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', !m.ativo && 'opacity-55')}>
            <Avatar nome={m.nome} />
            <div className="flex-1 min-w-[180px]">
              <div className="font-medium">{m.nome}{m.email === eu!.email && <span className="text-tinta-3 font-normal"> · você</span>}</div>
              <div className="text-xs text-tinta-3">{m.email}</div>
            </div>
            {ehAdmin && m.email !== eu!.email ? (
              <>
                <select className="inp w-auto h-8 text-[13px]" value={m.papel} onChange={(e) => alterar(m, { papel: e.target.value })}>
                  <option value="vendedor">Vendedor</option><option value="admin">Admin</option>
                </select>
                <Interruptor ligado={m.ativo} onChange={(v) => alterar(m, { ativo: v })} rotulo={<span className="text-xs text-tinta-3 w-12">{m.ativo ? 'Ativo' : 'Inativo'}</span>} />
              </>
            ) : <span className="rotulo">{m.papel}</span>}
          </li>
        ))}
      </ul>
      {!ehAdmin && <p className="text-sm text-tinta-3">Só admins adicionam ou removem pessoas.</p>}
      {novo && <NovoMembro onFechar={() => setNovo(false)} />}
    </div>
  )
}

function NovoMembro({ onFechar }: { onFechar: () => void }) {
  const executar = useExecutar()
  const avisar = useAviso()
  const [f, setF] = useState({ nome: '', email: '', papel: 'vendedor' })
  const [senha, setSenha] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    await executar(async () => {
      const { data, error } = await supabase.rpc('adicionar_membro', { p_email: f.email.trim(), p_nome: f.nome.trim(), p_papel: f.papel })
      if (error) throw error
      setSenha(data as string)
    })
  }

  if (senha) return (
    <Modal titulo="Pessoa adicionada" onFechar={() => location.reload()} rodape={<button className="btn-pri" onClick={() => location.reload()}>Pronto</button>}>
      <p className="text-sm">Envie estes dados para {f.nome.split(' ')[0]}. A senha só aparece agora.</p>
      <div className="mt-4 folha p-4 font-mono text-sm space-y-1 bg-realce">
        <div>{f.email.trim().toLowerCase()}</div><div className="text-lg">{senha}</div>
      </div>
      <button className="btn-sec btn-sm mt-3" onClick={() => { navigator.clipboard.writeText(`Vera Group Manager\n${location.origin}\nE-mail: ${f.email.trim().toLowerCase()}\nSenha: ${senha}`); avisar('Copiado') }}><Copy size={13} /> Copiar acesso</button>
    </Modal>
  )

  return (
    <Modal titulo="Adicionar pessoa" onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" form="novo-membro" disabled={!f.nome.trim() || !f.email.includes('@')}>Adicionar</button></>}>
      <form id="novo-membro" onSubmit={salvar} className="space-y-4">
        <Campo rotulo="Nome"><input className="inp" autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
        <Campo rotulo="E-mail"><input className="inp" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Campo>
        <Campo rotulo="Papel">
          <select className="inp" value={f.papel} onChange={(e) => setF({ ...f, papel: e.target.value })}><option value="vendedor">Vendedor</option><option value="admin">Admin</option></select>
        </Campo>
        <p className="text-xs text-tinta-3">Uma senha é gerada na hora. Se a pessoa já tiver acesso, a senha dela é trocada.</p>
      </form>
    </Modal>
  )
}

const CHAVES = [
  { nome: 'google_places_api_key', titulo: 'Google Places', uso: 'Usada pelo radar para buscar negócios no Maps.' },
  { nome: 'anthropic_api_key', titulo: 'Anthropic (Claude)', uso: 'Avaliação das conversas e reuniões.' },
  { nome: 'groq_api_key', titulo: 'Groq', uso: 'Transcrição de áudio e reserva da avaliação.' },
  { nome: 'openai_api_key', titulo: 'OpenAI', uso: 'Transcrição de áudio, se não houver Groq.' },
]

function AbaIntegracoes() {
  const { ehAdmin } = useSessao()
  const executar = useExecutar()
  const status = useConsulta('segredos', () => q<{ nome: string; configurado: boolean }[]>(supabase.rpc('segredos_status')), ['segredos'])
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')

  async function salvar(nome: string) {
    if (await executar(async () => { await q(supabase.rpc('salvar_segredo', { p_nome: nome, p_valor: valor.trim() })); invalidar('segredos') }, 'Chave salva no cofre')) {
      setEditando(null); setValor('')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-tinta-3">As chaves ficam no cofre do Supabase (Vault). Ninguém consegue ler depois de salvas, nem pelo painel.</p>
      <ul className="folha divide-y divide-fio">
        {CHAVES.map((c) => {
          const ok = status.data?.find((s) => s.nome === c.nome)?.configurado
          return (
            <li key={c.nome} className="px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <KeyRound size={16} className="text-tinta-3" />
                <div className="flex-1 min-w-[200px]"><div className="font-medium">{c.titulo}</div><div className="text-xs text-tinta-3">{c.uso}</div></div>
                {status.data && (ok ? <span className="inline-flex items-center gap-1 text-xs text-ok"><Check size={13} /> Configurada</span> : <span className="text-xs text-sinal">Faltando</span>)}
                {ehAdmin && editando !== c.nome && <button className="btn-sec btn-sm" onClick={() => { setEditando(c.nome); setValor('') }}>{ok ? 'Trocar' : 'Adicionar'}</button>}
              </div>
              {editando === c.nome && (
                <div className="flex gap-2 mt-3">
                  <input className="inp font-mono" type="password" autoFocus autoComplete="off" placeholder="Cole a chave" value={valor} onChange={(e) => setValor(e.target.value)} />
                  <button className="btn-pri" disabled={valor.trim().length < 10} onClick={() => salvar(c.nome)}>Salvar</button>
                  <button className="btn-fantasma" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {!ehAdmin && <p className="text-sm text-tinta-3">Só admins trocam as chaves.</p>}
    </div>
  )
}
