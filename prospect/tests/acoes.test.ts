import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Supabase falso: registra cada operação por tabela. */
const ops: { tabela: string; op: string; dados?: unknown }[] = []
let bloqueado = false
function construtor(tabela: string) {
  const r: Record<string, unknown> = {}
  const fim = (op: string, dados?: unknown) => {
    ops.push({ tabela, op, dados })
    const resposta = tabela === 'contatos_bloqueados'
      ? { data: bloqueado ? [{ motivo: 'Pediu para parar' }] : [], error: null }
      : tabela === 'radar_config' ? { data: { whatsapp_leitura_ativo: false }, error: null }
      : { data: tabela === 'mensagens' ? [{ id: 'msg-nova' }] : { id: 'envio-1' }, error: null }
    const p: Record<string, unknown> = { ...resposta, then: (ok: (v: unknown) => unknown) => Promise.resolve(resposta).then(ok) }
    for (const k of ['eq', 'or', 'limit', 'select', 'single', 'maybeSingle', 'in', 'order']) p[k] = () => p
    return p
  }
  r.insert = (d: unknown) => fim('insert', d)
  r.update = (d: unknown) => fim('update', d)
  r.delete = () => fim('delete')
  r.select = () => fim('select')
  return r
}
vi.mock('../src/lib/supabase', () => ({ supabase: { from: (t: string) => construtor(t) }, chamarFuncao: vi.fn() }))
vi.mock('../src/lib/dados', () => ({ invalidar: vi.fn(), q: async (p: PromiseLike<{ data: unknown }>) => (await p).data }))

const { abrirWhatsApp, confirmarEnvio, parseConversa, separarColadas } = await import('../src/lib/acoes')

const eu = { email: 'otavio@vera.com', nome: 'Otávio Barbieri', papel: 'admin', ativo: true }
const lead = { id: 'L1', whatsapp: '5511980001000', telefone: null, responsavel: 'otavio@vera.com' }

beforeEach(() => {
  ops.length = 0; bloqueado = false
  vi.stubGlobal('window', { open: vi.fn() })
})

describe('WhatsApp aberto não é envio confirmado', () => {
  it('16. abrir o WhatsApp registra a abertura, mas não grava mensagem nem marca o follow-up', async () => {
    const envio = await abrirWhatsApp(lead, 'Oi, tudo bem?', eu, 'fu-1')
    expect(envio).toEqual({ id: 'envio-1' })
    expect(ops.some((o) => o.tabela === 'envios' && o.op === 'insert')).toBe(true)
    expect(ops.some((o) => o.tabela === 'mensagens' && o.op === 'insert')).toBe(false)
    expect(ops.some((o) => o.tabela === 'followups' && o.op === 'update')).toBe(false)
  })

  it('só a confirmação grava a mensagem como enviada e confirmada', async () => {
    await confirmarEnvio({ id: 'envio-1', lead_id: 'L1', texto: 'Oi, tudo bem?', followup_id: 'fu-1', rascunho_id: 'r-1', variante: 'a' }, eu)
    const msg = ops.find((o) => o.tabela === 'mensagens' && o.op === 'insert')
    expect(msg?.dados).toEqual([expect.objectContaining({ direcao: 'enviada', confirmada: true })])
    expect(ops.find((o) => o.tabela === 'envios' && o.op === 'update')?.dados).toEqual(expect.objectContaining({ status: 'confirmado', mensagem_id: 'msg-nova' }))
    expect(ops.find((o) => o.tabela === 'rascunhos_ia')?.dados).toEqual(expect.objectContaining({ usada: 'a', mensagem_id: 'msg-nova' }))
  })

  it('contato bloqueado nem abre o WhatsApp', async () => {
    bloqueado = true
    await expect(abrirWhatsApp(lead, 'Oi', eu)).rejects.toThrow(/bloqueado/)
    expect((window.open as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })
})

describe('20. fluxos existentes continuam iguais', () => {
  it('importação do WhatsApp e registro de mensagens coladas', () => {
    const exportada = parseConversa('12/09/2026 14:03 - Vera: Oi!\n12/09/2026 14:05 - Doce Encanto: Oi, tudo bem?', 'Doce Encanto Confeitaria')
    expect(exportada.map((m) => m.direcao)).toEqual(['enviada', 'recebida'])
    const coladas = separarColadas('[17:22, 21/10/2026] +55 11 98000-1000: Olá\n[17:23, 21/10/2026] Otávio: Oi!', { nome: 'Doce Encanto', whatsapp: '5511980001000', telefone: null }, ['Otávio Barbieri'])
    expect(coladas.map((m) => m.direcao)).toEqual(['recebida', 'enviada'])
  })
})
