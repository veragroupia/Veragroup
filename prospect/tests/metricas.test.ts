import { describe, expect, it } from 'vitest'
import { calcular, type MsgM } from '../src/lib/metricas'

const desde = new Date('2026-10-01T00:00:00-03:00')
const m = (id: string, lead: string, direcao: 'enviada' | 'recebida', em: string, extra: Partial<MsgM> = {}): MsgM =>
  ({ id, lead_id: lead, direcao, enviada_em: em, origem: 'manual', confirmada: true, autor: 'a@vera.com', ...extra })
const vazio = { envios: [], leads: [], intel: [], historico: [], rascunhos: [], propostas: [] }

describe('métricas comerciais', () => {
  it('16. WhatsApp aberto sem confirmação não conta como envio', () => {
    const r = calcular({
      desde, ...vazio,
      mensagens: [m('1', 'L1', 'enviada', '2026-10-10T10:00:00-03:00', { confirmada: null })],
      envios: [{ status: 'aberto', aberto_em: '2026-10-10T10:00:00-03:00' }, { status: 'nao_enviado', aberto_em: '2026-10-11T10:00:00-03:00' }],
    })
    expect(r.enviosConfirmados).toBe(0)
    expect(r.primeirosContatos).toBe(0)
    expect(r.semConfirmacao).toBe(1)
    expect(r.naoEnviados).toBe(1)
    expect(r.legados).toBe(1)
  })

  it('amostra pequena não vira porcentagem', () => {
    const r = calcular({ desde, ...vazio, mensagens: [m('1', 'L1', 'enviada', '2026-10-10T10:00:00-03:00'), m('2', 'L1', 'recebida', '2026-10-10T12:00:00-03:00')] })
    expect(r.respostaHumana.n).toBe(1)
    expect(r.respostaHumana.pct).toBeNull()
    expect(r.medianaHorasResposta).toBe(2)
  })

  it('variante só leva crédito pela resposta depois do próprio envio', () => {
    const msgs: MsgM[] = []
    const rascunhos = []
    for (let i = 0; i < 5; i++) {
      msgs.push(m(`r${i}`, `L${i}`, 'recebida', '2026-10-05T10:00:00-03:00')) // respondeu ANTES da sugestão
      rascunhos.push({ lead_id: `L${i}`, usada: 'a' as const, enviada_confirmada_em: '2026-10-06T10:00:00-03:00' })
    }
    const r = calcular({ desde, ...vazio, mensagens: msgs, rascunhos })
    expect(r.variantes.a).toEqual({ n: 5, sim: 0, pct: 0 })
  })

  it('receita só soma fechamentos com valor informado', () => {
    const r = calcular({ desde, ...vazio, mensagens: [], leads: [
      { id: 'A', etapa: 'fechado', created_at: '2026-09-01', fechado_em: '2026-10-05', valor_setup: 1200, valor_mensal: 97, nicho: null },
      { id: 'B', etapa: 'fechado', created_at: '2026-09-01', fechado_em: '2026-10-06', valor_setup: null, valor_mensal: null, nicho: null },
    ] })
    expect(r.ganhas).toBe(2)
    expect(r.receitaSetup).toBe(1200)
    expect(r.fechadosSemValor).toBe(1)
  })
})
