import { PESOS_ADEQUACAO, PESOS_INTERESSE } from './config.ts'
import type { Leitura, TipoFala } from './conversa.ts'
import { SINAIS, type CodigoSinal, type Confianca, type Sinal, type Temperatura } from './tipos.ts'

/* Pontuação transparente: cada sinal tem um peso fixo e conta uma vez só.
   A IA só classifica sinais (com evidência); os números saem daqui. */

const DA_FALA: Partial<Record<TipoFala, CodigoSinal>> = {
  recusa: 'sem_interesse',
  sem_necessidade_agora: 'sem_necessidade_agora',
  ja_tem_satisfeito: 'ja_tem_solucao_satisfatoria',
  sem_dificuldade: 'sem_dificuldade',
  quer_melhorar: 'quer_melhorar_atual',
  dificuldade: 'relatou_dificuldade',
  pediu_tempo: 'pediu_tempo',
}

/** Sinais que dá para afirmar sem IA, só olhando a conversa. Evidência = id da mensagem do cliente. */
export function sinaisDaConversa(l: Leitura, primeiraDoLead: string | null): Sinal[] {
  const s: Sinal[] = []
  if (l.doLead > 0) s.push({ codigo: 'respondeu', fonte: 'regra', evidencia_id: primeiraDoLead, detalhe: `${l.doLead} ${l.doLead === 1 ? 'mensagem' : 'mensagens'} do cliente` })
  if (l.respostas.length >= 2) s.push({ codigo: 'conversa_continua', fonte: 'regra', evidencia_id: null, detalhe: `Respondeu em ${l.respostas.length} momentos diferentes` })
  if (l.pediuParaParar) s.push({ codigo: 'pediu_para_parar', fonte: 'regra', evidencia_id: l.pediuParaParar.id, detalhe: (l.pediuParaParar.texto ?? '').slice(0, 140), em: l.pediuParaParar.enviada_em })
  const codigo = l.falaAtual ? DA_FALA[l.falaAtual.tipo] : undefined
  if (codigo && l.falaAtual) s.push({ codigo, fonte: 'regra', evidencia_id: l.falaAtual.msg.id, detalhe: (l.falaAtual.msg.texto ?? '').slice(0, 140), em: l.falaAtual.msg.enviada_em })
  if (l.pediuPreco) s.push({ codigo: 'pediu_preco', fonte: 'regra', evidencia_id: l.pediuPreco.id, detalhe: (l.pediuPreco.texto ?? '').slice(0, 140), em: l.pediuPreco.enviada_em })
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
  const partes = sinais.filter((s) => pesos[s.codigo] !== undefined && (SINAIS[s.codigo].grupo === 'adequacao' || s.codigo === 'relatou_dificuldade' || s.codigo === 'quer_melhorar_atual'))
    .map((s) => ({ codigo: s.codigo, peso: pesos[s.codigo]! }))
  return { valor: limitar(ADEQUACAO_BASE + partes.reduce((t, p) => t + p.peso, 0)), partes, semEvidencia: partes.length === 0 }
}

export const INTENCAO: CodigoSinal[] = ['pediu_proposta', 'quer_iniciar', 'discutiu_prazo_ou_condicoes']
const CONTEUDO: CodigoSinal[] = ['compartilhou_operacao', 'relatou_dificuldade', 'perguntou_servico', 'pediu_preco', 'pediu_exemplo', 'pediu_demonstracao', 'objecao', 'conversa_continua', 'quer_melhorar_atual']
/** Falas que mudam o rumo: depois delas, uma intenção anterior não vale mais. */
const VIRADA: CodigoSinal[] = ['sem_interesse', 'sem_necessidade_agora', 'ja_tem_solucao_satisfatoria', 'resposta_educada_sem_interesse', 'pediu_para_parar']
/** Intenção de compra mais velha que isso não deixa o lead quente sozinha. */
export const DIAS_INTENCAO = 45

export interface SinalDesconsiderado extends Sinal { motivo: string }

/**
 * Recência e contradição: um pedido de proposta de dois meses atrás, ou seguido de "não preciso agora",
 * não sustenta temperatura quente. O sinal sai da conta, mas fica visível com o motivo.
 */
export function vigentes(sinais: Sinal[], agora: Date): { vigentes: Sinal[]; desconsiderados: SinalDesconsiderado[] } {
  const viradas = sinais.filter((s) => VIRADA.includes(s.codigo) && s.em).map((s) => +new Date(s.em!))
  const ultimaVirada = viradas.length ? Math.max(...viradas) : -Infinity
  const ok: Sinal[] = [], fora: SinalDesconsiderado[] = []
  for (const s of sinais) {
    const forte = INTENCAO.includes(s.codigo) || s.codigo === 'pediu_demonstracao'
    if (forte && s.em && +new Date(s.em) < ultimaVirada) { fora.push({ ...s, motivo: 'O cliente disse outra coisa depois' }); continue }
    if (forte && s.em && (agora.getTime() - +new Date(s.em)) / 86400e3 > DIAS_INTENCAO) { fora.push({ ...s, motivo: `Pedido de mais de ${DIAS_INTENCAO} dias` }); continue }
    ok.push(s)
  }
  return { vigentes: ok, desconsiderados: fora }
}

/**
 * Temperatura pela evidência, nunca pelo perfil da empresa.
 * - quente: pedido concreto e recente (proposta, começar, prazo/condições) ou demonstração com interesse alto.
 * - morno: trouxe conteúdo comercial (contou como trabalha, uma dificuldade, perguntou do serviço ou do preço...).
 * - desconhecido: respondeu, mas sem nada que mostre interesse ("oi", "quem é?").
 * - frio: sem resposta, recusa, sem necessidade agora, ou resposta educada sem interesse.
 * Perguntar preço sozinho é morno. Empresa que "precisa de site" e nunca respondeu continua fria.
 */
export function temperatura(sinais: Sinal[], interesse: number): Temperatura {
  const tem = (c: CodigoSinal) => sinais.some((s) => s.codigo === c)
  if (tem('pediu_para_parar') || tem('sem_interesse')) return 'frio'
  if (INTENCAO.some(tem)) return 'quente'
  if (tem('pediu_demonstracao') && interesse >= 55) return 'quente'
  if (tem('sem_necessidade_agora')) return 'frio'
  const conteudo = CONTEUDO.some(tem)
  if (!conteudo && (tem('resposta_educada_sem_interesse') || tem('ja_tem_solucao_satisfatoria') || tem('sem_dificuldade'))) return 'frio'
  if (conteudo) return 'morno'
  if (tem('respondeu')) return 'desconhecido'
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
