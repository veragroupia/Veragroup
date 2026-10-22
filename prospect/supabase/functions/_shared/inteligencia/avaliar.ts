import type { ConfigComercial } from './config.ts'
import { ANALISE_VAZIA, type Analise, type MemoriaEquipe } from './analise.ts'
import { ofertasAtivas } from './catalogo.ts'
import { bloqueioDoLead, lerConversa, ordenar, type Leitura } from './conversa.ts'
import { decidir, estagio, etapaSugerida, type Decisao } from './decisao.ts'
import { definirDiretrizes, type Diretrizes } from './diretrizes.ts'
import { recomendarHorario } from './horario.ts'
import { montarMemoria, type MemoriaVisivel } from './memoria.ts'
import { combinarSinais, confianca, scoreAdequacao, scoreInteresse, sinaisDaConversa, temperatura, vigentes, type SinalDesconsiderado } from './pontuacao.ts'
import { PROMPT_VERSION, type Bloqueio, type Confianca, type EstadoContato, type Estagio, type JanelaContato, type LeadBase, type Msg, type Sinal, type Temperatura } from './tipos.ts'
import { assinaturaComunicacao, hashContexto } from './validade.ts'

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
  /** Correções da equipe na memória do lead (fatos confirmados, itens errados, horário de funcionamento). */
  memoriaEquipe?: MemoriaEquipe | null
}

/** Hash do contexto do lead. O painel e a função usam esta mesma conta, então um rascunho vale ou não vale igual nos dois lados. */
export function hashDoLead(e: Pick<EntradaMotor, 'lead' | 'mensagens' | 'bloqueios' | 'retornoManual' | 'propostaStatus' | 'config' | 'temperaturaManual' | 'liberadoEm'> & { memoriaEquipeEm?: string | null; totalMensagens?: number }) {
  const msgs = ordenar(e.mensagens)
  const leitura = lerConversa(msgs, new Date(), { liberadoEm: e.liberadoEm })
  return hashContexto({
    ultimaMensagemId: msgs[msgs.length - 1]?.id ?? null, totalMensagens: e.totalMensagens ?? msgs.length, etapa: e.lead.etapa,
    bloqueado: !!bloqueioDoLead(e.lead, e.bloqueios) || !!leitura.pediuParaParar, retornoEm: e.retornoManual ?? null,
    propostaStatus: e.propostaStatus ?? null, catalogoVersao: e.config.catalogo_versao, promptVersion: PROMPT_VERSION,
    temperaturaManual: e.temperaturaManual ?? null, memoriaEquipeEm: e.memoriaEquipeEm ?? null, comunicacao: assinaturaComunicacao(e.config),
  })
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
  /** Sinais que existem, mas não contam mais (antigos ou contrariados depois). */
  sinais_desconsiderados: SinalDesconsiderado[]
  decisao: Decisao
  diretrizes: Diretrizes
  memoria: MemoriaVisivel
  horario: JanelaContato | null
  necessidade: string | null
  solucao: Analise['solucao']
  oferta_id: string | null
  desconhecido: string[]
  pergunta_prioritaria: string | null
  retorno_em: string | null
  bloqueado: boolean
  motivo_bloqueio: string | null
  leitura: Pick<Leitura, 'total' | 'doLead' | 'ultimaDe' | 'nossasSemResposta' | 'perguntaPendente' | 'compromissoVendedor' | 'horasDesdeUltima' | 'perguntaNossaPendente' | 'perguntasFeitas' | 'falaAtual'>
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
  // Data de cada evidência (para recência) e liberação de contato (pedido para parar anterior não conta).
  const quando = new Map(msgs.map((m) => [idEvidencia(m.id), m.enviada_em]))
  const liberado = e.liberadoEm ? +new Date(e.liberadoEm) : -Infinity
  const daIA = analise.sinais.map((s) => ({ ...s, em: s.em ?? (s.evidencia_id ? quando.get(s.evidencia_id) ?? null : null) }))
    .filter((s) => !(s.codigo === 'pediu_para_parar' && s.em && +new Date(s.em) <= liberado))
  const todos = combinarSinais(regra, daIA)
  const { vigentes: sinais, desconsiderados } = vigentes(todos, e.agora)
  const pararPelaIA = !leitura.pediuParaParar && sinais.some((s) => s.codigo === 'pediu_para_parar' && s.fonte === 'conversa')

  const interesse = scoreInteresse(sinais, e.config.pesos)
  const adequacao = scoreAdequacao(sinais, e.config.pesos)
  const tCalc = temperatura(sinais, interesse.valor)
  const tFinal = e.temperaturaManual ?? tCalc

  // Retorno pedido na conversa só vale se o cliente não falou mais nada depois.
  const ultimaRecebida = [...msgs].reverse().find((m) => m.direcao === 'recebida')
  const retornoConversa = leitura.retornoPedido && ultimaRecebida && leitura.retornoPedido.mensagem_id === ultimaRecebida.id ? leitura.retornoPedido : null
  const retornoEm = e.retornoManual ?? retornoConversa?.em ?? null
  const retornoExato = e.retornoManual ? true : retornoConversa?.exato ?? true

  const decisao = decidir({
    agora: e.agora, config: e.config, leitura, etapa: e.lead.etapa,
    temTelefone: !!(e.lead.whatsapp || e.lead.telefone), bloqueado, retornoEm, retornoExato,
    propostaEnviadaEm: e.propostaEnviadaEm ?? null, sinais, temperatura: tFinal,
    idsBlocoAtual: new Set(leitura.blocoAtual.map(idEvidencia)), pararPelaIA,
  })
  const diretrizes = definirDiretrizes({
    decisao, temperatura: tFinal, sinais, analise, leitura, catalogo: ofertasAtivas(e.config.catalogo), propostaEnviada: !!e.propostaEnviadaEm,
  })

  const horario = decisao.acao === 'encerrar' || decisao.acao === 'revisar_dados'
    ? null
    : recomendarHorario({
      agora: e.agora, config: e.config, bloqueado: bloqueado || pararPelaIA, retornoEm, retornoExato,
      leadAguarda: leitura.ultimaDe === 'lead', respostas: leitura.respostas, nicho: e.lead.nicho,
      funcionamento: e.memoriaEquipe?.horario_funcionamento ?? null,
    })

  return {
    temperatura: tFinal, temperatura_calculada: tCalc, temperatura_manual: e.temperaturaManual ?? null,
    score_interesse: interesse.valor, score_adequacao: adequacao.valor, adequacao_sem_evidencia: adequacao.semEvidencia,
    confianca: confianca(leitura, sinais, !!e.analisadoPorIA),
    estado: decisao.estado,
    estagio: estagio(e.lead.etapa, sinais, leitura.total, !!analise.necessidade),
    etapa_sugerida: bloqueado ? null : etapaSugerida(e.lead.etapa, sinais),
    sinais, sinais_desconsiderados: desconsiderados, decisao, diretrizes, horario,
    memoria: montarMemoria(analise, e.memoriaEquipe, { compromissoVendedor: leitura.compromissoVendedor, retornoPedido: retornoConversa }),
    necessidade: analise.necessidade, solucao: analise.solucao, oferta_id: analise.oferta_id,
    desconhecido: analise.desconhecido, pergunta_prioritaria: analise.pergunta_prioritaria,
    retorno_em: retornoEm, bloqueado: bloqueado || pararPelaIA,
    motivo_bloqueio: bloqueio?.motivo ?? (leitura.pediuParaParar ? 'Pediu para não receber mensagens'
      : pararPelaIA ? 'A análise entendeu um pedido para não receber mensagens (confira a conversa)' : null),
    leitura: {
      total: leitura.total, doLead: leitura.doLead, ultimaDe: leitura.ultimaDe, nossasSemResposta: leitura.nossasSemResposta,
      perguntaPendente: leitura.perguntaPendente, compromissoVendedor: leitura.compromissoVendedor, horasDesdeUltima: leitura.horasDesdeUltima,
      perguntaNossaPendente: leitura.perguntaNossaPendente, perguntasFeitas: leitura.perguntasFeitas, falaAtual: leitura.falaAtual,
    },
  }
}
