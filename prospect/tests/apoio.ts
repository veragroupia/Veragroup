import { CONFIG_PADRAO, type ConfigComercial } from '../supabase/functions/_shared/inteligencia/config.ts'
import { idEvidencia, type ChamarIA, type EntradaGeracao, type EntradaMotor } from '../supabase/functions/_shared/inteligencia/motor.ts'
import type { LeadBase, Msg } from '../supabase/functions/_shared/inteligencia/tipos.ts'

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
  return { id: id ?? `00000000-0000-0000-0000-${String(seq).padStart(12, '0')}`, direcao, texto, enviada_em: new Date(AGORA.getTime() - horasAtras * 3600e3).toISOString(), confirmada: true }
}
export const ev = (m: Msg) => idEvidencia(m.id)

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
