import { afterEach, describe, expect, it, vi } from 'vitest'

/* 33. Configuração de ambiente ausente: o app explica o que falta em vez de tela branca. */
describe('33. configuração de ambiente ausente', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  it('sem URL e chave, o módulo carrega e lista o que falta', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    vi.resetModules()
    const m = await import('../src/lib/supabase')
    expect(m.CONFIG_FALTANDO).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])
    expect(m.supabase).toBeTruthy()
  })

  it('a chave de exemplo do .env.example conta como ausente', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'cole-aqui-a-chave-anon-do-projeto')
    vi.resetModules()
    const m = await import('../src/lib/supabase')
    expect(m.CONFIG_FALTANDO).toEqual(['VITE_SUPABASE_ANON_KEY'])
  })

  it('com as duas variáveis, nada falta', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiJ9.teste.assinatura')
    vi.resetModules()
    const m = await import('../src/lib/supabase')
    expect(m.CONFIG_FALTANDO).toEqual([])
  })
})
