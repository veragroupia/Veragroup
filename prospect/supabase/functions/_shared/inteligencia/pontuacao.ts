import { PESOS_ADEQUACAO, PESOS_INTERESSE } from './config.ts'
import type { Leitura } from './conversa.ts'
import { SINAIS, type CodigoSinal, type Confianca, type Sinal, type Temperatura } from './tipos.ts'

/* Pontuação transparente: cada sinal tem um peso fixo e conta uma vez só.
   A IA só classifica sinais (com evidência); os números saem daqui. */

/** Sinais que dá para afirmar sem IA, só olhando a conversa. */
export function sinaisDaConversa(l: Leitura, primeiraDoLead: string | null): Sinal[] {
  const s: Sinal[] = []
  if (l.doLead > 0) s.push({ codigo: 'respondeu', fonte: 'regra', evidencia_id: primeiraDoLead, detalhe: `${l.doLead} ${l.doLead === 1 ? 'mensagem' : 'mensagens'} do cliente` })
  if (l.respostas.length >= 2) s.push({ codigo: 'conversa_continua', fonte: 'regra', evidencia_id: null, detalhe: `Respondeu em ${l.respostas.length} momentos diferentes` })
  if (l.pediuParaParar) s.push({ codigo: 'pediu_para_parar', fonte: 'regra', evidencia_id: l.pediuParaParar.id, detalhe: (l.pediuParaParar.texto ?? '').slice(0, 140) })
  if (l.semInteresse) s.push({ codigo: 'sem_interesse', fonte: 'regra', evidencia_id: l.semInteresse.id, detalhe: (l.semInteresse.texto ?? '').slice(0, 140) })
  if (l.retornoPedido) s.push({ codigo: 'pediu_retorno_futuro', fonte: 'regra', evidencia_id: l.retornoPedido.mensagem_id, detalhe: l.retornoPedido.texto })
  return s
}

/** Junta regra e IA. Para o mesmo código, a regra vence (é verificável). */
export function combinarSinais(...listas: Sinal[][]): Sinal[] {
  const vistos = new Map<CodigoSinal, Sinal>()
  for (const lista of listas) for (const s of lista) if (!vistos.has(s.codigo)) vistos.set(s.codigo, s)
  return [...vistos.values()]
}

export interface Pontuacao { valor: number; partes: { codigo: CodigoSinal; peso: number }[]; semEvidencia: boolean }

const limitar = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function scoreInteresse(sinais: Sinal[], pesosExtra: Partial<Record<CodigoSinal, number>> = {}): Pontuacao {
  const pesos = { ...PESOS_INTERESSE, ...pesosExtra }
  const partes = sinais.filter((s) => SINAIS[s.codigo].grupo === 'interesse' && pesos[s.codigo] !== undefined)
    .map((s) => ({ codigo: s.codigo, peso: pesos[s.codigo]! }))
  return { valor: limitar(partes.reduce((t, p) => t + p.peso, 0)), partes, semEvidencia: partes.length === 0 }
}

/** Adequação começa em 40 ("não sabemos") e só sobe ou desce com evidência. */
export const ADEQUACAO_BASE = 40
export function scoreAdequacao(sinais: Sinal[], pesosExtra: Partial<Record<CodigoSinal, number>> = {}): Pontuacao {
  const pesos = { ...PESOS_ADEQUACAO, ...pesosExtra }
  const partes = sinais.filter((s) => pesos[s.codigo] !== undefined && (SINAIS[s.codigo].grupo === 'adequacao' || s.codigo === 'relatou_dificuldade'))
    .map((s) => ({ codigo: s.codigo, peso: pesos[s.codigo]! }))
  const soAdequacao = partes.filter((p) => SINAIS[p.codigo].grupo === 'adequacao')
  return { valor: limitar(ADEQUACAO_BASE + partes.reduce((t, p) => t + p.peso, 0)), partes, semEvidencia: soAdequacao.length === 0 }
}

const INTENCAO: CodigoSinal[] = ['pediu_proposta', 'quer_iniciar', 'discutiu_prazo_ou_condicoes']
const CONTEUDO: CodigoSinal[] = ['compartilhou_operacao', 'relatou_dificuldade', 'perguntou_servico', 'pediu_preco', 'pediu_exemplo', 'pediu_demonstracao', 'objecao', 'conversa_continua']

/**
 * Temperatura pela evidência, nunca pelo perfil da empresa.
 * - quente: pedido concreto (proposta, começar, prazo/condições) ou demonstração com interesse alto.
 * - morno: respondeu e trouxe algum conteúdo, ou ao menos respondeu.
 * - frio: sem resposta, resposta educada sem interesse, ou recusa.
 * Perguntar preço sozinho é morno.
 */
export function temperatura(sinais: Sinal[], interesse: number): Temperatura {
  const tem = (c: CodigoSinal) => sinais.some((s) => s.codigo === c)
  if (tem('pediu_para_parar') || tem('sem_interesse')) return 'frio'
  if (INTENCAO.some(tem)) return 'quente'
  if (tem('pediu_demonstracao') && interesse >= 55) return 'quente'
  if (tem('resposta_educada_sem_interesse') && !CONTEUDO.some(tem)) return 'frio'
  if (CONTEUDO.some(tem) || tem('respondeu')) return 'morno'
  return 'frio'
}

/** Confiança na classificação: quanto o sistema realmente sabe deste lead. */
export function confianca(l: Leitura, sinais: Sinal[], analisadoPorIA: boolean): Confianca {
  if (l.total === 0 || l.doLead === 0) return 'baixa'
  if (!analisadoPorIA) return 'baixa'
  const conteudo = sinais.filter((s) => CONTEUDO.includes(s.codigo) || INTENCAO.includes(s.codigo)).length
  if (l.doLead >= 3 && conteudo >= 2) return 'alta'
  return 'media'
}
