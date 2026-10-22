import { describe, expect, it } from 'vitest'
import { gerarRecomendacao, type ChamarIA } from '../supabase/functions/_shared/inteligencia/motor.ts'
import { geracao, lead, msg } from './apoio.ts'

/* Avaliação com o modelo de verdade. Só roda com ANTHROPIC_API_KEY no ambiente:
     ANTHROPIC_API_KEY=... npx vitest run tests/ia-real.test.ts
   Gera rascunhos para cenários típicos e aplica a mesma checagem objetiva da função. Nada é enviado a ninguém. */

const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const chave = env.ANTHROPIC_API_KEY
const modelo = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'

const claude: ChamarIA = async (system, user) => {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': chave!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: 2500, system, messages: [{ role: 'user', content: user }] }),
  })
  if (!r.ok) throw new Error(`Claude ${r.status}: ${await r.text()}`)
  const j = await r.json()
  return { text: (j.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join(''), model: modelo }
}

const CENARIOS = [
  { nome: 'primeiro contato com elogio verificado', e: geracao({ observacao: 'Os destaques mostram bolos de aniversário por encomenda.' }) },
  { nome: 'cliente pergunta o preço', e: geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [msg('enviada', 'Oi! Vocês mandam cardápio quando alguém chama?', 5), msg('recebida', 'Mando foto. Quanto custa uma página dessas?', 1)] }) },
  { nome: 'cliente já tem e diz que atende', e: geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [msg('enviada', 'Vocês têm cardápio pra mandar?', 5), msg('recebida', 'Temos sim e atende bem', 1)] }) },
  { nome: 'cliente com dificuldade clara', e: geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [msg('enviada', 'E isso funciona tranquilo?', 5), msg('recebida', 'Não, perco muito tempo mandando foto de sabor por sabor', 1)] }) },
]

describe.skipIf(!chave)('IA real (sem envio)', () => {
  for (const c of CENARIOS) {
    it(c.nome, async () => {
      const r = await gerarRecomendacao(c.e, claude)
      console.log(`\n[${c.nome}] ação: ${r.recomendacao.decisao.acao} · status: ${r.status}\nA: ${r.redacao?.mensagem_a}\nB: ${r.redacao?.mensagem_b}\nalertas: ${r.redacao?.alertas.join(' | ')}`)
      if (r.redacao?.mensagem_a) expect(r.qualidade.a?.criterios.veracidade.ok).toBe(true)
    }, 60_000)
  }
})
