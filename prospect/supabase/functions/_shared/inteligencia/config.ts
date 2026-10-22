import { CATALOGO_VERSAO_PADRAO, type Oferta } from './catalogo.ts'
import type { CodigoSinal } from './tipos.ts'

/** Espelho da tabela config_comercial. Tudo tem padrão, para o motor funcionar sem a tabela. */
export interface ConfigComercial {
  estilo: 'consultivo' | 'direto'
  formalidade: 'informal' | 'neutro' | 'formal'
  emojis: 'nenhum' | 'moderado'
  objetivo: 'qualificar' | 'demonstrar' | 'agendar_conversa'
  preferir_qualificacao: boolean
  /** Janelas em que o contato comercial é permitido, no fuso abaixo. */
  janelas: { inicio: string; fim: string }[]
  apenas_dias_uteis: boolean
  fuso: string
  limite_followups: number
  /** Quanto esperar a resposta antes de considerar um novo contato. */
  dias_aguardar: number
  /** Respostas mínimas do lead para confiar num padrão de horário. */
  min_respostas_padrao: number
  pesos: Partial<Record<CodigoSinal, number>>
  catalogo: Oferta[] | null
  catalogo_versao: string
  politica_previas: 'nao_oferecer' | 'demonstracao_quando_pedido' | 'demonstracao_quando_apropriado'
  prompt_version: string
  /** Preparar o rascunho sozinho ao abrir um lead elegível (sem enviar nada). */
  preparo_automatico: boolean
  /** Máximo de leads por preparação em lote (controle de custo de IA). */
  limite_lote: number
}

export const PESOS_INTERESSE: Partial<Record<CodigoSinal, number>> = {
  respondeu: 15,
  conversa_continua: 10,
  compartilhou_operacao: 10,
  relatou_dificuldade: 15,
  perguntou_servico: 10,
  pediu_preco: 10,
  pediu_exemplo: 10,
  pediu_demonstracao: 20,
  pediu_proposta: 30,
  discutiu_prazo_ou_condicoes: 20,
  quer_iniciar: 35,
  objecao: 5,
  pediu_retorno_futuro: 0,
  pediu_tempo: 0,
  quer_melhorar_atual: 15,
  sem_necessidade_agora: -15,
  resposta_educada_sem_interesse: -10,
  sem_interesse: -40,
  pediu_para_parar: -100,
}

export const PESOS_ADEQUACAO: Partial<Record<CodigoSinal, number>> = {
  necessidade_compativel: 30,
  oferta_no_catalogo: 15,
  relatou_dificuldade: 10,
  quer_melhorar_atual: 20,
  ja_tem_solucao_satisfatoria: -35,
  sem_dificuldade: -20,
  fora_do_escopo: -40,
  projeto_complexo: -10,
}

export const CONFIG_PADRAO: ConfigComercial = {
  estilo: 'consultivo',
  formalidade: 'informal',
  emojis: 'nenhum',
  objetivo: 'qualificar',
  preferir_qualificacao: true,
  janelas: [{ inicio: '09:00', fim: '11:30' }, { inicio: '14:00', fim: '17:30' }],
  apenas_dias_uteis: true,
  fuso: 'America/Sao_Paulo',
  limite_followups: 3,
  dias_aguardar: 2,
  min_respostas_padrao: 3,
  pesos: {},
  catalogo: null,
  catalogo_versao: CATALOGO_VERSAO_PADRAO,
  politica_previas: 'demonstracao_quando_apropriado',
  prompt_version: 'vera-sales-v5',
  preparo_automatico: true,
  limite_lote: 20,
}

/** Junta a linha do banco com os padrões, ignorando campos vazios ou de tipo errado. */
export function lerConfig(linha: Partial<Record<keyof ConfigComercial, unknown>> | null | undefined): ConfigComercial {
  const c: ConfigComercial = { ...CONFIG_PADRAO }
  if (!linha) return c
  const set = <K extends keyof ConfigComercial>(k: K, ok: (v: unknown) => boolean) => {
    const v = linha[k]
    if (v !== null && v !== undefined && ok(v)) c[k] = v as ConfigComercial[K]
  }
  const um = (...xs: string[]) => (v: unknown) => typeof v === 'string' && xs.includes(v)
  const inteiro = (min: number, max: number) => (v: unknown) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
  set('estilo', um('consultivo', 'direto'))
  set('formalidade', um('informal', 'neutro', 'formal'))
  set('emojis', um('nenhum', 'moderado'))
  set('objetivo', um('qualificar', 'demonstrar', 'agendar_conversa'))
  set('preferir_qualificacao', (v) => typeof v === 'boolean')
  set('janelas', (v) => Array.isArray(v) && v.length > 0 && v.every((j) => /^\d{2}:\d{2}$/.test(j?.inicio) && /^\d{2}:\d{2}$/.test(j?.fim) && j.inicio < j.fim))
  set('apenas_dias_uteis', (v) => typeof v === 'boolean')
  set('fuso', (v) => typeof v === 'string' && v.includes('/'))
  set('limite_followups', inteiro(1, 10))
  set('dias_aguardar', inteiro(1, 30))
  set('min_respostas_padrao', inteiro(2, 20))
  set('pesos', (v) => typeof v === 'object' && !Array.isArray(v))
  set('catalogo', (v) => Array.isArray(v) && v.every((o) => typeof o?.id === 'string' && typeof o?.nome === 'string' && Array.isArray(o?.solucoes)))
  set('catalogo_versao', (v) => typeof v === 'string' && v.length > 0)
  set('politica_previas', um('nao_oferecer', 'demonstracao_quando_pedido', 'demonstracao_quando_apropriado'))
  set('prompt_version', (v) => typeof v === 'string' && v.length > 0)
  set('preparo_automatico', (v) => typeof v === 'boolean')
  set('limite_lote', inteiro(1, 100))
  return c
}
