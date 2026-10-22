// Vera Sales Intelligence · tipos do domínio.
// Este diretório é puro (sem rede, sem banco): roda igual no painel (Vite) e na função (Deno).
// Por isso os imports internos levam a extensão .ts.

export const PROMPT_VERSION = 'vera-sales-v5'

/** "desconhecido": o cliente respondeu, mas ainda não deu para saber se há interesse (um "oi", uma pergunta solta). */
export const TEMPERATURAS = ['frio', 'desconhecido', 'morno', 'quente'] as const
export type Temperatura = (typeof TEMPERATURAS)[number]

/** Situação do contato. Não é temperatura: um lead quente pode estar aguardando resposta. */
export const ESTADOS = ['ativo', 'aguardando_resposta', 'retorno_combinado', 'sem_oportunidade', 'desqualificado', 'encerrado', 'nao_contatar'] as const
export type EstadoContato = (typeof ESTADOS)[number]

export const CONFIANCAS = ['baixa', 'media', 'alta'] as const
export type Confianca = (typeof CONFIANCAS)[number]

export const ESTAGIOS = ['prospeccao', 'primeiro_contato', 'qualificacao', 'diagnostico', 'demonstracao', 'proposta', 'negociacao', 'fechado', 'perdido'] as const
export type Estagio = (typeof ESTAGIOS)[number]

export const ACOES = [
  'responder_agora', 'primeira_abordagem', 'qualificar', 'apresentar_solucao', 'oferecer_demonstracao',
  'enviar_proposta', 'fazer_followup', 'aguardar', 'retomar_na_data', 'encerrar', 'nao_contatar', 'revisar_dados',
] as const
export type Acao = (typeof ACOES)[number]

/** Ações que a IA pode escolher quando o lead falou por último. As outras saem das regras. */
export const ACOES_DE_RESPOSTA = ['responder_agora', 'qualificar', 'apresentar_solucao', 'oferecer_demonstracao', 'enviar_proposta'] as const

export const SOLUCOES = ['cardapio_digital', 'landing_page', 'site_institucional', 'solucao_pedidos', 'nenhuma', 'indefinida'] as const
export type Solucao = (typeof SOLUCOES)[number]

/**
 * Sinais observáveis. Cada um precisa citar a evidência (id de mensagem ou de dado do lead).
 * Os de "interesse" alimentam o score de interesse; os de "adequacao", o de adequação.
 */
export const SINAIS = {
  // determinísticos (vêm da leitura da conversa, sem IA)
  respondeu: { grupo: 'interesse', nome: 'Respondeu' },
  conversa_continua: { grupo: 'interesse', nome: 'Conversa continuou' },
  // classificados pela IA a partir das mensagens do cliente
  compartilhou_operacao: { grupo: 'interesse', nome: 'Explicou como trabalha' },
  relatou_dificuldade: { grupo: 'interesse', nome: 'Contou uma dificuldade' },
  perguntou_servico: { grupo: 'interesse', nome: 'Perguntou sobre o serviço' },
  pediu_preco: { grupo: 'interesse', nome: 'Perguntou preço' },
  pediu_exemplo: { grupo: 'interesse', nome: 'Pediu exemplo' },
  pediu_demonstracao: { grupo: 'interesse', nome: 'Pediu demonstração' },
  pediu_proposta: { grupo: 'interesse', nome: 'Pediu proposta' },
  discutiu_prazo_ou_condicoes: { grupo: 'interesse', nome: 'Discutiu prazo ou condições' },
  quer_iniciar: { grupo: 'interesse', nome: 'Quer começar' },
  objecao: { grupo: 'interesse', nome: 'Levantou objeção' },
  resposta_educada_sem_interesse: { grupo: 'interesse', nome: 'Resposta educada, sem interesse' },
  sem_interesse: { grupo: 'interesse', nome: 'Disse que não tem interesse' },
  pediu_para_parar: { grupo: 'interesse', nome: 'Pediu para não receber mensagens' },
  pediu_retorno_futuro: { grupo: 'interesse', nome: 'Pediu retorno em outro momento' },
  pediu_tempo: { grupo: 'interesse', nome: 'Pediu tempo para pensar' },
  sem_necessidade_agora: { grupo: 'interesse', nome: 'Não precisa agora' },
  quer_melhorar_atual: { grupo: 'interesse', nome: 'Tem solução, mas quer melhorar' },
  // adequação
  necessidade_compativel: { grupo: 'adequacao', nome: 'Necessidade que a Vera resolve' },
  oferta_no_catalogo: { grupo: 'adequacao', nome: 'Existe oferta no catálogo' },
  ja_tem_solucao_satisfatoria: { grupo: 'adequacao', nome: 'Já tem solução que atende' },
  sem_dificuldade: { grupo: 'adequacao', nome: 'Disse que o processo atual funciona' },
  fora_do_escopo: { grupo: 'adequacao', nome: 'Pede algo fora do que a Vera faz' },
  projeto_complexo: { grupo: 'adequacao', nome: 'Projeto pede avaliação comercial' },
} as const
export type CodigoSinal = keyof typeof SINAIS
export const CODIGOS_SINAL = Object.keys(SINAIS) as CodigoSinal[]

export type FonteSinal = 'conversa' | 'cadastro' | 'equipe' | 'regra'
export interface Sinal {
  codigo: CodigoSinal; fonte: FonteSinal; evidencia_id: string | null; detalhe: string
  /** Quando a evidência aconteceu (mensagem do cliente). Serve para a recência. */
  em?: string | null
}

export type Direcao = 'enviada' | 'recebida'
/** O mínimo de uma mensagem que o motor precisa. `confirmada` null = registro antigo, envio não comprovado. */
export interface Msg { id: string; direcao: Direcao; texto: string | null; enviada_em: string; confirmada?: boolean | null; origem?: string | null }

export interface LeadBase {
  id: string; nome: string; nicho: string | null; cidade: string | null; site: string | null; instagram: string | null
  telefone: string | null; whatsapp: string | null; place_id?: string | null; rating?: number | null; avaliacoes?: number | null
  etapa: string; observacoes?: string | null; motivo_perda?: string | null
}

export interface Bloqueio { telefone_chave: string | null; place_id: string | null; lead_id: string | null; motivo: string }

export type TipoJanela = 'compromisso' | 'agora' | 'historico' | 'funcionamento' | 'segmento' | 'generico'
export interface JanelaContato {
  tipo: TipoJanela; inicio: string; fim: string; fuso: string
  rotulo: string; motivo: string; confianca: Confianca; confirmado: boolean
}
