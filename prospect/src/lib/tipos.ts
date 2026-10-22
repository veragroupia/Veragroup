export type Etapa = 'novo' | 'contatado' | 'respondeu' | 'reuniao_marcada' | 'proposta' | 'fechado' | 'perdido' | 'descartado'

/** cor = token do tailwind usado no ponto e na barra da etapa */
export const ETAPAS: { id: Etapa; nome: string; cor: string; ativa: boolean }[] = [
  { id: 'novo', nome: 'Novo', cor: 'bg-tinta-3', ativa: true },
  { id: 'contatado', nome: 'Contatado', cor: 'bg-info', ativa: true },
  { id: 'respondeu', nome: 'Respondeu', cor: 'bg-alerta', ativa: true },
  { id: 'reuniao_marcada', nome: 'Reunião', cor: 'bg-reuniao', ativa: true },
  { id: 'proposta', nome: 'Proposta', cor: 'bg-tinta', ativa: true },
  { id: 'fechado', nome: 'Fechado', cor: 'bg-ok', ativa: true },
  { id: 'perdido', nome: 'Perdido', cor: 'bg-sinal', ativa: false },
  { id: 'descartado', nome: 'Descartado', cor: 'bg-fio', ativa: false },
]
export const etapaInfo = (e: Etapa) => ETAPAS.find((x) => x.id === e) ?? ETAPAS[0]
export const ETAPAS_ENCERRADAS: Etapa[] = ['fechado', 'perdido', 'descartado']

export interface Lead {
  id: string; place_id: string | null; nome: string; nicho: string | null; cidade: string | null
  endereco: string | null; telefone: string | null; whatsapp: string | null; site: string | null
  instagram: string | null; rating: number | null; avaliacoes: number | null; maps_url: string | null
  score: number; score_motivos: string[]; mensagem_inicial: string | null; etapa: Etapa
  responsavel: string | null; plano: string | null; valor_setup: number | null; valor_mensal: number | null
  motivo_perda: string | null; observacoes: string | null; origem: string
  ultimo_contato_em: string | null; ultima_resposta_em: string | null; proximo_followup_em: string | null
  etapa_desde: string; fechado_em: string | null; created_at: string; updated_at: string
}

export interface Membro { email: string; nome: string; papel: 'admin' | 'vendedor' | string; ativo: boolean }

export interface Mensagem {
  id: string; lead_id: string; direcao: 'enviada' | 'recebida'; texto: string | null; tipo: string
  origem: string; autor: string | null; enviada_em: string
  /** true = envio comprovado (confirmado pela equipe ou lido do WhatsApp). null = registro antigo, não comprovado. */
  confirmada?: boolean | null
}

export interface Followup {
  id: string; lead_id: string; agendado_para: string; motivo: string | null; mensagem_sugerida: string | null
  tentativa: number; status: 'pendente' | 'feito' | 'pulado'; feito_em: string | null; feito_por: string | null
}

export interface Reuniao {
  id: string; lead_id: string; data_hora: string; tipo: string; link: string | null; status: string
  audio_path: string | null; transcricao: string | null; resumo: string | null; criado_por: string | null; created_at: string
}

export interface Avaliacao {
  id: string; lead_id: string; reuniao_id: string | null; alvo: 'conversa' | 'reuniao'; nota_geral: number | null
  notas: Partial<Record<'dor' | 'perda' | 'potencial' | 'solucao' | 'rapport' | 'clareza', number>>
  resumo: string | null; pontos_fortes: string[]; melhorias: string[]; objecoes: string[]
  temperatura: 'frio' | 'morno' | 'quente' | null; probabilidade: number | null
  proxima_acao: string | null; proxima_mensagem: string | null; modelo: string | null; created_at: string
}

export type StatusRascunho = 'pronto' | 'revisar' | 'nao_contatar' | 'sem_mensagem'
export interface RascunhoIA {
  id: string; lead_id: string; status: StatusRascunho; objetivo_da_etapa: string | null
  evidencias_usadas: { id: string; fato: string }[]; hipotese_comercial: string | null; oferta_id: string | null
  informacoes_faltantes: string[]; mensagem_a: string | null; mensagem_b: string | null
  justificativa_curta: string | null; proxima_acao_sugerida: string | null; observacao_vendedor: string | null
  vendedor: string | null; usada: 'a' | 'b' | null; modelo: string | null; created_at: string
  // v4 (vera-sales-v4). Rascunhos antigos não têm estes campos.
  acao?: string | null; motivo?: string | null; temperatura?: 'frio' | 'desconhecido' | 'morno' | 'quente' | null
  score_interesse?: number | null; score_adequacao?: number | null; confianca?: 'baixa' | 'media' | 'alta' | null
  melhor_opcao?: 'A' | 'B' | null; mencionar_assunto_anterior?: boolean | null; horario?: import('../../supabase/functions/_shared/inteligencia/tipos.ts').JanelaContato | null
  condicao_retomar?: string | null; alertas?: string[]; contexto_hash?: string | null; ultima_mensagem_id?: string | null
  etapa?: string | null; prompt_version?: string | null; catalogo_versao?: string | null; texto_final?: string | null
  copiada_em?: string | null; enviada_confirmada_em?: string | null; mensagem_id?: string | null
  // v5 (vera-sales-v5): edição, aprovação, avaliação humana e objetiva.
  texto_editado_a?: string | null; texto_editado_b?: string | null; editada_em?: string | null
  aprovada_em?: string | null; aprovada_por?: string | null; aprovada_variante?: 'a' | 'b' | null
  avaliacao_humana?: -1 | 1 | null; avaliacao_nota?: string | null; avaliada_por?: string | null
  qualidade?: { a: import('../../supabase/functions/_shared/inteligencia/qualidade.ts').AvaliacaoMensagem | null; b: import('../../supabase/functions/_shared/inteligencia/qualidade.ts').AvaliacaoMensagem | null } | null
  diretrizes?: import('../../supabase/functions/_shared/inteligencia/diretrizes.ts').Diretrizes | null
  origem?: 'manual' | 'automatico' | 'lote' | null
}

export interface Atividade { id: number; lead_id: string | null; tipo: string; detalhe: Record<string, any>; usuario: string | null; created_at: string }

export interface RadarConfig {
  id: 1; ativo: boolean; cidades: string[]; nichos: string[]; max_novos_por_dia: number; rotacao: number
  whatsapp_leitura_ativo: boolean; template_mensagem: string; updated_at: string
}

export interface RadarExecucao { id: number; iniciado_em: string; finalizado_em: string | null; buscas: number; encontrados: number; novos: number; erro: string | null }
