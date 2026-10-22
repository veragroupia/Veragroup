import type { Analise } from './analise.ts'
import type { Oferta } from './catalogo.ts'
import { normalizar, type Leitura } from './conversa.ts'
import type { Decisao } from './decisao.ts'
import type { Sinal, Temperatura } from './tipos.ts'

/* Diretrizes da próxima mensagem: decididas por regra, antes da IA escrever.
   Dizem se é hora de descobrir ou de vender, se cabe uma pergunta, de que tipo e sobre o quê,
   e o que não pode ser perguntado de novo. A IA escreve dentro desses limites. */

export type FocoPergunta = 'situacao' | 'problema' | 'implicacao' | 'valor' | 'decisao'
export type TipoPergunta = 'aberta' | 'alternativas' | 'confirmacao' | 'nenhuma'

export interface Diretrizes {
  /** Já se sabe o bastante para apresentar uma solução: parar de investigar. */
  hora_de_vender: boolean
  pode_perguntar: boolean
  tipo_pergunta: TipoPergunta
  /** Sobre o que perguntar, se perguntar (SPIN/CHAMP por dentro; o cliente não percebe). */
  foco: FocoPergunta | null
  /** O pedido do cliente que precisa ser respondido primeiro. */
  responder_primeiro: string | null
  /** Pediu preço: o valor do catálogo vai na mensagem. */
  informar_preco: { oferta: string; preco: string; prazo: string; itens: string } | null
  /** Perguntas já feitas ou respondidas: não repetir. */
  nao_perguntar: string[]
  /** Cuidados específicos deste momento. */
  evitar: string[]
  motivo: string
}

const PERGUNTA_DE_PRECO = /quanto|valor|preco|custa|cobra|orcamento|investimento|tabela/

export interface EntradaDiretrizes {
  decisao: Decisao
  temperatura: Temperatura
  sinais: Sinal[]
  analise: Analise
  leitura: Pick<Leitura, 'perguntaPendente' | 'perguntaNossaPendente' | 'perguntasFeitas' | 'falaAtual' | 'total' | 'compromissoVendedor'>
  catalogo: Oferta[]
  propostaEnviada: boolean
}

export function definirDiretrizes(e: EntradaDiretrizes): Diretrizes {
  const { decisao: d, analise: a, leitura: l } = e
  const tem = (c: Sinal['codigo']) => e.sinais.some((s) => s.codigo === c)
  const mem = a.memoria
  const nao_perguntar = [
    ...l.perguntasFeitas.slice(-8),
    ...(mem?.perguntas_respondidas ?? []).map((p) => `${p.pergunta} (respondido: ${p.resposta})`),
    ...a.assuntos_resolvidos,
  ].slice(0, 16)
  const evitar: string[] = []
  if (!a.mencionar_assunto_anterior) evitar.push('Não retome assunto antigo nem diga "voltando ao assunto" ou "conforme conversamos".')
  if (e.propostaEnviada) evitar.push('Não reenvie a proposta que já foi enviada.')
  if ((mem?.objecoes ?? []).some((o) => o.resolvida)) evitar.push('Não volte a objeções que já foram resolvidas.')

  const pediuPreco = tem('pediu_preco') || PERGUNTA_DE_PRECO.test(normalizar(l.perguntaPendente))
  const oferta = e.catalogo.find((o) => o.id === a.oferta_id) ?? null
  const informar_preco = pediuPreco && oferta
    ? { oferta: oferta.nome, preco: oferta.preco, prazo: oferta.prazo, itens: oferta.itens } : null

  const base = { nao_perguntar, evitar, informar_preco, responder_primeiro: l.perguntaPendente }

  // Encerrar: agradecer e deixar a porta aberta, sem pergunta e sem oferta.
  if (d.acao === 'encerrar') {
    return { ...base, informar_preco: null, hora_de_vender: false, pode_perguntar: false, tipo_pergunta: 'nenhuma', foco: null,
      evitar: [...evitar, 'Sem oferta, sem pergunta e sem insistência.'], motivo: 'Encerrar com educação.' }
  }

  // Hora de vender: pedido concreto, ou dificuldade + necessidade + solução já claras.
  const solucaoClara = a.solucao !== 'indefinida' && a.solucao !== 'nenhuma'
  const dorClara = !!(mem?.spin.problema || (mem?.necessidades.length ?? 0) > 0 || a.necessidade) && (tem('relatou_dificuldade') || tem('quer_melhorar_atual') || tem('perguntou_servico') || tem('pediu_exemplo'))
  const hora_de_vender = e.temperatura === 'quente' || ['enviar_proposta', 'apresentar_solucao', 'oferecer_demonstracao'].includes(d.acao)
    || (dorClara && solucaoClara) || (pediuPreco && tem('quer_melhorar_atual'))

  if (d.acao === 'enviar_proposta' || (e.temperatura === 'quente' && hora_de_vender)) {
    return { ...base, hora_de_vender: true, pode_perguntar: !a.dados_suficientes, tipo_pergunta: a.dados_suficientes ? 'nenhuma' : 'alternativas', foco: a.dados_suficientes ? null : 'decisao',
      evitar: [...evitar, 'Não volte a perguntas de diagnóstico: ajude o cliente a decidir.'],
      motivo: 'O cliente já mostrou intenção. Responder valores, escopo e prazo e facilitar o próximo passo.' }
  }
  if (hora_de_vender) {
    return { ...base, hora_de_vender: true, pode_perguntar: true, tipo_pergunta: 'confirmacao', foco: 'valor',
      evitar: [...evitar, 'Não faça mais perguntas de diagnóstico: a dificuldade já está clara.'],
      motivo: 'A necessidade e a solução já estão claras. Apresentar uma possibilidade concreta e oferecer o próximo passo.' }
  }

  // Cliente aguardando uma resposta objetiva (preço, dúvida): responder primeiro; no máximo uma pergunta leve no fim.
  if (pediuPreco) {
    return { ...base, hora_de_vender: false, pode_perguntar: true, tipo_pergunta: 'alternativas', foco: oferta ? 'situacao' : 'decisao',
      motivo: oferta ? 'Responder o valor e o que está incluído; depois, se fizer sentido, uma pergunta para ajustar o escopo.'
        : 'Dar a faixa de valores do catálogo e perguntar só o que define qual opção serve.' }
  }

  // Follow-up com pergunta nossa sem resposta: nada de nova pergunta.
  if (d.acao === 'fazer_followup' && l.perguntaNossaPendente) {
    return { ...base, hora_de_vender: false, pode_perguntar: false, tipo_pergunta: 'nenhuma', foco: null,
      evitar: [...evitar, 'Não repita a pergunta anterior nem cobre resposta.'],
      motivo: 'Sua pergunta anterior ficou sem resposta. Traga algo útil, sem nova pergunta.' }
  }

  // Descoberta: a próxima peça do SPIN que falta. Se o cliente disse que já tem, perguntar se atende.
  let foco: FocoPergunta | null = null
  if (l.falaAtual?.tipo === 'ja_tem') foco = 'problema'
  else if (!mem?.spin.situacao && d.acao !== 'fazer_followup') foco = 'situacao'
  else if (!mem?.spin.problema) foco = 'problema'
  else if (!mem?.spin.implicacao) foco = 'implicacao'
  else if (!mem?.spin.valor) foco = 'valor'
  const tipo: TipoPergunta = foco === 'situacao' ? 'alternativas' : foco === 'valor' || l.falaAtual?.tipo === 'ja_tem' ? 'confirmacao' : foco ? 'aberta' : 'nenhuma'
  return { ...base, hora_de_vender: false, pode_perguntar: !!foco, tipo_pergunta: tipo, foco,
    motivo: foco ? `Descobrir ${NOME_FOCO[foco]}, com uma pergunta fácil de responder.` : 'Nada essencial a perguntar agora.' }
}

export const NOME_FOCO: Record<FocoPergunta, string> = {
  situacao: 'como o negócio funciona hoje', problema: 'se existe uma dificuldade real', implicacao: 'quanto essa dificuldade pesa no dia a dia',
  valor: 'se resolver isso teria valor para o cliente', decisao: 'o que falta para o cliente decidir',
}
