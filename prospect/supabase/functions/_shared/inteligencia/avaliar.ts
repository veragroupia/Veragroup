import type { ConfigComercial } from './config.ts'
import { ANALISE_VAZIA, type Analise } from './analise.ts'
import { bloqueioDoLead, lerConversa, ordenar, type Leitura } from './conversa.ts'
import { decidir, estagio, etapaSugerida, type Decisao } from './decisao.ts'
import { recomendarHorario } from './horario.ts'
import { combinarSinais, confianca, scoreAdequacao, scoreInteresse, sinaisDaConversa, temperatura } from './pontuacao.ts'
import type { Bloqueio, Confianca, EstadoContato, Estagio, JanelaContato, LeadBase, Msg, Sinal, Temperatura } from './tipos.ts'

/* Vera Sales Intelligence · avaliação só por regras. Barata, sem IA: roda no navegador (tela Hoje, painel)
   e na função antes de decidir se vale chamar a IA. */

export const idEvidencia = (mensagemId: string) => `msg_${mensagemId.replace(/-/g, '').slice(0, 10)}`

export interface EntradaMotor {
  agora: Date
  config: ConfigComercial
  lead: LeadBase
  mensagens: Msg[]
  bloqueios: Bloqueio[]
  /** A equipe liberou o contato depois de um pedido para parar. */
  liberadoEm?: string | null
  /** Retorno combinado gravado pela equipe (vale mais que o lido da conversa). */
  retornoManual?: string | null
  temperaturaManual?: Temperatura | null
  propostaEnviadaEm?: string | null
  propostaStatus?: string | null
  analise?: Analise | null
  /** A análise é de IA (true) ou só regras (false). */
  analisadoPorIA?: boolean
}

export interface Recomendacao {
  temperatura: Temperatura
  temperatura_calculada: Temperatura
  temperatura_manual: Temperatura | null
  score_interesse: number
  score_adequacao: number
  adequacao_sem_evidencia: boolean
  confianca: Confianca
  estado: EstadoContato
  estagio: Estagio
  etapa_sugerida: string | null
  sinais: Sinal[]
  decisao: Decisao
  horario: JanelaContato | null
  necessidade: string | null
  solucao: Analise['solucao']
  oferta_id: string | null
  desconhecido: string[]
  pergunta_prioritaria: string | null
  retorno_em: string | null
  bloqueado: boolean
  motivo_bloqueio: string | null
  leitura: Pick<Leitura, 'total' | 'doLead' | 'ultimaDe' | 'nossasSemResposta' | 'perguntaPendente' | 'compromissoVendedor' | 'horasDesdeUltima'>
}

/** Só regras. Com `analise` (gravada ou nova), incorpora os sinais classificados pela IA. */
export function avaliarLead(e: EntradaMotor): Recomendacao {
  const msgs = ordenar(e.mensagens)
  const leitura = lerConversa(msgs, e.agora, { liberadoEm: e.liberadoEm })
  const bloqueio = bloqueioDoLead(e.lead, e.bloqueios)
  const bloqueado = !!bloqueio || !!leitura.pediuParaParar
  const analise = e.analise ?? ANALISE_VAZIA

  const primeiraDoLead = msgs.find((m) => m.direcao === 'recebida')
  const regra = sinaisDaConversa(leitura, primeiraDoLead ? idEvidencia(primeiraDoLead.id) : null)
    .map((s) => (s.evidencia_id && !s.evidencia_id.startsWith('msg_') ? { ...s, evidencia_id: idEvidencia(s.evidencia_id) } : s))
  const sinais = combinarSinais(regra, analise.sinais)

  const interesse = scoreInteresse(sinais, e.config.pesos)
  const adequacao = scoreAdequacao(sinais, e.config.pesos)
  const tCalc = temperatura(sinais, interesse.valor)
  const tFinal = e.temperaturaManual ?? tCalc

  // Retorno pedido na conversa só vale se o cliente não falou mais nada depois.
  const ultimaRecebida = [...msgs].reverse().find((m) => m.direcao === 'recebida')
  const retornoConversa = leitura.retornoPedido && ultimaRecebida && leitura.retornoPedido.mensagem_id === ultimaRecebida.id ? leitura.retornoPedido.em : null
  const retornoEm = e.retornoManual ?? retornoConversa

  const decisao = decidir({
    agora: e.agora, config: e.config, leitura, etapa: e.lead.etapa,
    temTelefone: !!(e.lead.whatsapp || e.lead.telefone), bloqueado, retornoEm,
    propostaEnviadaEm: e.propostaEnviadaEm ?? null, sinais, temperatura: tFinal,
  })

  const horario = decisao.acao === 'encerrar' || decisao.acao === 'revisar_dados'
    ? null
    : recomendarHorario({
      agora: e.agora, config: e.config, bloqueado, retornoEm,
      leadAguarda: leitura.ultimaDe === 'lead', respostas: leitura.respostas, nicho: e.lead.nicho,
    })

  return {
    temperatura: tFinal, temperatura_calculada: tCalc, temperatura_manual: e.temperaturaManual ?? null,
    score_interesse: interesse.valor, score_adequacao: adequacao.valor, adequacao_sem_evidencia: adequacao.semEvidencia,
    confianca: confianca(leitura, sinais, !!e.analisadoPorIA),
    estado: decisao.estado,
    estagio: estagio(e.lead.etapa, sinais, leitura.total, !!analise.necessidade),
    etapa_sugerida: bloqueado ? null : etapaSugerida(e.lead.etapa, sinais),
    sinais, decisao, horario,
    necessidade: analise.necessidade, solucao: analise.solucao, oferta_id: analise.oferta_id,
    desconhecido: analise.desconhecido, pergunta_prioritaria: analise.pergunta_prioritaria,
    retorno_em: retornoEm, bloqueado,
    motivo_bloqueio: bloqueio?.motivo ?? (leitura.pediuParaParar ? 'Pediu para não receber mensagens' : null),
    leitura: {
      total: leitura.total, doLead: leitura.doLead, ultimaDe: leitura.ultimaDe, nossasSemResposta: leitura.nossasSemResposta,
      perguntaPendente: leitura.perguntaPendente, compromissoVendedor: leitura.compromissoVendedor, horasDesdeUltima: leitura.horasDesdeUltima,
    },
  }
}
