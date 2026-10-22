import { useState } from 'react'
import { CalendarPlus, ChevronDown, ExternalLink, FileAudio, Sparkles } from 'lucide-react'
import { supabase, chamarFuncao } from '../../lib/supabase'
import { invalidar, q, useConsulta } from '../../lib/dados'
import { useSessao } from '../../lib/sessao'
import type { Lead, Reuniao } from '../../lib/tipos'
import { cx, dataHora, nomeCurto, relativo } from '../../lib/util'
import { useAviso, useExecutar } from '../Aviso'
import { Campo, Linhas, Modal, Vazio } from '../ui'

const TIPOS = [{ id: 'meet', nome: 'Google Meet' }, { id: 'presencial', nome: 'Presencial' }, { id: 'ligacao', nome: 'Ligação' }, { id: 'whatsapp', nome: 'Chamada no WhatsApp' }]
const nomeTipo = (t: string) => TIPOS.find((x) => x.id === t)?.nome ?? t

export function Reunioes({ lead }: { lead: Lead }) {
  const reunioes = useConsulta(`lead:${lead.id}:reu`, () => q<Reuniao[]>(supabase.from('reunioes').select('*').eq('lead_id', lead.id).order('data_hora', { ascending: false })), ['reunioes'])
  const [nova, setNova] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className="btn-pri" onClick={() => setNova(true)}><CalendarPlus size={15} /> Agendar reunião</button></div>
      {reunioes.carregando ? <Linhas n={2} /> : !reunioes.data?.length ? (
        <div className="folha"><Vazio titulo="Nenhuma reunião." icone={<CalendarPlus size={18} />}>
          Ao agendar, o lead vai para a etapa Reunião. Depois da conversa, suba o áudio: a transcrição e a avaliação saem sozinhas.
        </Vazio></div>
      ) : reunioes.data.map((r) => <CartaoReuniao key={r.id} r={r} />)}
      {nova && <NovaReuniao lead={lead} onFechar={() => setNova(false)} />}
    </div>
  )
}

function CartaoReuniao({ r }: { r: Reuniao }) {
  const executar = useExecutar()
  const avisar = useAviso()
  const [enviando, setEnviando] = useState<'' | 'audio' | 'transcrevendo' | 'avaliando'>('')
  const [aberta, setAberta] = useState(false)
  const futura = new Date(r.data_hora) > new Date()

  async function subirAudio(f?: File) {
    if (!f) return
    const ext = f.name.split('.').pop() || 'mp3'
    const caminho = `${r.lead_id}/${r.id}.${ext}`
    setEnviando('audio')
    const ok = await executar(async () => {
      const { error } = await supabase.storage.from('reunioes').upload(caminho, f, { upsert: true, contentType: f.type || undefined })
      if (error) throw error
      await q(supabase.from('reunioes').update({ audio_path: caminho }).eq('id', r.id))
      setEnviando('transcrevendo')
      const res = await chamarFuncao<{ caracteres: number; avaliacao: boolean; erro_avaliacao: string | null }>('transcrever', { reuniao_id: r.id })
      if (res.erro_avaliacao) avisar(`Transcrito, mas a avaliação falhou: ${res.erro_avaliacao}`, 'erro')
    })
    setEnviando('')
    invalidar('reunioes', 'avaliacoes', 'leads')
    if (ok) avisar('Áudio transcrito e avaliado')
  }

  async function avaliar() {
    setEnviando('avaliando')
    const ok = await executar(() => chamarFuncao('avaliar', { lead_id: r.lead_id, reuniao_id: r.id }))
    setEnviando('')
    if (ok) { invalidar('avaliacoes', 'reunioes'); avisar('Reunião avaliada. Veja a aba Avaliação IA.') }
  }

  async function status(s: string) {
    await executar(async () => { await q(supabase.from('reunioes').update({ status: s }).eq('id', r.id)); invalidar('reunioes') })
  }

  return (
    <article className="folha">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium">{dataHora(r.data_hora)} <span className="text-tinta-3 font-normal">· {relativo(r.data_hora)}</span></div>
          <div className="text-sm text-tinta-3 mt-0.5">{nomeTipo(r.tipo)} · <span className={cx(r.status === 'cancelada' && 'text-sinal', r.status === 'realizada' && 'text-ok')}>{r.status}</span></div>
        </div>
        {r.link && <a className="btn-sec btn-sm" href={r.link} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Entrar</a>}
        {r.status === 'agendada' && (
          <select className="inp w-auto h-8 text-[13px]" value="" onChange={(e) => e.target.value && status(e.target.value)}>
            <option value="">Marcar como…</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option>
          </select>
        )}
        {!futura && r.status !== 'cancelada' && (
          <label className={cx('btn-sec btn-sm cursor-pointer', enviando && 'pointer-events-none opacity-60')}>
            <FileAudio size={13} />
            {enviando === 'audio' ? 'Enviando áudio…' : enviando === 'transcrevendo' ? 'Transcrevendo…' : r.audio_path ? 'Trocar áudio' : 'Subir áudio'}
            <input type="file" accept="audio/*,video/mp4,.m4a,.ogg,.opus" className="sr-only" onChange={(e) => subirAudio(e.target.files?.[0])} />
          </label>
        )}
        {r.transcricao && <button className="btn-sec btn-sm" onClick={avaliar} disabled={!!enviando}><Sparkles size={13} /> {enviando === 'avaliando' ? 'Avaliando…' : 'Avaliar'}</button>}
      </div>
      {(r.resumo || r.transcricao) && (
        <div className="border-t border-fio px-4 py-3">
          {r.resumo && <p className="text-sm leading-relaxed">{r.resumo}</p>}
          {r.transcricao && (
            <>
              <button className="text-xs text-tinta-3 hover:text-tinta inline-flex items-center gap-1 mt-2" onClick={() => setAberta((v) => !v)}>
                <ChevronDown size={13} className={cx('transition-transform', aberta && 'rotate-180')} /> Transcrição ({r.transcricao.length.toLocaleString('pt-BR')} caracteres)
              </button>
              {aberta && <p className="mt-2 text-[13px] leading-relaxed text-tinta-2 whitespace-pre-wrap max-h-80 overflow-y-auto rolagem-fina">{r.transcricao}</p>}
            </>
          )}
        </div>
      )}
    </article>
  )
}

function NovaReuniao({ lead, onFechar }: { lead: Lead; onFechar: () => void }) {
  const { eu } = useSessao()
  const executar = useExecutar()
  const amanha = new Date(Date.now() + 86400e3)
  const [diaStr, setDia] = useState(amanha.toLocaleDateString('sv-SE'))
  const [horaStr, setHora] = useState('10:00')
  const [tipo, setTipo] = useState('meet')
  const [link, setLink] = useState('')

  async function salvar() {
    const data_hora = new Date(`${diaStr}T${horaStr}`).toISOString()
    const ok = await executar(async () => {
      await q(supabase.from('reunioes').insert({ lead_id: lead.id, data_hora, tipo, link: link.trim() || null, criado_por: eu!.email }))
      invalidar('reunioes', 'leads', 'atividades')
    }, 'Reunião agendada')
    if (ok) onFechar()
  }

  return (
    <Modal titulo={`Reunião com ${nomeCurto(lead.nome)}`} onFechar={onFechar}
      rodape={<><button className="btn-fantasma" onClick={onFechar}>Cancelar</button><button className="btn-pri" onClick={salvar}>Agendar</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Dia"><input type="date" className="inp" value={diaStr} onChange={(e) => setDia(e.target.value)} /></Campo>
        <Campo rotulo="Hora"><input type="time" className="inp" value={horaStr} onChange={(e) => setHora(e.target.value)} /></Campo>
        <Campo rotulo="Como" className="col-span-2">
          <div className="flex flex-wrap gap-1.5">{TIPOS.map((t) => <button key={t.id} type="button" className={tipo === t.id ? 'btn-pri btn-sm' : 'btn-sec btn-sm'} onClick={() => setTipo(t.id)}>{t.nome}</button>)}</div>
        </Campo>
        {tipo === 'meet' && <Campo rotulo="Link" className="col-span-2"><input className="inp" placeholder="https://meet.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} /></Campo>}
      </div>
    </Modal>
  )
}
