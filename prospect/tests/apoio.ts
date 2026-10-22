import { CONFIG_PADRAO, type ConfigComercial } from '../supabase/functions/_shared/inteligencia/config.ts'
import { idEvidencia, type ChamarIA, type EntradaGeracao, type EntradaMotor } from '../supabase/functions/_shared/inteligencia/motor.ts'
import type { LeadBase, Msg } from '../supabase/functions/_shared/inteligencia/tipos.ts'
import type { Evidencia } from '../supabase/functions/_shared/inteligencia/contrato.ts'

/** Quinta-feira, 22/10/2026, 13h em Brasília. */
export const AGORA = new Date('2026-10-22T13:00:00-03:00')

export const config = (extra: Partial<ConfigComercial> = {}): ConfigComercial => ({ ...CONFIG_PADRAO, ...extra })

export function lead(extra: Partial<LeadBase> = {}): LeadBase {
  return {
    id: 'lead-1', nome: 'Doce Encanto Confeitaria', nicho: 'confeitaria', cidade: 'Salto', site: null, instagram: null,
    telefone: '(11) 98000-1000', whatsapp: '5511980001000', place_id: 'place-1', rating: 4.8, avaliacoes: 132,
    etapa: 'novo', observacoes: null, motivo_perda: null, ...extra,
  }
}

let seq = 0
/** Mensagem `horasAtras` antes de AGORA. */
export function msg(direcao: 'enviada' | 'recebida', texto: string, horasAtras: number, id?: string): Msg {
  seq++
  // O id de evidência usa o começo do uuid: o número sequencial vai no começo para não colidir.
  return { id: id ?? `${String(seq).padStart(8, '0')}-0000-4000-8000-000000000000`, direcao, texto, enviada_em: new Date(AGORA.getTime() - horasAtras * 3600e3).toISOString(), confirmada: true }
}
export const ev = (m: Msg) => idEvidencia(m.id)

/** Evidências como a função monta: ids de mensagem com direção e data; o resto (lead.*, equipe) sem direção.
    `msgs` define de quem é cada mensagem; ids msg_* sem mensagem correspondente são tratados como do cliente. */
export function evidencias(ids: string[], msgs: Msg[] = []): Map<string, Evidencia> {
  const m = new Map<string, Evidencia>()
  for (const x of msgs) m.set(idEvidencia(x.id), { direcao: x.direcao, texto: x.texto ?? '', em: x.enviada_em })
  // Sem a mensagem real, o texto é genérico o bastante para passar na checagem de pertinência.
  for (const id of ids) if (!m.has(id)) m.set(id, { direcao: id.startsWith('msg_') ? 'recebida' : null, texto: 'quero orçamento, quanto custa? me manda proposta', em: AGORA.toISOString() })
  return m
}

export function entrada(extra: Partial<EntradaMotor> = {}): EntradaMotor {
  return { agora: AGORA, config: config(), lead: lead(), mensagens: [], bloqueios: [], ...extra }
}

export function geracao(extra: Partial<EntradaGeracao> = {}): EntradaGeracao {
  return { ...entrada(), vendedor: 'Otávio', observacao: null, modo: 'gerar', forcar: false, cache: null, ...extra } as EntradaGeracao
}

/** IA falsa: devolve as respostas na ordem e guarda o que recebeu. */
export function iaFalsa(...respostas: (object | string | Error)[]) {
  const chamadas: { system: string; user: string }[] = []
  const fn: ChamarIA = async (system, user) => {
    chamadas.push({ system, user })
    const r = respostas.shift()
    if (r === undefined) throw new Error('IA chamada mais vezes do que o esperado')
    if (r instanceof Error) throw r
    return { text: typeof r === 'string' ? r : JSON.stringify(r), model: 'teste' }
  }
  return { fn, chamadas }
}

export const analiseBase = (extra: object = {}) => ({
  sinais: [], necessidade_identificada: null, solucao: 'indefinida', oferta_id: null, conhecido: [], desconhecido: [],
  pergunta_prioritaria: null, assuntos_resolvidos: [], pergunta_pendente_do_cliente: null, objecao_aberta: null,
  mudou_de_assunto: false, mencionar_assunto_anterior: false, acao_sugerida: null, dados_suficientes: true,
  estilo_cliente: 'informal', resumo: 'teste', ...extra,
})
