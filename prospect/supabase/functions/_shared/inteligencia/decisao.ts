import type { ConfigComercial } from './config.ts'
import type { Leitura } from './conversa.ts'
import type { Acao, EstadoContato, Estagio, Sinal, Temperatura } from './tipos.ts'

/* Decisão antes de qualquer texto: o que fazer agora com este lead, e se vale escrever algo.
   Tudo aqui é regra. A IA só escolhe o tipo de resposta quando o cliente falou por último. */

export interface EntradaDecisao {
  agora: Date
  config: ConfigComercial
  leitura: Leitura
  etapa: string
  temTelefone: boolean
  bloqueado: boolean
  /** Retorno combinado com o cliente (data definida pela equipe ou lida da conversa). */
  retornoEm: string | null
  /** false = "semana que vem", sem dia certo. */
  retornoExato?: boolean
  /** Proposta já enviada e sem resposta formal. */
  propostaEnviadaEm: string | null
  sinais: Sinal[]
  temperatura: Temperatura
  /** Ids de evidência (msg_*) das mensagens do cliente desde a nossa última. */
  idsBlocoAtual?: Set<string>
  /** A análise da IA entendeu um pedido para parar (a regra não pegou). Vale até a equipe conferir. */
  pararPelaIA?: boolean
}

export interface Decisao {
  acao: Acao
  estado: EstadoContato
  /** Escrever mensagem agora? */
  gerarMensagem: boolean
  /** A IA pode refinar a ação (só quando o cliente falou por último). */
  iaEscolheAcao: boolean
  motivo: string
  /** Quando aguardar: o que justificaria voltar a falar. */
  condicaoRetomar: string | null
  compromissoPendente: string | null
}

const H = 3600e3

export function decidir(e: EntradaDecisao): Decisao {
  const { leitura: l, config } = e
  const base = { iaEscolheAcao: false, condicaoRetomar: null, compromissoPendente: l.compromissoVendedor }

  if (e.bloqueado || l.pediuParaParar || e.pararPelaIA) {
    return { ...base, acao: 'nao_contatar', estado: 'nao_contatar', gerarMensagem: false, compromissoPendente: null,
      motivo: l.pediuParaParar ? 'O cliente pediu para não receber mensagens. Nenhum contato comercial.'
        : e.pararPelaIA && !e.bloqueado ? 'A análise entendeu que o cliente pediu para não receber mensagens. Confira a conversa: registre o bloqueio ou libere o contato.'
        : 'Contato bloqueado pela equipe. Nenhum contato comercial.' }
  }
  if (e.etapa === 'fechado') {
    return { ...base, acao: 'encerrar', estado: 'encerrado', gerarMensagem: false, motivo: 'Venda fechada. O acompanhamento segue em Clientes e Projetos.' }
  }
  if (e.etapa === 'perdido' || e.etapa === 'descartado') {
    return { ...base, acao: 'encerrar', estado: e.etapa === 'perdido' ? 'encerrado' : 'desqualificado', gerarMensagem: false,
      motivo: 'Oportunidade encerrada. Reabra o lead se houver um motivo novo para conversar.' }
  }
  if (!e.temTelefone) {
    return { ...base, acao: 'revisar_dados', estado: 'ativo', gerarMensagem: false, motivo: 'Lead sem telefone ou WhatsApp. Complete o cadastro antes de qualquer contato.' }
  }

  // O cliente falou por último: responder vem antes de qualquer outra regra, inclusive do retorno combinado.
  if (l.ultimaDe === 'lead') {
    const bloco = e.idsBlocoAtual
    const noBloco = (c: Sinal['codigo']) => e.sinais.some((s) => s.codigo === c && (!bloco || !s.evidencia_id || bloco.has(s.evidencia_id)))
    const fala = l.falaAtual?.tipo
    if (l.semInteresse || fala === 'recusa') {
      return { ...base, acao: 'encerrar', estado: 'sem_oportunidade', gerarMensagem: true,
        motivo: 'O cliente disse que não tem interesse. Vale só um agradecimento curto, sem insistir, e encerrar.' }
    }
    if (fala === 'sem_necessidade_agora' || noBloco('sem_necessidade_agora')) {
      return { ...base, acao: 'encerrar', estado: 'sem_oportunidade', gerarMensagem: true,
        motivo: 'O cliente não precisa disso agora. Não é um pedido para parar: agradeça, deixe a porta aberta e não insista.',
        condicaoRetomar: 'Só se o cliente voltar a falar ou se surgir algo realmente novo para ele, daqui a alguns meses.' }
    }
    if ((fala === 'ja_tem_satisfeito' || fala === 'sem_dificuldade' || noBloco('ja_tem_solucao_satisfatoria') || noBloco('sem_dificuldade'))
      && !['quer_melhorar_atual', 'relatou_dificuldade', 'pediu_preco', 'perguntou_servico', 'pediu_proposta', 'pediu_demonstracao'].some((c) => noBloco(c as Sinal['codigo']))) {
      return { ...base, acao: 'encerrar', estado: 'sem_oportunidade', gerarMensagem: true,
        motivo: 'O cliente disse que o que tem hoje atende. Não insista na venda: reconheça e deixe a porta aberta.' }
    }
    if (fala === 'pediu_tempo' && !l.perguntaPendente?.includes('?')) {
      return { ...base, acao: 'aguardar', estado: 'aguardando_resposta', gerarMensagem: false,
        motivo: 'O cliente pediu um tempo para pensar. Mandar outra mensagem agora vira pressão.',
        condicaoRetomar: `Se o cliente escrever, ou depois de ${config.dias_aguardar + 1} dias com algo útil para a decisão dele.` }
    }
    if (noBloco('pediu_proposta')) {
      return { ...base, acao: 'enviar_proposta', estado: 'ativo', gerarMensagem: true,
        motivo: 'O cliente pediu proposta. Entregue escopo, valor e prazo do catálogo, sem rodeio e sem reunião desnecessária.' }
    }
    if (noBloco('pediu_preco')) {
      return { ...base, acao: 'responder_agora', estado: 'ativo', gerarMensagem: true, iaEscolheAcao: true,
        motivo: 'O cliente perguntou o preço. Responda o valor do catálogo e o que está incluído antes de qualquer pergunta.' }
    }
    const motivo = e.temperatura === 'quente'
      ? 'Cliente com pedido concreto esperando resposta. Responda direto e facilite o próximo passo.'
      : 'O cliente escreveu e está esperando resposta.'
    return { ...base, acao: 'responder_agora', estado: 'ativo', gerarMensagem: true, iaEscolheAcao: true, motivo }
  }

  if (e.retornoEm) {
    const r = new Date(e.retornoEm)
    if (r > e.agora) {
      return { ...base, acao: 'retomar_na_data', estado: 'retorno_combinado', gerarMensagem: false,
        motivo: e.retornoExato === false
          ? `O cliente pediu para falar mais pra frente, sem dia certo. Aguarde até ${r.toLocaleDateString('pt-BR', { timeZone: config.fuso, day: '2-digit', month: '2-digit' })}.`
          : `Retorno combinado para ${r.toLocaleDateString('pt-BR', { timeZone: config.fuso, day: '2-digit', month: '2-digit' })}. Respeite a data.`,
        condicaoRetomar: 'Na data combinada, ou antes se o cliente escrever.' }
    }
    return { ...base, acao: 'retomar_na_data', estado: 'retorno_combinado', gerarMensagem: true,
      motivo: 'Chegou a data que o cliente combinou. Retome o assunto dele.' }
  }

  if (l.total === 0) {
    return { ...base, acao: 'primeira_abordagem', estado: 'ativo', gerarMensagem: true,
      motivo: config.preferir_qualificacao ? 'Ainda não houve conversa. Primeiro contato com uma pergunta leve de qualificação.' : 'Ainda não houve conversa. Primeiro contato.' }
  }

  // A Vera falou por último.
  const horas = l.horasDesdeUltima ?? 0
  const espera = config.dias_aguardar * 24

  if (l.compromissoVendedor) {
    return { ...base, acao: 'apresentar_solucao', estado: 'aguardando_resposta', gerarMensagem: true,
      motivo: `Você prometeu: "${l.compromissoVendedor.slice(0, 90)}". Entregue antes de pedir qualquer coisa.` }
  }
  // Lead frio que nunca respondeu: um retorno no máximo, e só com outro ângulo.
  const limite = e.temperatura === 'frio' && l.doLead === 0 ? Math.min(2, config.limite_followups) : config.limite_followups
  if (l.nossasSemResposta >= limite) {
    return { ...base, acao: 'encerrar', estado: 'sem_oportunidade', gerarMensagem: false,
      motivo: `${l.nossasSemResposta} mensagens seguidas sem resposta. Insistir mais tende a queimar o contato.`,
      condicaoRetomar: 'Só se o cliente escrever ou houver uma informação nova e útil para ele.' }
  }
  if (horas < espera) {
    const quando = new Date(+new Date(l.ultima!.enviada_em) + espera * H)
    return { ...base, acao: 'aguardar', estado: 'aguardando_resposta', gerarMensagem: false,
      motivo: e.propostaEnviadaEm ? 'A proposta foi enviada há pouco. Dê tempo para o cliente avaliar.'
        : l.perguntaNossaPendente ? 'Você fez uma pergunta e ela ainda não teve resposta. Outra mensagem agora soa como cobrança.'
        : 'Sua última mensagem ainda não teve resposta. Mandar outra agora soa como cobrança.',
      condicaoRetomar: `Se o cliente responder, ou a partir de ${quando.toLocaleDateString('pt-BR', { timeZone: config.fuso, weekday: 'short', day: '2-digit', month: '2-digit' })}.` }
  }
  return { ...base, acao: 'fazer_followup', estado: 'aguardando_resposta', gerarMensagem: true,
    motivo: e.propostaEnviadaEm
      ? 'A proposta está sem resposta. Facilite a decisão sem reenviar a mesma proposta.'
      : l.perguntaNossaPendente
        ? `Sem resposta há ${Math.floor(horas / 24)} dias para a sua pergunta. Não repita a pergunta: traga algo útil ou um ângulo novo.`
        : `Sem resposta há ${Math.floor(horas / 24)} dias. Um novo contato só se trouxer algo útil.` }
}

/** Estágio comercial a partir da etapa do funil e dos sinais. */
export function estagio(etapa: string, sinais: Sinal[], totalMensagens: number, necessidade: boolean): Estagio {
  const tem = (c: Sinal['codigo']) => sinais.some((s) => s.codigo === c)
  if (etapa === 'fechado') return 'fechado'
  if (etapa === 'perdido' || etapa === 'descartado') return 'perdido'
  if (etapa === 'proposta') return tem('discutiu_prazo_ou_condicoes') || tem('quer_iniciar') ? 'negociacao' : 'proposta'
  if (etapa === 'reuniao_marcada' || tem('pediu_demonstracao')) return 'demonstracao'
  if (tem('pediu_proposta') || tem('quer_iniciar')) return 'proposta'
  if (necessidade || tem('relatou_dificuldade')) return 'diagnostico'
  if (tem('respondeu')) return 'qualificacao'
  return totalMensagens > 0 ? 'primeiro_contato' : 'prospeccao'
}

/** Etapa do funil que os sinais sugerem. Só sugere, quem move é a equipe. */
export function etapaSugerida(etapa: string, sinais: Sinal[]): string | null {
  const tem = (c: Sinal['codigo']) => sinais.some((s) => s.codigo === c)
  const ordem = ['novo', 'contatado', 'respondeu', 'reuniao_marcada', 'proposta']
  const atual = ordem.indexOf(etapa)
  if (atual < 0) return null
  if ((tem('pediu_proposta') || tem('quer_iniciar')) && atual < ordem.indexOf('proposta')) return 'proposta'
  if (tem('respondeu') && atual < ordem.indexOf('respondeu')) return 'respondeu'
  return null
}
