import { ArrowRight, CalendarCheck, Clock, MessageCircle, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { q, useConsulta } from '../../lib/dados'
import { useSessao } from '../../lib/sessao'
import { etapaInfo, type Atividade, type Etapa, type Followup } from '../../lib/tipos'
import { dataHora } from '../../lib/util'
import { Linhas, Vazio } from '../ui'

type Evento = { id: string; quando: string; icone: typeof Clock; texto: React.ReactNode; quem?: string | null }

export function Historico({ leadId, followups }: { leadId: string; followups: Followup[] }) {
  const { nomeDe } = useSessao()
  const ativ = useConsulta(`lead:${leadId}:ativ`, () =>
    q<Atividade[]>(supabase.from('atividades').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(200)), ['atividades', 'leads'])

  if (ativ.carregando) return <Linhas n={4} />

  const eventos: Evento[] = [
    ...(ativ.data ?? []).map((a): Evento => {
      const base = { id: `a${a.id}`, quando: a.created_at, quem: a.usuario }
      if (a.tipo === 'etapa') return { ...base, icone: ArrowRight, texto: <>Etapa: {etapaInfo(a.detalhe.de as Etapa).nome} → <b>{etapaInfo(a.detalhe.para as Etapa).nome}</b></> }
      if (a.tipo === 'whatsapp_aberto') return { ...base, icone: MessageCircle, texto: a.detalhe.followup ? 'Follow-up enviado pelo WhatsApp' : 'Abriu o WhatsApp' }
      if (a.tipo === 'avaliacao') return { ...base, icone: Sparkles, texto: <>Avaliação da {a.detalhe.alvo === 'reuniao' ? 'reunião' : 'conversa'}: nota <b>{String(a.detalhe.nota ?? '-').replace('.', ',')}</b></> }
      if (a.tipo === 'reuniao') return { ...base, icone: CalendarCheck, texto: <>Reunião agendada para {dataHora(a.detalhe.data_hora)}</> }
      return { ...base, icone: Clock, texto: a.tipo }
    }),
    ...followups.filter((f) => f.status !== 'pendente').map((f): Evento => ({
      id: `f${f.id}`, quando: f.feito_em ?? f.agendado_para, icone: Clock, quem: f.feito_por,
      texto: <>Follow-up {f.tentativa}ª tentativa {f.status === 'feito' ? 'feito' : 'pulado'}{f.motivo ? ` · ${f.motivo}` : ''}</>,
    })),
  ].sort((a, b) => +new Date(b.quando) - +new Date(a.quando))

  if (!eventos.length) return <div className="folha"><Vazio titulo="Sem histórico ainda." /></div>

  return (
    <ol className="folha p-4 md:p-5">
      {eventos.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < eventos.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-fio" />}
          <span className="w-7 h-7 rounded-full bg-realce grid place-items-center text-tinta-3 shrink-0"><e.icone size={13} /></span>
          <div className="pt-1 text-sm min-w-0">
            <div>{e.texto}</div>
            <div className="text-xs text-tinta-3 mt-0.5">{dataHora(e.quando)}{e.quem && ` · ${nomeDe(e.quem)}`}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}
