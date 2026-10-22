import { NOME_SOLUCAO, ofertasAtivas, PORTFOLIO, type Oferta } from './catalogo.ts'
import { ANALISE_VAZIA, ErroContrato, lerJson, validarAnalise, validarRedacao, type Analise, type Redacao } from './contrato.ts'
import { bloqueioDoLead, ordenar } from './conversa.ts'
import { promptAnalise, promptRedacao } from './prompts.ts'
import { ACOES_DE_RESPOSTA, PROMPT_VERSION, type Msg } from './tipos.ts'
import { hashContexto } from './validade.ts'

/* Vera Sales Intelligence · orquestração com IA.
   gerarRecomendacao: regras (avaliar.ts) + IA (análise e, se fizer sentido, redação). A IA entra por injeção. */

export { avaliarLead, idEvidencia, type EntradaMotor, type Recomendacao } from './avaliar.ts'
import { avaliarLead, idEvidencia, type EntradaMotor, type Recomendacao } from './avaliar.ts'

/* ---------------- Com IA ---------------- */

export type ChamarIA = (system: string, user: string) => Promise<{ text: string; model: string }>

export interface EntradaGeracao extends EntradaMotor {
  vendedor: string | null
  observacao: string | null
  modo: 'analisar' | 'gerar'
  forcar: boolean
  /** Análise gravada e o hash do contexto em que ela foi feita. */
  cache: { analise: Analise; contexto_hash: string } | null
}

export type StatusRascunho = 'pronto' | 'revisar' | 'nao_contatar' | 'sem_mensagem'

export interface Resultado {
  recomendacao: Recomendacao
  analise: Analise
  analiseReaproveitada: boolean
  redacao: Redacao | null
  status: StatusRascunho
  contexto_hash: string
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
  const ev = (id: string, fonte: string, fato: string) => lista.push({ id, fonte, fato })
  ev('lead.nome', 'cadastro', `Nome: ${l.nome}`)
  ev('lead.nicho', 'cadastro', l.nicho ? `Ramo informado: ${l.nicho}` : 'Ramo: desconhecido')
  ev('lead.cidade', 'cadastro', l.cidade ? `Cidade: ${l.cidade}` : 'Cidade: desconhecida')
  ev('lead.site', 'cadastro', l.site ? `Endereço de site registrado: ${l.site}. A página não foi analisada.` : 'Site: campo vazio, ou seja, desconhecido. Não significa que a empresa não tenha site.')
  ev('lead.instagram', 'cadastro', l.instagram ? `Instagram registrado: ${l.instagram}. O perfil não foi analisado.` : 'Instagram: desconhecido.')
  if (l.rating != null) ev('lead.google', 'Google Maps', `Nota ${l.rating} com ${l.avaliacoes ?? 0} avaliações no Google.`)
  if (l.observacoes) ev('lead.observacoes', 'anotação interna da equipe', l.observacoes.slice(0, 1000))
  if (e.observacao) ev('observacao_vendedor', 'visto agora pela equipe', e.observacao.slice(0, 2000))
  for (const m of msgs) ev(idEvidencia(m.id), m.direcao === 'recebida' ? 'conversa (CLIENTE)' : 'conversa (VERA)', (m.texto ?? '[mídia]').slice(0, 600))
  return lista
}

const brt = (d: string | Date, fuso: string) => new Date(d).toLocaleString('pt-BR', { timeZone: fuso })

export async function gerarRecomendacao(e: EntradaGeracao, ia: ChamarIA): Promise<Resultado> {
  const msgs = ordenar(e.mensagens).slice(-60)
  const catalogo = ofertasAtivas(e.config.catalogo)
  const ultima = msgs[msgs.length - 1] ?? null
  const contexto_hash = hashContexto({
    ultimaMensagemId: ultima?.id ?? null, totalMensagens: msgs.length, etapa: e.lead.etapa,
    bloqueado: !!bloqueioDoLead(e.lead, e.bloqueios), retornoEm: e.retornoManual ?? null, propostaStatus: e.propostaStatus ?? null,
    catalogoVersao: e.config.catalogo_versao, promptVersion: PROMPT_VERSION, observacao: e.observacao,
  })

  // Primeiro as regras, sem IA: se o contato está bloqueado ou encerrado, a IA nem é chamada.
  const previa = avaliarLead({ ...e, analise: e.cache?.analise ?? null, analisadoPorIA: !!e.cache })
  const semIA = previa.bloqueado || ['encerrar', 'revisar_dados'].includes(previa.decisao.acao) && !previa.decisao.gerarMensagem

  let analise = e.cache?.analise ?? ANALISE_VAZIA
  let reaproveitada = !!e.cache
  let modelo: string | null = null
  const descartados: string[] = []
  const lista = evidencias(e, msgs)

  const precisaAnalisar = !semIA && (e.forcar || !e.cache || e.cache.contexto_hash !== contexto_hash)
  const temMaterial = msgs.length > 0 || !!e.observacao || !!e.lead.observacoes
  if (precisaAnalisar) {
    reaproveitada = false
    if (temMaterial) {
      const entrada = {
        agora: brt(e.agora, e.config.fuso),
        etapa_no_funil: e.lead.etapa,
        evidencias: lista,
        catalogo: catalogo.map(({ id, nome, preco, prazo, itens, solucoes }) => ({ id, nome, preco, prazo, itens, solucoes })),
        conversa_resumo: { quem_falou_por_ultimo: previa.leitura.ultimaDe, mensagens_da_vera_sem_resposta: previa.leitura.nossasSemResposta },
      }
      let r
      try { r = await ia(promptAnalise(), JSON.stringify(entrada, null, 1)) } catch (err) { throw new ErroIA('analise', `IA indisponível: ${(err as Error).message}`) }
      modelo = r.model
      try {
        const v = validarAnalise(lerJson(r.text), { evidencias: new Set(lista.map((x) => x.id)), catalogo })
        analise = v.analise; descartados.push(...v.descartados)
      } catch (err) {
        throw new ErroIA('analise', err instanceof ErroContrato ? err.message : 'Falha ao ler a análise da IA.')
      }
    } else {
      analise = ANALISE_VAZIA
    }
  }

  const rec = avaliarLead({ ...e, analise, analisadoPorIA: precisaAnalisar ? temMaterial : !!e.cache })
  // A IA refina o tipo de resposta só quando o cliente falou por último.
  if (rec.decisao.iaEscolheAcao && analise.acao_sugerida && (ACOES_DE_RESPOSTA as readonly string[]).includes(analise.acao_sugerida)) {
    rec.decisao = { ...rec.decisao, acao: analise.acao_sugerida }
  }

  const primeiroSemDados = rec.decisao.acao === 'primeira_abordagem' && !analise.dados_suficientes
  const status: StatusRascunho = rec.bloqueado ? 'nao_contatar' : !rec.decisao.gerarMensagem ? 'sem_mensagem' : primeiroSemDados ? 'revisar' : 'pronto'

  let redacao: Redacao | null = null
  if (e.modo === 'gerar' && rec.decisao.gerarMensagem && !rec.bloqueado) {
    const oferta: Oferta | null = catalogo.find((o) => o.id === analise.oferta_id) ?? null
    const maxOpcoes: 1 | 2 = rec.decisao.acao === 'encerrar' || primeiroSemDados ? 1 : 2
    const entrada = {
      vendedor: e.vendedor ?? '(nome do vendedor não cadastrado)',
      momento: {
        acao: rec.decisao.acao, motivo: rec.decisao.motivo, temperatura: rec.temperatura, estado: rec.estado,
        primeiro_contato: msgs.length === 0, opcoes_permitidas: maxOpcoes,
      },
      analise: {
        necessidade: analise.necessidade, solucao: NOME_SOLUCAO[analise.solucao], oferta,
        pergunta_prioritaria: analise.pergunta_prioritaria, assuntos_resolvidos: analise.assuntos_resolvidos,
        pergunta_pendente_do_cliente: analise.pergunta_pendente_do_cliente ?? rec.leitura.perguntaPendente,
        objecao_aberta: analise.objecao_aberta, compromisso_pendente: rec.leitura.compromissoVendedor,
        mencionar_assunto_anterior: analise.mencionar_assunto_anterior, mudou_de_assunto: analise.mudou_de_assunto,
        dados_suficientes: analise.dados_suficientes, estilo_cliente: analise.estilo_cliente,
        fatos_verificados: analise.conhecido.filter((f) => f.fonte !== 'hipotese'),
      },
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
  }

  return {
    recomendacao: rec, analise, analiseReaproveitada: reaproveitada, redacao, status, contexto_hash,
    ultima_mensagem_id: ultima?.id ?? null, modelo, descartados, prompt_version: PROMPT_VERSION,
  }
}
