import type { ACOES_DE_RESPOSTA, Sinal, Solucao } from './tipos.ts'

/* Formato da análise já validada. Sem dependência de validação, para o painel importar sem custo. */

export interface Fato { fato: string; fonte: 'cliente' | 'pesquisa' | 'equipe' | 'hipotese'; evidencia_id: string | null }

/** Um item da memória com a mensagem (ou dado) que o prova. Sem evidência válida, não entra como fato. */
export interface Evidenciado { texto: string; evidencia_id: string | null }

/**
 * Memória comercial do lead. É o que impede a IA de perguntar de novo o que o cliente já respondeu
 * e de esquecer o que foi prometido. Hipótese nunca vira fato sozinha: só a equipe confirma.
 */
export interface MemoriaComercial {
  /** Perguntas já feitas e respondidas. Não se pergunta de novo. */
  perguntas_respondidas: { pergunta: string; resposta: string; evidencia_id: string | null }[]
  /** Dificuldades ou objetivos que o próprio cliente contou. */
  necessidades: Evidenciado[]
  objecoes: (Evidenciado & { resolvida: boolean })[]
  /** Materiais, reuniões, propostas, prazos e retornos combinados. */
  compromissos: (Evidenciado & { quem: 'vera' | 'cliente'; prazo: string | null; cumprido: boolean })[]
  /** Soluções apresentadas e como o cliente reagiu. */
  ofertas: { oferta: string; reacao: 'positiva' | 'neutra' | 'negativa' | 'sem_resposta'; evidencia_id: string | null }[]
  /** SPIN: o que já se sabe de cada parte (null = ainda não se sabe). */
  spin: { situacao: Evidenciado | null; problema: Evidenciado | null; implicacao: Evidenciado | null; valor: Evidenciado | null }
  /** CHAMP: desafio, quem decide, condições e prioridade. Só com evidência. */
  champ: { desafio: Evidenciado | null; autoridade: Evidenciado | null; condicoes: Evidenciado | null; prioridade: Evidenciado | null }
}

export const MEMORIA_VAZIA: MemoriaComercial = {
  perguntas_respondidas: [], necessidades: [], objecoes: [], compromissos: [], ofertas: [],
  spin: { situacao: null, problema: null, implicacao: null, valor: null },
  champ: { desafio: null, autoridade: null, condicoes: null, prioridade: null },
}

/** Correções da equipe. A automação nunca escreve aqui. */
export interface MemoriaEquipe {
  /** Fatos que a equipe confirmou (inclusive hipóteses promovidas por uma pessoa). */
  fatos?: { texto: string; por: string | null; em: string }[]
  /** Itens da análise que a equipe marcou como errados (chave = texto normalizado). */
  ocultar?: string[]
  /** Horário de funcionamento verificado pela equipe, no fuso da configuração. */
  horario_funcionamento?: { inicio: string; fim: string } | null
}

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
  /** v5. Análises antigas não têm. */
  memoria?: MemoriaComercial
}

export const ANALISE_VAZIA: Analise = {
  sinais: [], necessidade: null, solucao: 'indefinida', oferta_id: null, conhecido: [], desconhecido: [],
  pergunta_prioritaria: null, assuntos_resolvidos: [], pergunta_pendente_do_cliente: null, objecao_aberta: null,
  mudou_de_assunto: false, mencionar_assunto_anterior: false, acao_sugerida: null, dados_suficientes: false,
  estilo_cliente: 'neutro', resumo: '', memoria: MEMORIA_VAZIA,
}
