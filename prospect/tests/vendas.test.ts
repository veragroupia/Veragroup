import { describe, expect, it } from 'vitest'
import { avaliarLead, ErroIA, gerarRecomendacao, hashDoLead } from '../supabase/functions/_shared/inteligencia/motor.ts'
import { validarAnalise } from '../supabase/functions/_shared/inteligencia/contrato.ts'
import { bloqueioDoLead, interpretarFala, lerConversa } from '../supabase/functions/_shared/inteligencia/conversa.ts'
import { CATALOGO_PADRAO } from '../supabase/functions/_shared/inteligencia/catalogo.ts'
import { motivoObsoleta } from '../supabase/functions/_shared/inteligencia/validade.ts'
import { avaliarMensagem, type ContextoQualidade } from '../supabase/functions/_shared/inteligencia/qualidade.ts'
import { PROMPT_VERSION } from '../supabase/functions/_shared/inteligencia/tipos.ts'
import type { Msg } from '../supabase/functions/_shared/inteligencia/tipos.ts'
import { AGORA, analiseBase, config, entrada, ev, evidencias, geracao, iaFalsa, lead, msg } from './apoio.ts'

/* Os 40 cenários obrigatórios da especificação V5. Cada teste exercita a lógica real
   (interpretação, pontuação, decisão, diretrizes, validação e qualidade), não só o formato do JSON. */

/** Análise da IA validada contra as mensagens reais (direção e texto de cada evidência). */
function analisada(msgs: Msg[], raw: object) {
  return validarAnalise(analiseBase(raw), { evidencias: evidencias(['lead.nome', 'lead.nicho', 'observacao_vendedor'], msgs), catalogo: CATALOGO_PADRAO })
}
function avaliar(msgs: Msg[], raw?: object, extra: Parameters<typeof entrada>[0] = {}) {
  const analise = raw ? analisada(msgs, raw).analise : null
  return avaliarLead(entrada({ lead: lead({ etapa: msgs.length ? 'respondeu' : 'novo' }), mensagens: msgs, analise, analisadoPorIA: !!raw, ...extra }))
}
const qctx = (extra: Partial<ContextoQualidade> = {}): ContextoQualidade => ({
  acao: 'responder_agora', diretrizes: null, lead: { nome: 'Doce Encanto Confeitaria', nicho: 'confeitaria', cidade: 'Salto', rating: null, avaliacoes: null },
  fatosDaEquipe: '', catalogo: CATALOGO_PADRAO, mensagensAnteriores: [], perguntasAnteriores: [], primeiroContato: false, solucao: 'indefinida', ...extra,
})

describe('V5 · leitura e qualificação', () => {
  it('1. lead sem histórico: frio, primeira abordagem, pergunta leve sobre como funciona hoje', () => {
    const r = avaliar([])
    expect(r.temperatura).toBe('frio')
    expect(r.decisao.acao).toBe('primeira_abordagem')
    expect(r.diretrizes.foco).toBe('situacao')
    expect(r.diretrizes.tipo_pergunta).toBe('alternativas')
    expect(r.diretrizes.hora_de_vender).toBe(false)
  })

  it('2. lead que respondeu só "oi": interesse desconhecido, não morno nem quente', () => {
    const r = avaliar([msg('enviada', 'Oi, tudo bem? Sou o Otávio, da Vera Group.', 5), msg('recebida', 'oi', 4)])
    expect(r.temperatura).toBe('desconhecido')
    expect(r.decisao.acao).toBe('responder_agora')
    expect(r.score_interesse).toBe(15)
  })

  it('3. resposta educada sem interesse comercial: frio', () => {
    const v = msg('enviada', 'Vocês já têm cardápio?', 30), c = msg('recebida', 'Ok, obrigado!', 29)
    const r = avaliar([v, c], { sinais: [{ codigo: 'resposta_educada_sem_interesse', evidencia_id: ev(c) }] })
    expect(r.temperatura).toBe('frio')
  })

  it('4. lead que já possui site: não é recusa; a próxima pergunta é se o site atende', () => {
    const c = msg('recebida', 'Já temos site', 1)
    expect(interpretarFala(c.texto)).toBe('ja_tem')
    const r = avaliar([msg('enviada', 'Vocês têm um site pra mostrar os serviços?', 2), c])
    expect(r.decisao.acao).toBe('responder_agora')
    expect(r.diretrizes.foco).toBe('problema')
    expect(r.diretrizes.tipo_pergunta).toBe('confirmacao')
  })

  it('5. já tem site, mas quer melhorar e pergunta o preço: interesse, e o preço vem primeiro', () => {
    const c = msg('recebida', 'Já tenho site, mas quero melhorar ele. Quanto fica?', 1)
    expect(interpretarFala(c.texto)).toBe('quer_melhorar')
    const r = avaliar([msg('enviada', 'Oi! Vocês têm site?', 3), c], { solucao: 'site_institucional', oferta_id: 'site_completo' })
    expect(r.sinais.map((s) => s.codigo)).toEqual(expect.arrayContaining(['quer_melhorar_atual', 'pediu_preco']))
    expect(r.temperatura).toBe('morno')
    expect(r.decisao.acao).toBe('responder_agora')
    expect(r.diretrizes.informar_preco?.preco).toContain('R$ 2.500')
    expect(r.diretrizes.hora_de_vender).toBe(true)
  })

  it('6. catálogo desatualizado: interesse; a IA não consegue chamar isso de desinteresse', () => {
    const c = msg('recebida', 'Já temos cardápio, mas ele está desatualizado.', 1)
    const a = analisada([c], { sinais: [{ codigo: 'sem_interesse', evidencia_id: ev(c) }] })
    expect(a.analise.sinais).toEqual([])
    expect(a.descartados.join(' ')).toMatch(/contrariado/)
    const r = avaliar([msg('enviada', 'Vocês têm cardápio?', 2), c])
    expect(r.temperatura).toBe('morno')
    expect(r.decisao.acao).not.toBe('encerrar')
  })

  it('7. lead que manda fotos manualmente: a próxima pergunta investiga se isso pesa (sem presumir problema)', () => {
    const c = msg('recebida', 'A gente manda as fotos pelo WhatsApp.', 1)
    const r = avaliar([msg('enviada', 'Quando alguém chama, vocês mandam cardápio ou fotos?', 2), c], {
      sinais: [{ codigo: 'compartilhou_operacao', evidencia_id: ev(c) }],
      memoria: { spin: { situacao: { texto: 'Mostra os produtos mandando fotos no WhatsApp', evidencia_id: ev(c) } } },
    })
    expect(r.diretrizes.foco).toBe('problema')
    expect(r.diretrizes.hora_de_vender).toBe(false)
    expect(r.temperatura).toBe('morno')
  })

  it('8. lead que não identifica nenhuma dificuldade: aceita e não insiste', () => {
    const c = msg('recebida', 'Funciona tranquilo pra gente', 1)
    const r = avaliar([msg('enviada', 'E isso funciona tranquilo ou toma tempo?', 2), c])
    expect(r.decisao.acao).toBe('encerrar')
    expect(r.estado).toBe('sem_oportunidade')
    expect(r.diretrizes.pode_perguntar).toBe(false)
    expect(r.bloqueado).toBe(false)
  })

  it('9. lead que solicita orçamento: a IA não pode trocar a resposta por mais perguntas', async () => {
    const v = msg('enviada', 'Posso te ajudar com alguma coisa?', 3)
    const c = msg('recebida', 'Quanto fica pra fazer uma página pra minha confeitaria?', 1)
    const ia = iaFalsa(
      analiseBase({ sinais: [{ codigo: 'pediu_preco', evidencia_id: ev(c) }, { codigo: 'perguntou_servico', evidencia_id: ev(c) }], solucao: 'landing_page', oferta_id: 'landing_express', acao_sugerida: 'qualificar' }),
      { mensagem_a: 'A Landing Express sai R$ 1.200 e fica pronta em uns 5 dias. Vocês querem mostrar os bolos ou receber encomendas por ela?', mensagem_b: null, melhor_opcao: 'A', justificativa: 'Responde o preço', objetivo: 'Responder' },
    )
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c] }), ia.fn)
    expect(r.recomendacao.decisao.acao).toBe('responder_agora')
    expect(JSON.parse(ia.chamadas[1].user).diretrizes.informar_preco.preco).toBe('R$ 1.200')
    expect(r.qualidade.a?.criterios.pertinencia.ok).toBe(true)
    expect(r.status).toBe('pronto')
  })

  it('10. lead que pergunta preço: morno (não é compra iminente) e a mensagem sem valor exige revisão', () => {
    const c = msg('recebida', 'Quanto custa?', 1)
    const r = avaliar([msg('enviada', 'Fazemos páginas para confeitarias.', 2), c])
    expect(r.temperatura).toBe('morno')
    const q = avaliarMensagem('Legal! Antes, me conta: quantos sabores vocês têm hoje?', qctx({ diretrizes: { ...r.diretrizes, informar_preco: { oferta: 'Landing Express', preco: 'R$ 1.200', prazo: '5 dias', itens: '' } } }))
    expect(q.criterios.pertinencia.ok).toBe(false)
    expect(q.revisar).toBe(true)
  })

  it('11. lead que pede proposta: quente, hora de vender, sem mais diagnóstico', () => {
    const c = msg('recebida', 'Me manda uma proposta pra landing então', 1)
    const r = avaliar([msg('enviada', 'Posso te mostrar como ficaria?', 2), c], { sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(c) }], solucao: 'landing_page', oferta_id: 'landing_express', dados_suficientes: true })
    expect(r.temperatura).toBe('quente')
    expect(r.decisao.acao).toBe('enviar_proposta')
    expect(r.diretrizes.hora_de_vender).toBe(true)
    expect(r.diretrizes.pode_perguntar).toBe(false)
    expect(r.etapa_sugerida).toBe('proposta')
  })

  it('12. lead que quer ver uma demonstração: a conversa passa para mostrar a solução', () => {
    const c = msg('recebida', 'Tem como me mostrar um exemplo de como ficaria?', 1)
    const r = avaliar([msg('enviada', 'Dá pra deixar os sabores num lugar só.', 2), c], {
      sinais: [{ codigo: 'pediu_demonstracao', evidencia_id: ev(c) }, { codigo: 'relatou_dificuldade', evidencia_id: ev(c) }],
      solucao: 'cardapio_digital', oferta_id: 'landing_express', necessidade_identificada: 'Mostrar os sabores sem mandar foto por foto', acao_sugerida: 'oferecer_demonstracao',
    })
    expect(r.temperatura).toBe('morno')
    expect(r.diretrizes.hora_de_vender).toBe(true)
  })

  it('13. "não quero perder tempo" é dificuldade, não recusa', () => {
    const c = msg('recebida', 'Não quero perder mais tempo mandando foto.', 1)
    expect(interpretarFala(c.texto)).toBe('dificuldade')
    const r = avaliar([msg('enviada', 'E isso toma tempo?', 2), c])
    expect(r.sinais.map((s) => s.codigo)).toContain('relatou_dificuldade')
    expect(r.decisao.acao).toBe('responder_agora')
    expect(r.temperatura).toBe('morno')
  })

  it('14. lead que recusa a oferta: agradece e encerra, sem bloquear o contato', async () => {
    const c = msg('recebida', 'Não tenho interesse', 1)
    const r = avaliar([msg('enviada', 'Oi! Posso te mostrar?', 2), c])
    expect(r.decisao.acao).toBe('encerrar')
    expect(r.bloqueado).toBe(false)
    expect(r.diretrizes.pode_perguntar).toBe(false)
    const ia = iaFalsa(analiseBase({ sinais: [{ codigo: 'sem_interesse', evidencia_id: ev(c) }] }), { mensagem_a: 'Tranquilo, obrigado pela resposta! Qualquer coisa, estou por aqui.', mensagem_b: 'Outra', melhor_opcao: 'A', justificativa: '', objetivo: '' })
    const g = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [msg('enviada', 'Oi! Posso te mostrar?', 2), c] }), ia.fn)
    expect(g.redacao?.mensagem_b).toBeNull()
  })

  it('15. lead que pede para não receber mensagens: nada de contato, nem horário, e a IA nem é chamada', async () => {
    const c = msg('recebida', 'Não tenho interesse, não me chamem mais', 1)
    const r = avaliar([msg('enviada', 'Oi!', 2), c])
    expect(r.bloqueado).toBe(true)
    expect(r.decisao.acao).toBe('nao_contatar')
    expect(r.horario).toBeNull()
    const ia = iaFalsa()
    const g = await gerarRecomendacao(geracao({ mensagens: [msg('enviada', 'Oi!', 2), c] }), ia.fn)
    expect(ia.chamadas.length).toBe(0)
    expect(g.status).toBe('nao_contatar')
  })

  it('16. cliente que muda de assunto: a redação é orientada a não retomar o assunto antigo', () => {
    const c = msg('recebida', 'Vocês fazem logo também?', 1)
    const r = avaliar([msg('enviada', 'Vocês já mandam cardápio?', 3), c], { mudou_de_assunto: true, mencionar_assunto_anterior: false })
    expect(r.diretrizes.evitar.join(' ')).toMatch(/Não retome assunto antigo/)
    const q = avaliarMensagem('Voltando ao nosso último assunto, vocês mandam cardápio?', qctx())
    expect(q.criterios.naturalidade.ok).toBe(false)
  })

  it('17. pergunta já respondida não é feita de novo', () => {
    const v = msg('enviada', 'Vocês já têm algum cardápio pra mandar?', 3), c = msg('recebida', 'Temos sim, em PDF.', 2)
    const r = avaliar([v, c], { memoria: { perguntas_respondidas: [{ pergunta: 'Têm cardápio?', resposta: 'Sim, em PDF', evidencia_id: ev(c) }] } })
    expect(r.diretrizes.nao_perguntar.join(' ')).toMatch(/cardápio/)
    const q = avaliarMensagem('Boa! E vocês já têm algum cardápio pra mandar pros clientes?', qctx({ perguntasAnteriores: r.leitura.perguntasFeitas }))
    expect(q.criterios.nao_repeticao.ok).toBe(false)
    expect(q.revisar).toBe(true)
  })

  it('18. vendedor falou por último: aguardar, sem nova mensagem', () => {
    const r = avaliar([msg('recebida', 'Oi', 30), msg('enviada', 'Vocês recebem encomenda pelo Whats?', 3)])
    expect(r.decisao.acao).toBe('aguardar')
    expect(r.decisao.gerarMensagem).toBe(false)
    expect(r.decisao.motivo).toMatch(/pergunta/)
  })

  it('19. cliente que não respondeu: um retorno útil; depois, encerrar em vez de insistir', () => {
    const um = avaliar([msg('enviada', 'Oi! Vocês já mandam cardápio pelo Whats?', 72)])
    expect(um.decisao.acao).toBe('fazer_followup')
    expect(um.diretrizes.pode_perguntar).toBe(false) // a pergunta anterior ficou sem resposta: nada de outra
    const dois = avaliar([msg('enviada', 'Oi! Vocês já mandam cardápio?', 150), msg('enviada', 'Deixo aqui um exemplo de página de confeitaria.', 72)])
    expect(dois.decisao.acao).toBe('encerrar')
  })

  it('20. cliente que combinou retorno: dia certo é compromisso; "semana que vem" é só referência', () => {
    const exato = avaliar([msg('enviada', 'Posso te mostrar?', 30), msg('recebida', 'Me chama amanhã', 28), msg('enviada', 'Combinado!', 27)])
    expect(exato.decisao.acao).toBe('retomar_na_data')
    expect(exato.horario?.confirmado).toBe(true)
    const vago = avaliar([msg('enviada', 'Posso te mostrar?', 30), msg('recebida', 'Me chama semana que vem', 28), msg('enviada', 'Combinado!', 27)])
    expect(vago.horario?.confirmado).toBe(false)
    expect(vago.horario?.rotulo).toMatch(/dia não combinado/)
  })

  it('21. intenção comercial antiga não deixa o lead quente para sempre', () => {
    const c = msg('recebida', 'Me manda uma proposta', 24 * 60)
    const r = avaliar([msg('enviada', 'Posso te mandar uma proposta?', 24 * 61), c, msg('enviada', 'Segue a proposta!', 24 * 59)], { sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(c) }] })
    expect(r.temperatura).not.toBe('quente')
    expect(r.sinais_desconsiderados[0].motivo).toMatch(/45 dias/)
  })

  it('22. lead quente com dúvida pendente: responder já, sem atraso artificial', () => {
    const p = msg('recebida', 'Quero fechar a landing, me manda a proposta', 5)
    const d = msg('recebida', 'E o prazo, fica pronto quando?', 1)
    const noite = new Date('2026-10-22T19:30:00-03:00')
    const r = avaliarLead(entrada({ agora: noite, lead: lead({ etapa: 'proposta' }), mensagens: [msg('enviada', 'Posso te mostrar?', 8), p, d],
      analise: analisada([p, d], { sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(p) }, { codigo: 'discutiu_prazo_ou_condicoes', evidencia_id: ev(d) }] }).analise, analisadoPorIA: true }))
    expect(r.temperatura).toBe('quente')
    expect(r.horario?.tipo).toBe('agora')
    expect(+new Date(r.horario!.inicio)).toBe(+noite)
  })

  it('23. mensagem nova do cliente invalida a sugestão anterior', () => {
    const v = msg('enviada', 'Oi!', 10), c1 = msg('recebida', 'Oi', 9)
    const base = { lead: lead({ etapa: 'respondeu' }), bloqueios: [], config: config() }
    const h1 = hashDoLead({ ...base, mensagens: [v, c1] })
    const c2 = msg('recebida', 'Na verdade quero saber o preço', 1)
    const h2 = hashDoLead({ ...base, mensagens: [v, c1, c2] })
    expect(h1).not.toBe(h2)
    const s = { created_at: new Date(+AGORA - 5 * 3600e3).toISOString(), contexto_hash: h1, prompt_version: PROMPT_VERSION, etapa: 'respondeu', catalogo_versao: config().catalogo_versao }
    expect(motivoObsoleta(s, { ultimaAtividade: c2.enviada_em, etapa: 'respondeu', bloqueado: false, promptVersion: PROMPT_VERSION, catalogoVersao: config().catalogo_versao, hashAtual: h2 })).toBe('mensagem_nova')
    // Mesmo sem mensagem nova, mudar a temperatura definida pela equipe invalida o rascunho.
    const h3 = hashDoLead({ ...base, mensagens: [v, c1], temperaturaManual: 'quente' })
    expect(motivoObsoleta({ ...s, created_at: AGORA.toISOString() }, { ultimaAtividade: c1.enviada_em, etapa: 'respondeu', bloqueado: false, promptVersion: PROMPT_VERSION, catalogoVersao: config().catalogo_versao, hashAtual: h3 })).toBe('contexto')
  })

  it('24. lead sem dados públicos suficientes: uma opção neutra, para revisar', async () => {
    const ia = iaFalsa({ mensagem_a: 'Oi, tudo bem? Sou o Otávio, da Vera Group. Quando alguém chama querendo encomendar na Doce Encanto, vocês mandam um cardápio ou vão mostrando pelo Whats?', mensagem_b: 'Outra opção', melhor_opcao: 'B', justificativa: '', objetivo: '' })
    const r = await gerarRecomendacao(geracao({ lead: lead({ rating: null, avaliacoes: null }) }), ia.fn)
    expect(r.status).toBe('revisar')
    expect(r.redacao?.mensagem_b).toBeNull()
  })
})

describe('V5 · veracidade, repetição e adequação das mensagens', () => {
  it('25. mensagem que cita avaliações que ninguém verificou exige revisão', () => {
    const q = avaliarMensagem('Oi! Vi uns elogios aos bolos de vocês. Vocês já mandam cardápio?', qctx({ primeiroContato: true }))
    expect(q.criterios.veracidade.ok).toBe(false)
    expect(q.revisar).toBe(true)
    // Com nota no cadastro, o elogio tem base.
    const ok = avaliarMensagem('Oi! Vi uns elogios aos bolos de vocês. Vocês já mandam cardápio?', qctx({ primeiroContato: true, lead: { nome: 'Doce Encanto', nicho: 'confeitaria', cidade: 'Salto', rating: 4.9, avaliacoes: 132 } }))
    expect(ok.criterios.veracidade.ok).toBe(true)
  })

  it('26. preço fora do catálogo exige revisão', () => {
    const q = avaliarMensagem('Faço a landing por R$ 900 pra vocês, fechado?', qctx())
    expect(q.criterios.veracidade.nota).toMatch(/R\$ 900/)
    expect(q.revisar).toBe(true)
    expect(avaliarMensagem('A landing sai R$ 1.200 e fica pronta em 5 dias.', qctx()).criterios.veracidade.ok).toBe(true)
  })

  it('31. modelo devolvendo JSON inválido: erro tratável, regras seguem funcionando', async () => {
    const c = msg('recebida', 'Quanto custa?', 1)
    await expect(gerarRecomendacao(geracao({ mensagens: [msg('enviada', 'Oi', 2), c] }), iaFalsa('{ isso não é json').fn)).rejects.toBeInstanceOf(ErroIA)
    expect(avaliar([msg('enviada', 'Oi', 2), c]).decisao.acao).toBe('responder_agora')
  })

  it('34. contato bloqueado reimportado (outro id, telefone em outro formato) continua bloqueado', () => {
    const bloq = [{ telefone_chave: '1180001000', place_id: null, lead_id: 'antigo', motivo: 'Pediu para parar' }]
    const novo = lead({ id: 'novo', whatsapp: null, telefone: '+55 (11) 98000-1000', place_id: 'outro' })
    expect(bloqueioDoLead(novo, bloq)).not.toBeNull()
    expect(avaliarLead(entrada({ lead: novo, bloqueios: bloq })).decisao.acao).toBe('nao_contatar')
  })

  it('35. a mesma pergunta sugerida de novo (de um rascunho não usado) é sinalizada', () => {
    const q = avaliarMensagem('Oi! Vocês já mandam cardápio quando alguém chama?', qctx({ rascunhosAnteriores: ['Oi, tudo bem? Vocês já mandam cardápio quando alguém chama pra encomendar?'] }))
    expect(q.criterios.nao_repeticao.ok).toBe(false)
  })

  it('36. fala do próprio vendedor nunca vira prova de interesse do cliente', () => {
    const v = msg('enviada', 'Quer que eu te mande uma proposta?', 2)
    const c = msg('recebida', 'oi', 1)
    const a = analisada([v, c], { sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(v) }, { codigo: 'quer_iniciar', evidencia_id: ev(v) }] })
    expect(a.analise.sinais).toEqual([])
    expect(a.descartados.join(' ')).toMatch(/não é do cliente/)
    const r = avaliar([v, c], { sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(v) }] })
    expect(r.temperatura).toBe('desconhecido')
  })

  it('37. sinal positivo contradito depois ("não preciso agora") sai da conta', () => {
    const p = msg('recebida', 'Me manda uma proposta', 30)
    const n = msg('recebida', 'Pensei melhor, não preciso de site agora', 1)
    const r = avaliar([msg('enviada', 'Posso te mostrar?', 32), p, msg('enviada', 'Segue!', 29), n], { sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(p) }] })
    expect(r.temperatura).toBe('frio')
    expect(r.sinais_desconsiderados.map((s) => s.codigo)).toContain('pediu_proposta')
    expect(r.decisao.acao).toBe('encerrar')
    expect(r.bloqueado).toBe(false) // "não preciso agora" não é pedido para parar
  })

  it('38. lead satisfeito com o que já tem: não insiste na venda e a adequação cai', () => {
    const c = msg('recebida', 'Já temos cardápio e atende bem', 1)
    const r = avaliar([msg('enviada', 'Vocês têm cardápio?', 2), c])
    expect(interpretarFala(c.texto)).toBe('ja_tem_satisfeito')
    expect(r.decisao.acao).toBe('encerrar')
    expect(r.score_adequacao).toBeLessThan(40)
  })

  it('39. oportunidade de landing page, não de site: oferta incompatível é recusada e a mensagem é sinalizada', () => {
    const c = msg('recebida', 'Quero divulgar a promoção de Natal', 1)
    const errado = analisada([c], { solucao: 'landing_page', oferta_id: 'site_completo' })
    expect(errado.analise.oferta_id).toBeNull()
    expect(analisada([c], { solucao: 'landing_page', oferta_id: 'landing_express' }).analise.oferta_id).toBe('landing_express')
    const q = avaliarMensagem('Nesse caso a gente faz um site completo com várias páginas. Quer que eu te mostre?', qctx({ solucao: 'landing_page' }))
    expect(q.criterios.adequacao.ok).toBe(false)
  })

  it('40. a melhor decisão é não enviar nada: nenhuma redação é pedida à IA', async () => {
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'contatado' }), mensagens: [msg('enviada', 'Oi! Vocês fazem bolo por encomenda?', 3)] }), iaFalsa(analiseBase()).fn)
    expect(r.recomendacao.decisao.acao).toBe('aguardar')
    expect(r.redacao).toBeNull()
    expect(r.status).toBe('sem_mensagem')
  })
})

describe('V5 · interpretação de frases ambíguas', () => {
  it.each([
    ['Já tenho site, mas quero melhorar ele. Quanto fica?', 'quer_melhorar'],
    ['Já temos cardápio, mas ele está desatualizado.', 'quer_melhorar'],
    ['Não quero perder mais tempo mandando foto.', 'dificuldade'],
    ['Não preciso de site agora.', 'sem_necessidade_agora'],
    ['Não tenho interesse, não me chamem mais.', 'parar'],
    ['pode me tirar da lista', 'parar'],
    ['não manda o orçamento ainda, deixa eu ver com meu sócio', 'pediu_tempo'],
    ['nao me chama agora to atendendo', null],
    ['Quanto custa?', null],
  ])('"%s" → %s', (frase, tipo) => {
    expect(interpretarFala(frase)).toBe(tipo)
  })

  it('o bloco de mensagens do cliente é lido junto ("Já temos." + "Mas tá desatualizado")', () => {
    const l = lerConversa([msg('enviada', 'Vocês têm cardápio?', 3), msg('recebida', 'Já temos cardápio.', 2), msg('recebida', 'Mas tá bem desatualizado', 1)], AGORA)
    expect(l.falaAtual?.tipo).toBe('quer_melhorar')
  })
})
