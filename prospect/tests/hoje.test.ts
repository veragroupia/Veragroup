import { describe, expect, it } from 'vitest'
import { classificarHoje, ordenarHoje, type EntradaHoje } from '../supabase/functions/_shared/inteligencia/hoje.ts'
import { AGORA } from './apoio.ts'

const fim = new Date('2026-10-22T23:59:59-03:00')
const base = (extra: Partial<EntradaHoje> = {}): EntradaHoje => ({
  agora: AGORA, fimDoDia: fim, diasAguardar: 2,
  lead: { etapa: 'contatado', ultimo_contato_em: null, ultima_resposta_em: null, whatsapp: '5511980001000', telefone: null },
  bloqueado: false, temperatura: null, proximaAcao: null, retornoEm: null, reuniaoHoje: null, followup: null, proposta: null,
  ...extra,
})

describe('fila da tela Hoje', () => {
  it('lead morno com retorno combinado vem antes de um quente que já foi respondido', () => {
    const morno = classificarHoje(base({ temperatura: 'morno', retornoEm: '2026-10-22T09:00:00-03:00', lead: { ...base().lead, ultimo_contato_em: '2026-10-19T10:00:00-03:00' } }))!
    const quente = classificarHoje(base({ temperatura: 'quente', proximaAcao: 'aguardar', lead: { ...base().lead, ultimo_contato_em: '2026-10-22T10:00:00-03:00' } }))!
    expect(morno.grupo).toBe('compromisso')
    expect(quente.grupo).toBe('aguardar')
    const fila = ordenarHoje([{ item: quente }, { item: morno }])
    expect(fila[0].item).toBe(morno)
  })

  it('cliente que falou por último vai para "resposta"', () => {
    const i = classificarHoje(base({ lead: { ...base().lead, ultimo_contato_em: '2026-10-21T10:00:00-03:00', ultima_resposta_em: '2026-10-22T11:00:00-03:00' } }))
    expect(i?.grupo).toBe('resposta')
  })

  it('proposta parada vira ação de proposta', () => {
    const i = classificarHoje(base({ lead: { ...base().lead, etapa: 'proposta', ultimo_contato_em: '2026-10-18T10:00:00-03:00' }, proposta: { status: 'enviada', enviada_em: '2026-10-18T10:00:00-03:00', created_at: '2026-10-17T10:00:00-03:00' } }))
    expect(i?.grupo).toBe('proposta')
  })

  it('bloqueado e encerrado não entram na fila', () => {
    expect(classificarHoje(base({ bloqueado: true, retornoEm: '2026-10-22T09:00:00-03:00' }))).toBeNull()
    expect(classificarHoje(base({ lead: { ...base().lead, etapa: 'perdido' } }))).toBeNull()
  })

  it('follow-up do dia com recomendação de aguardar não vira cobrança', () => {
    const i = classificarHoje(base({ proximaAcao: 'aguardar', followup: { agendado_para: '2026-10-22T09:00:00-03:00', tentativa: 2, motivo: 'Sem resposta após mensagem' } }))
    expect(i?.grupo).toBe('aguardar')
  })

  it('primeiro contato só para lead novo com telefone e sem contato', () => {
    expect(classificarHoje(base({ lead: { ...base().lead, etapa: 'novo' } }))?.grupo).toBe('primeiro')
    expect(classificarHoje(base({ lead: { ...base().lead, etapa: 'novo', whatsapp: null } }))).toBeNull()
  })
})
