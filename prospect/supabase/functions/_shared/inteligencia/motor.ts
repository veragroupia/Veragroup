import { NOME_SOLUCAO, ofertasAtivas, PORTFOLIO, type Oferta } from './catalogo.ts'
import { ANALISE_VAZIA, ErroContrato, lerJson, validarAnalise, validarRedacao, type Analise, type Evidencia, type Redacao } from './contrato.ts'
import { ordenar } from './conversa.ts'
import { definirDiretrizes, type Diretrizes } from './diretrizes.ts'
import { evidenciasDaEquipe, memoriaParaIA } from './memoria.ts'
import { promptAnalise, promptRedacao } from './prompts.ts'
import { avaliarMensagem, type AvaliacaoMensagem } from './qualidade.ts'
import { ACOES_DE_RESPOSTA, PROMPT_VERSION, type Msg } from './tipos.ts'
import { hashTexto } from './validade.ts'

/* Vera Sales Intelligence · orquestração com IA.
   gerarRecomendacao: regras (avaliar.ts) + IA (análise e, se fizer sentido, redação). A IA entra por injeção. */

export { avaliarLead, hashDoLead, idEvidencia, type EntradaMotor, type Recomendacao } from './avaliar.ts'
import { avaliarLead, hashDoLead, idEvidencia, type EntradaMotor, type Recomendacao } from './avaliar.ts'

/* ---------------- Com IA ---------------- */

export type ChamarIA = (system: string, user: string) => Promise<{ text: string; model: string }>

export interface EntradaGeracao extends EntradaMotor {
  vendedor: string | null
  observacao: string | null
  modo: 'analisar' | 'gerar'
  forcar: boolean
  /** Análise gravada e a chave do contexto em que ela foi feita. */
  cache: { analise: Analise; contexto_hash: string } | null
  /** Quando a equipe corrigiu a memória pela última vez (entra no hash do contexto). */
  memoriaEquipeEm?: string | null
  /** Total real de mensagens (a função carrega só as últimas). */
  totalMensagens?: number
  /** Textos de rascunhos recentes que não foram enviados, para não sugerir a mesma pergunta de novo. */
  rascunhosRecentes?: string[]
}

export type StatusRascunho = 'pronto' | 'revisar' | 'nao_contatar' | 'sem_mensagem'

export interface Resultado {
  recomendacao: Recomendacao
  analise: Analise
  analiseReaproveitada: boolean
  redacao: Redacao | null
  status: StatusRascunho
  /** Identidade do contexto (sem a observação do vendedor). O rascunho só vale enquanto ela não muda. */
  contexto_hash: string
  /** Chave da análise em cache (contexto + observação do vendedor). */
  cache_chave: string
  diretrizes: Diretrizes
  qualidade: { a: AvaliacaoMensagem | null; b: AvaliacaoMensagem | null }
  ultima_mensagem_id: string | null
  modelo: string | null
  descartados: string[]
  prompt_version: string
}

export class ErroIA extends Error {
  constructor(readonly etapa: 'analise' | 'redacao', msg: string) { super(msg); this.name = 'ErroIA' }
}

function evidencias(e: EntradaGeracao, msgs: Msg[]) {
  const l = e.lead
  const lista: { id: string; fonte: string; fato: string }[] = []
  const mapa = new Map<string, Evidencia>()
  const ev = (id: string, fonte: string, fato: string, extra: Partial<Evidencia> = {}) => {
    lista.push({ id, fonte, fato })
    mapa.set(id, { direcao: null, texto: fato, em: null, ...extra })
  }
  ev('lead.nome', 'cadastro', `Nome: ${l.nome}`)
  ev('lead.nicho', 'cadastro', l.nicho ? `Ramo informado: ${l.nicho}` : 'Ramo: desconhecido')
  ev('lead.cidade', 'cadastro', l.cidade ? `Cidade: ${l.cidade}` : 'Cidade: desconhecida')
  ev('lead.site', 'cadastro', l.site ? `Endereço de site registrado: ${l.site}. A página não foi analisada.` : 'Site: campo vazio, ou seja, desconhecido. Não significa que a empresa não tenha site.')
  ev('lead.instagram', 'cadastro', l.instagram ? `Instagram registrado: ${l.instagram}. O perfil não foi analisado.` : 'Instagram: desconhecido.')
  if (l.rating != null) ev('lead.google', 'Google Maps', `Nota ${l.rating} com ${l.avaliacoes ?? 0} avaliações no Google.`)
  if (l.observacoes) ev('lead.observacoes', 'anotação interna da equipe', l.observacoes.slice(0, 1000))
  if (e.observacao) ev('observacao_vendedor', 'visto agora pela equipe', e.observacao.slice(0, 2000))
  for (const f of evidenciasDaEquipe(e.memoriaEquipe)) ev(f.id, f.fonte, f.fato)
  for (const m of msgs) {
    ev(idEvidencia(m.id), m.direcao === 'recebida' ? 'conversa (CLIENTE)' : 'conversa (VERA)', (m.texto ?? '[mídia]').slice(0, 600),
      { direcao: m.direcao, texto: m.texto ?? '', em: m.enviada_em })
  }
  return { lista, mapa }
}

const brt = (d: string | Date, fuso: string) => new Date(d).toLocaleString('pt-BR', { timeZone: fuso })

export async function gerarRecomendacao(e: EntradaGeracao, ia: ChamarIA): Promise<Resultado> {
  const msgs = ordenar(e.mensagens).slice(-60)
  const catalogo = ofertasAtivas(e.config.catalogo)
  const ultima = msgs[msgs.length - 1] ?? null
  const contexto_hash = hashDoLead({ ...e, totalMensagens: e.totalMensagens ?? e.mensagens.length })
  const cache_chave = hashTexto(`${contexto_hash}|${(e.observacao ?? '').trim()}`)

  // Primeiro as regras, sem IA: se o contato está bloqueado ou encerrado, a IA nem é chamada.
  const previa = avaliarLead({ ...e, analise: e.cache?.analise ?? null, analisadoPorIA: !!e.cache })
  const semIA = previa.bloqueado || ['encerrar', 'revisar_dados', 'nao_contatar'].includes(previa.decisao.acao) && !previa.decisao.gerarMensagem

  let analise = e.cache?.analise ?? ANALISE_VAZIA
  let reaproveitada = !!e.cache
  let modelo: string | null = null
  const descartados: string[] = []
  const { lista, mapa } = evidencias(e, msgs)

  const precisaAnalisar = !semIA && (e.forcar || !e.cache || e.cache.contexto_hash !== cache_chave)
  const temMaterial = msgs.length > 0 || !!e.observacao || !!e.lead.observacoes || !!e.memoriaEquipe?.fatos?.length
  if (precisaAnalisar) {
    reaproveitada = false
    if (temMaterial) {
      const entrada = {
        agora: brt(e.agora, e.config.fuso),
        etapa_no_funil: e.lead.etapa,
        evidencias: lista,
        memoria_atual: memoriaParaIA(previa.memoria),
        catalogo: catalogo.map(({ id, nome, preco, prazo, itens, solucoes }) => ({ id, nome, preco, prazo, itens, solucoes })),
        conversa_resumo: { quem_falou_por_ultimo: previa.leitura.ultimaDe, mensagens_da_vera_sem_resposta: previa.leitura.nossasSemResposta },
      }
      let r
      try { r = await ia(promptAnalise(), JSON.stringify(entrada, null, 1)) } catch (err) { throw new ErroIA('analise', `IA indisponível: ${(err as Error).message}`) }
      modelo = r.model
      try {
        const v = validarAnalise(lerJson(r.text), { evidencias: mapa, catalogo })
        analise = v.analise; descartados.push(...v.descartados)
      } catch (err) {
        throw new ErroIA('analise', err instanceof ErroContrato ? err.message : 'Falha ao ler a análise da IA.')
      }
    } else {
      analise = ANALISE_VAZIA
    }
  }

  const rec = avaliarLead({ ...e, analise, analisadoPorIA: precisaAnalisar ? temMaterial : !!e.cache })
  // A IA refina o tipo de resposta só quando o cliente falou por último, e nunca para fugir de um pedido de preço.
  const sugerida = analise.acao_sugerida
  if (rec.decisao.iaEscolheAcao && sugerida && (ACOES_DE_RESPOSTA as readonly string[]).includes(sugerida)
    && !(sugerida === 'qualificar' && rec.diretrizes.informar_preco)) {
    rec.decisao = { ...rec.decisao, acao: sugerida }
    rec.diretrizes = definirDiretrizes({
      decisao: rec.decisao, temperatura: rec.temperatura, sinais: rec.sinais, analise, leitura: rec.leitura, catalogo,
      propostaEnviada: !!e.propostaEnviadaEm,
    })
  }

  const primeiroSemDados = rec.decisao.acao === 'primeira_abordagem' && !analise.dados_suficientes
  let status: StatusRascunho = rec.bloqueado ? 'nao_contatar' : !rec.decisao.gerarMensagem ? 'sem_mensagem' : primeiroSemDados ? 'revisar' : 'pronto'

  let redacao: Redacao | null = null
  const qualidade: Resultado['qualidade'] = { a: null, b: null }
  if (e.modo === 'gerar' && rec.decisao.gerarMensagem && !rec.bloqueado) {
    const oferta: Oferta | null = catalogo.find((o) => o.id === analise.oferta_id) ?? null
    const maxOpcoes: 1 | 2 = rec.decisao.acao === 'encerrar' || primeiroSemDados ? 1 : 2
    const fatosEquipe = [e.observacao, e.lead.observacoes, ...(e.memoriaEquipe?.fatos ?? []).map((f) => f.texto)].filter(Boolean).join('\n')
    const entrada = {
      vendedor: e.vendedor ?? '(nome do vendedor não cadastrado)',
      momento: {
        acao: rec.decisao.acao, motivo: rec.decisao.motivo, temperatura: rec.temperatura, estado: rec.estado,
        primeiro_contato: msgs.length === 0, opcoes_permitidas: maxOpcoes,
      },
      diretrizes: rec.diretrizes,
      analise: {
        necessidade: analise.necessidade, solucao: NOME_SOLUCAO[analise.solucao], oferta,
        pergunta_prioritaria: rec.diretrizes.pode_perguntar ? analise.pergunta_prioritaria : null,
        pergunta_pendente_do_cliente: analise.pergunta_pendente_do_cliente ?? rec.leitura.perguntaPendente,
        objecao_aberta: analise.objecao_aberta, compromisso_pendente: rec.leitura.compromissoVendedor,
        mencionar_assunto_anterior: analise.mencionar_assunto_anterior, mudou_de_assunto: analise.mudou_de_assunto,
        dados_suficientes: analise.dados_suficientes, estilo_cliente: analise.estilo_cliente,
        fatos_verificados: [...analise.conhecido.filter((f) => f.fonte !== 'hipotese').map((f) => f.fato), ...(e.memoriaEquipe?.fatos ?? []).map((f) => f.texto)],
        hipoteses_nao_confirmadas: analise.conhecido.filter((f) => f.fonte === 'hipotese').map((f) => f.fato),
      },
      memoria: memoriaParaIA(rec.memoria),
      observacao_vendedor: e.observacao,
      conversa: msgs.slice(-20).map((m) => ({ id: idEvidencia(m.id), quem: m.direcao === 'recebida' ? 'CLIENTE' : 'VERA', quando: brt(m.enviada_em, e.config.fuso), texto: m.texto ?? '[mídia]' })),
      catalogo: catalogo.map(({ id, nome, preco, prazo, itens }) => ({ id, nome, preco, prazo, itens })),
      portfolio: PORTFOLIO,
    }
    let r
    try { r = await ia(promptRedacao(e.config), JSON.stringify(entrada, null, 1)) } catch (err) { throw new ErroIA('redacao', `IA indisponível: ${(err as Error).message}`) }
    modelo = r.model
    try {
      redacao = validarRedacao(lerJson(r.text), { permitido: true, maxOpcoes, permitirRetomada: analise.mencionar_assunto_anterior })
    } catch (err) {
      throw new ErroIA('redacao', err instanceof ErroContrato ? err.message : 'Falha ao ler a mensagem da IA.')
    }

    // Avaliação objetiva de cada opção. Problema grave (fato ou preço inventado, pedido ignorado, repetição) exige revisão.
    const ctxQ = {
      acao: rec.decisao.acao, diretrizes: rec.diretrizes, lead: e.lead, fatosDaEquipe: fatosEquipe, catalogo,
      mensagensAnteriores: msgs.filter((m) => m.direcao === 'enviada').map((m) => m.texto ?? '').filter(Boolean),
      perguntasAnteriores: [...rec.leitura.perguntasFeitas, ...(analise.memoria?.perguntas_respondidas ?? []).map((p) => p.pergunta)],
      rascunhosAnteriores: e.rascunhosRecentes ?? [],
      primeiroContato: msgs.length === 0, solucao: analise.solucao,
    }
    if (redacao.mensagem_a) qualidade.a = avaliarMensagem(redacao.mensagem_a, ctxQ)
    if (redacao.mensagem_b) qualidade.b = avaliarMensagem(redacao.mensagem_b, ctxQ)
    for (const [nome, q] of [['A', qualidade.a], ['B', qualidade.b]] as const) {
      if (q) for (const al of q.alertas) redacao.alertas.push(`Opção ${nome} · ${al}`)
    }
    // A opção recomendada não pode ser a que tem problema grave.
    if (redacao.melhor_opcao === 'A' && qualidade.a?.revisar && qualidade.b && !qualidade.b.revisar) redacao.melhor_opcao = 'B'
    if (redacao.melhor_opcao === 'B' && qualidade.b?.revisar && qualidade.a && !qualidade.a.revisar) redacao.melhor_opcao = 'A'
    const recomendada = redacao.melhor_opcao === 'B' ? qualidade.b : qualidade.a
    if (status === 'pronto' && recomendada?.revisar) status = 'revisar'
    if (!redacao.mensagem_a) status = 'sem_mensagem'
  }

  return {
    recomendacao: rec, analise, analiseReaproveitada: reaproveitada, redacao, status, contexto_hash, cache_chave,
    diretrizes: rec.diretrizes, qualidade,
    ultima_mensagem_id: ultima?.id ?? null, modelo, descartados, prompt_version: PROMPT_VERSION,
  }
}
