import type { ACOES_DE_RESPOSTA, Sinal, Solucao } from './tipos.ts'

/* Formato da análise já validada. Sem dependência de validação, para o painel importar sem custo. */

export interface Fato { fato: string; fonte: 'cliente' | 'pesquisa' | 'equipe' | 'hipotese'; evidencia_id: string | null }

export interface Analise {
  sinais: Sinal[]
  necessidade: string | null
  solucao: Solucao
  oferta_id: string | null
  conhecido: Fato[]
  desconhecido: string[]
  pergunta_prioritaria: string | null
  assuntos_resolvidos: string[]
  pergunta_pendente_do_cliente: string | null
  objecao_aberta: string | null
  mudou_de_assunto: boolean
  mencionar_assunto_anterior: boolean
  acao_sugerida: (typeof ACOES_DE_RESPOSTA)[number] | null
  dados_suficientes: boolean
  estilo_cliente: 'formal' | 'informal' | 'neutro'
  resumo: string
}

export const ANALISE_VAZIA: Analise = {
  sinais: [], necessidade: null, solucao: 'indefinida', oferta_id: null, conhecido: [], desconhecido: [],
  pergunta_prioritaria: null, assuntos_resolvidos: [], pergunta_pendente_do_cliente: null, objecao_aberta: null,
  mudou_de_assunto: false, mencionar_assunto_anterior: false, acao_sugerida: null, dados_suficientes: false,
  estilo_cliente: 'neutro', resumo: '',
}
