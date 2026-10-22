import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepararEmLote } from '../src/lib/lote'

/* Cenários do painel (27 a 30, 32 e 33) com um Supabase falso que registra cada operação. */

const ops: { tabela: string; op: string; dados?: unknown }[] = []
let falhas: Record<string, { code?: string; message: string }> = {}
function construtor(tabela: string) {
  const fim = (op: string, dados?: unknown) => {
    ops.push({ tabela, op, dados })
    const erro = falhas[`${tabela}:${op}`] ?? falhas[tabela] ?? null
    const resposta = erro ? { data: null, error: erro } : tabela === 'contatos_bloqueados' ? { data: [], error: null }
      : tabela === 'radar_config' ? { data: { whatsapp_leitura_ativo: false }, error: null }
      : tabela === 'lead_inteligencia' && op === 'select' ? { data: [{ lead_id: 'L1', temperatura: 'morno' }], error: null }
      : { data: { id: 'envio-1' }, error: null }
    const p: Record<string, unknown> = { ...resposta, then: (ok: (v: unknown) => unknown) => Promise.resolve(resposta).then(ok) }
    for (const k of ['eq', 'or', 'limit', 'select', 'single', 'maybeSingle', 'in', 'order']) p[k] = () => p
    return p
  }
  return { insert: (d: unknown) => fim('insert', d), update: (d: unknown) => fim('update', d), upsert: (d: unknown) => fim('upsert', d), delete: () => fim('delete'), select: () => fim('select') }
}
vi.mock('../src/lib/supabase', () => ({ supabase: { from: (t: string) => construtor(t) }, chamarFuncao: vi.fn(), CONFIG_FALTANDO: [] }))
vi.mock('../src/lib/dados', () => ({ invalidar: vi.fn(), useConsulta: vi.fn(), q: async (p: PromiseLike<{ data: unknown; error: unknown }>) => { const r = await p; if (r.error) throw r.error; return r.data } }))

const intel = await import('../src/lib/inteligencia')
const { abrirWhatsApp, semRegistro } = await import('../src/lib/acoes')

const eu = { email: 'otavio@vera.com', nome: 'Otávio Barbieri', papel: 'admin', ativo: true }
const lead = { id: 'L1', whatsapp: '5511980001000', telefone: null, responsavel: 'otavio@vera.com' }

beforeEach(() => {
  ops.length = 0; falhas = {}
  vi.stubGlobal('window', { open: vi.fn() })
})

describe('27. rascunho preparado automaticamente', () => {
  it('prepara uma vez por contexto, não a cada visita; se a IA falha, pausa', () => {
    expect(intel.podePrepararAuto('L1', 'h1')).toBe(true)
    intel.marcarTentativa('L1', 'h1')
    expect(intel.podePrepararAuto('L1', 'h1')).toBe(false) // mesma conversa: não gera de novo
    expect(intel.podePrepararAuto('L1', 'h2')).toBe(true) // conversa mudou: pode preparar
    intel.pausarPreparoAuto()
    expect(intel.podePrepararAuto('L2', 'h9')).toBe(false) // IA fora: nada de tentativa automática por um tempo
  })
})

describe('28. preparação de mensagens em lote', () => {
  it('respeita o limite, não repete lead, roda em paralelo limitado e informa cada resultado', async () => {
    let simultaneos = 0, pico = 0
    const chamados: string[] = []
    const res = await prepararEmLote(['A', 'B', 'B', 'C', 'D', 'E'], async (id) => {
      chamados.push(id); simultaneos++; pico = Math.max(pico, simultaneos)
      await new Promise((r) => setTimeout(r, 5)); simultaneos--
      if (id === 'C') return { rascunho: { mensagem_a: null } }
      if (id === 'D') return { rascunho: { mensagem_a: 'x' }, rascunho_reaproveitado: true }
      return { rascunho: { mensagem_a: 'Oi!' } }
    }, { concorrencia: 2, limite: 4 })
    expect(chamados.sort()).toEqual(['A', 'B', 'C', 'D'])
    expect(pico).toBeLessThanOrEqual(2)
    expect(Object.fromEntries(res.map((r) => [r.id, r.estado]))).toEqual({ A: 'pronto', B: 'pronto', C: 'sem_mensagem', D: 'reaproveitado' })
  })

  it('para tudo quando o erro é geral (sem chave de IA) e marca o resto como cancelado', async () => {
    const res = await prepararEmLote(['A', 'B', 'C', 'D'], async () => { throw new Error('Falta uma chave de IA: anthropic_api_key ou groq_api_key') }, { concorrencia: 1 })
    expect(res.filter((r) => r.estado === 'erro').length).toBe(1)
    expect(res.filter((r) => r.estado === 'cancelado').length).toBe(3)
  })
})

describe('29. edição manual preservada', () => {
  const r = { id: 'r1', lead_id: 'L1', mensagem_a: 'Texto da IA A', mensagem_b: 'Texto da IA B', melhor_opcao: 'A' as const, texto_editado_a: 'Texto editado pela equipe', texto_editado_b: null, aprovada_variante: null }
  it('o texto editado vale no lugar do gerado, e a aprovação escolhe a opção', () => {
    expect(intel.textoDaOpcao(r, 'a')).toBe('Texto editado pela equipe')
    expect(intel.textoRecomendado(r as never)).toBe('Texto editado pela equipe')
    expect(intel.textoRecomendado({ ...r, aprovada_variante: 'b' } as never)).toBe('Texto da IA B')
  })
  it('salvar edição grava só o texto editado, nunca reescreve o que a IA gerou', async () => {
    await intel.salvarEdicao('r1', 'a', 'Novo texto')
    const up = ops.find((o) => o.tabela === 'rascunhos_ia' && o.op === 'update')!.dados as Record<string, unknown>
    expect(up.texto_editado_a).toBe('Novo texto')
    expect(up).not.toHaveProperty('mensagem_a')
  })
})

describe('30. abertura do WhatsApp sem envio confirmado', () => {
  it('abrir registra a abertura e nada como enviado', async () => {
    const r = await abrirWhatsApp(lead, 'Oi!', eu, 'fu-1')
    expect(r).toEqual({ id: 'envio-1' })
    expect(ops.some((o) => o.tabela === 'mensagens')).toBe(false)
    expect(ops.some((o) => o.tabela === 'followups')).toBe(false)
  })
  it('sem a tabela de envios, não existe caminho alternativo que marque envio', async () => {
    falhas = { 'envios:insert': { code: '42P01', message: 'relation "envios" does not exist' } }
    const r = await abrirWhatsApp(lead, 'Oi!', eu, 'fu-1')
    expect(semRegistro(r)).toBe(true)
    expect(ops.some((o) => o.tabela === 'mensagens')).toBe(false)
    expect(ops.some((o) => o.tabela === 'followups' && o.op === 'update')).toBe(false)
  })
})

describe('32. Supabase indisponível', () => {
  it('a inteligência carregada falha vazia, sem derrubar a tela', async () => {
    falhas = { lead_inteligencia: { message: 'fetch failed' } }
    expect((await intel.carregarIntel()).size).toBe(0)
  })
  it('sem conseguir conferir o bloqueio, o WhatsApp não abre', async () => {
    falhas = { contatos_bloqueados: { message: 'fetch failed' } }
    await expect(abrirWhatsApp(lead, 'Oi', eu)).rejects.toThrow(/conferir/)
    expect((window.open as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })
  it('tabela de bloqueios ainda não criada não impede o uso', async () => {
    falhas = { contatos_bloqueados: { code: '42P01', message: 'relation does not exist' } }
    await expect(abrirWhatsApp(lead, 'Oi', eu)).resolves.toBeTruthy()
  })
})
