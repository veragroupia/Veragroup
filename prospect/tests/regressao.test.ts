import { describe, expect, it } from 'vitest'
import { avaliarLead, ErroIA, gerarRecomendacao } from '../supabase/functions/_shared/inteligencia/motor.ts'
import { validarAnalise, validarRedacao } from '../supabase/functions/_shared/inteligencia/contrato.ts'
import { bloqueioDoLead, dataDeRetorno, lerConversa, telefoneChave } from '../supabase/functions/_shared/inteligencia/conversa.ts'
import { CATALOGO_PADRAO } from '../supabase/functions/_shared/inteligencia/catalogo.ts'
import { motivoObsoleta } from '../supabase/functions/_shared/inteligencia/validade.ts'
import { recomendarHorario } from '../supabase/functions/_shared/inteligencia/horario.ts'
import { lerConfig } from '../supabase/functions/_shared/inteligencia/config.ts'
import { AGORA, analiseBase, config, entrada, ev, evidencias, geracao, iaFalsa, lead, msg } from './apoio.ts'

/* Regressão: cenários da V4 que continuam valendo na V5 (com os ajustes de comportamento pedidos na V5). */

const analiseCom = (sinais: { codigo: string; evidencia_id: string }[], extra: object = {}) =>
  validarAnalise(analiseBase({ sinais, ...extra }), { evidencias: evidencias(sinais.map((s) => s.evidencia_id).concat(['lead.nome', 'observacao_vendedor'])), catalogo: CATALOGO_PADRAO }).analise

describe('temperatura e pontuação', () => {
  it('1. lead novo sem resposta é frio, com confiança baixa e primeira abordagem', () => {
    const r = avaliarLead(entrada())
    expect(r.temperatura).toBe('frio')
    expect(r.score_interesse).toBe(0)
    expect(r.confianca).toBe('baixa')
    expect(r.decisao.acao).toBe('primeira_abordagem')
    expect(r.decisao.gerarMensagem).toBe(true)
  })

  it('2. empresa com perfil favorável, mas sem interação, não é quente', () => {
    const analise = analiseCom([{ codigo: 'necessidade_compativel', evidencia_id: 'observacao_vendedor' }])
    const r = avaliarLead(entrada({ lead: lead({ site: null, rating: 4.9, avaliacoes: 400 }), analise, analisadoPorIA: true }))
    expect(r.temperatura).toBe('frio')
    expect(r.score_adequacao).toBeGreaterThan(40)
    expect(r.score_interesse).toBe(0)
  })

  it('3. resposta educada não vira lead quente', () => {
    const v = msg('enviada', 'Oi, tudo bem? Vocês já têm cardápio?', 30)
    const c = msg('recebida', 'Ok, obrigado!', 29)
    const semIA = avaliarLead(entrada({ mensagens: [v, c] }))
    expect(semIA.temperatura).not.toBe('quente')
    const comIA = avaliarLead(entrada({ mensagens: [v, c], analise: analiseCom([{ codigo: 'resposta_educada_sem_interesse', evidencia_id: ev(c) }]), analisadoPorIA: true }))
    expect(comIA.temperatura).toBe('frio')
  })

  it('4. cliente contou uma dificuldade: qualificação avança e a adequação sobe', () => {
    const v = msg('enviada', 'Como vocês mostram os sabores hoje?', 5)
    const c = msg('recebida', 'Pelo Whats mesmo, mando foto uma por uma e perco muito tempo', 4)
    const analise = analiseCom([{ codigo: 'relatou_dificuldade', evidencia_id: ev(c) }, { codigo: 'compartilhou_operacao', evidencia_id: ev(c) }], { necessidade_identificada: 'Organizar a apresentação dos sabores' })
    const r = avaliarLead(entrada({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c], analise, analisadoPorIA: true }))
    expect(r.temperatura).toBe('morno')
    expect(r.score_interesse).toBe(15 + 15 + 10)
    expect(r.score_adequacao).toBe(50)
    expect(r.estagio).toBe('diagnostico')
    expect(r.necessidade).toContain('sabores')
  })

  it('5. pedido de proposta é quente e sugere mover para Proposta', async () => {
    const v = msg('enviada', 'Posso te mostrar como ficaria?', 3)
    const c = msg('recebida', 'Pode sim, me manda uma proposta pra landing de Natal', 2)
    const ia = iaFalsa(
      analiseBase({ sinais: [{ codigo: 'pediu_proposta', evidencia_id: ev(c) }], solucao: 'landing_page', oferta_id: 'landing_express', acao_sugerida: 'enviar_proposta' }),
      { mensagem_a: 'Combinado! A Landing Express sai R$ 1.200 e fica pronta em 5 dias. Te mando a proposta por aqui ainda hoje, pode ser?', mensagem_b: null, melhor_opcao: 'A', justificativa: 'Pedido direto', objetivo: 'Enviar proposta' },
    )
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c] }), ia.fn)
    expect(r.recomendacao.temperatura).toBe('quente')
    expect(r.recomendacao.decisao.acao).toBe('enviar_proposta')
    expect(r.recomendacao.etapa_sugerida).toBe('proposta')
    expect(r.status).toBe('pronto')
  })

  it('6. pergunta de preço é morna e a redação recebe o preço do catálogo', async () => {
    const v = msg('enviada', 'Pensei numa página com os sabores. Faz sentido?', 3)
    const c = msg('recebida', 'Quanto custa?', 1)
    const ia = iaFalsa(
      analiseBase({ sinais: [{ codigo: 'pediu_preco', evidencia_id: ev(c) }], solucao: 'cardapio_digital', oferta_id: 'landing_express', acao_sugerida: 'responder_agora' }),
      { mensagem_a: 'A página sai R$ 1.200 e fica pronta em uns 5 dias. Vocês querem mostrar todos os sabores ou só os de encomenda?', mensagem_b: null, melhor_opcao: 'A', justificativa: 'Respondeu o preço', objetivo: 'Responder preço' },
    )
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c] }), ia.fn)
    expect(r.recomendacao.temperatura).toBe('morno')
    expect(r.recomendacao.decisao.acao).toBe('responder_agora')
    const entradaRedacao = JSON.parse(ia.chamadas[1].user)
    expect(entradaRedacao.analise.oferta.preco).toBe('R$ 1.200')
    expect(entradaRedacao.catalogo.map((o: { id: string }) => o.id)).toContain('landing_express')
  })
})

describe('leitura da conversa e decisão', () => {
  it('7. assunto já respondido vai para a redação como resolvido, para não ser perguntado de novo', async () => {
    const v = msg('enviada', 'Vocês já têm algum catálogo com os sabores?', 2)
    const c = msg('recebida', 'Temos sim.', 1)
    const ia = iaFalsa(
      analiseBase({ sinais: [{ codigo: 'compartilhou_operacao', evidencia_id: ev(c) }], assuntos_resolvidos: ['Se têm catálogo de sabores: sim'], acao_sugerida: 'qualificar' }),
      { mensagem_a: 'Ahh, boa! E hoje ele atende bem o que vocês precisam?', mensagem_b: null, melhor_opcao: 'A', justificativa: 'Aprofunda sem repetir', objetivo: 'Qualificar' },
    )
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c] }), ia.fn)
    const entradaRedacao = JSON.parse(ia.chamadas[1].user)
    expect(entradaRedacao.diretrizes.nao_perguntar).toContain('Se têm catálogo de sabores: sim')
    expect(entradaRedacao.diretrizes.nao_perguntar).toContain('Vocês já têm algum catálogo com os sabores?')
    expect(ia.chamadas[1].system).toContain('Não repita a apresentação')
    expect(r.redacao?.mensagem_a).not.toMatch(/já têm algum catálogo/)
  })

  it('8. a Vera falou por último e aguarda: recomenda aguardar e não escreve nada', async () => {
    const v1 = msg('enviada', 'Oi! Vocês fazem bolo por encomenda?', 20)
    const ia = iaFalsa(analiseBase())
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'contatado' }), mensagens: [v1] }), ia.fn)
    expect(r.recomendacao.decisao.acao).toBe('aguardar')
    expect(r.recomendacao.decisao.gerarMensagem).toBe(false)
    expect(r.recomendacao.decisao.condicaoRetomar).toBeTruthy()
    expect(r.redacao).toBeNull()
    expect(r.status).toBe('sem_mensagem')
    expect(ia.chamadas.length).toBe(1) // só a análise; nenhuma redação
  })

  it('9. cliente mudou de assunto: a retomada do assunto antigo é sinalizada', () => {
    const r = validarRedacao({ mensagem_a: 'Voltando à nossa conversa sobre o catálogo, e o orçamento de Natal?', mensagem_b: null, melhor_opcao: 'A', justificativa: '', objetivo: '' },
      { permitido: true, maxOpcoes: 2, permitirRetomada: false })
    expect(r.alertas.join(' ')).toMatch(/voltando a nossa conversa/)
    const ok = validarRedacao({ mensagem_a: 'Voltando à nossa conversa: o prazo continua?', mensagem_b: null, melhor_opcao: 'A', justificativa: '', objetivo: '' },
      { permitido: true, maxOpcoes: 2, permitirRetomada: true })
    expect(ok.alertas).toEqual([])
  })

  it('10. data pedida pelo cliente é respeitada', () => {
    const v = msg('enviada', 'Posso te mostrar uma ideia de cardápio?', 30)
    const c = msg('recebida', 'Agora tá corrido, me chama semana que vem', 28)
    const conf = msg('enviada', 'Combinado, te chamo semana que vem!', 27)
    // segunda-feira seguinte à mensagem do cliente (quarta 21/10) = 26/10
    expect(dataDeRetorno(c.texto, new Date(c.enviada_em))?.toISOString()).toBe(new Date('2026-10-26T09:00:00-03:00').toISOString())
    const r = avaliarLead(entrada({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c, conf] }))
    expect(r.decisao.acao).toBe('retomar_na_data')
    expect(r.decisao.gerarMensagem).toBe(false)
    expect(r.estado).toBe('retorno_combinado')
    expect(r.horario?.tipo).toBe('compromisso')
    // V5: "semana que vem" não é dia combinado. A data é só referência.
    expect(r.horario?.confirmado).toBe(false)
    expect(r.horario?.confianca).toBe('media')
  })

  it('11. pedido para não receber mensagens bloqueia tudo, sem chamar a IA', async () => {
    const v = msg('enviada', 'Oi! Sou o Otávio, da Vera Group.', 10)
    const c = msg('recebida', 'Não tenho interesse, não me chamem mais', 9)
    const ia = iaFalsa()
    const r = await gerarRecomendacao(geracao({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c] }), ia.fn)
    expect(r.status).toBe('nao_contatar')
    expect(r.recomendacao.decisao.acao).toBe('nao_contatar')
    expect(r.recomendacao.horario).toBeNull()
    expect(r.redacao).toBeNull()
    expect(ia.chamadas.length).toBe(0)
  })

  it('"não tenho interesse" sem pedir para parar encerra a oportunidade, mas não bloqueia o contato', () => {
    const v = msg('enviada', 'Vocês já têm cardápio digital?', 10)
    const c = msg('recebida', 'Não temos interesse no momento', 9)
    const l = lerConversa([v, c], AGORA)
    expect(l.pediuParaParar).toBeNull()
    expect(l.semInteresse).not.toBeNull()
    const r = avaliarLead(entrada({ lead: lead({ etapa: 'respondeu' }), mensagens: [v, c] }))
    expect(r.bloqueado).toBe(false)
    expect(r.decisao.acao).toBe('encerrar')
    expect(r.estado).toBe('sem_oportunidade')
  })

  it('12. empresa com site satisfatório: nenhuma oferta, adequação cai', () => {
    const c = msg('recebida', 'Já temos site e funciona bem pra gente', 2)
    const a = validarAnalise(analiseBase({
      sinais: [{ codigo: 'ja_tem_solucao_satisfatoria', evidencia_id: ev(c) }],
      solucao: 'nenhuma', oferta_id: 'site_completo',
    }), { evidencias: evidencias([ev(c)]), catalogo: CATALOGO_PADRAO })
    expect(a.analise.oferta_id).toBeNull()
    expect(a.descartados.join(' ')).toMatch(/site_completo/)
    const r = avaliarLead(entrada({ mensagens: [msg('enviada', 'Oi!', 3), c], analise: a.analise, analisadoPorIA: true }))
    expect(r.score_adequacao).toBeLessThan(40)
    expect(r.oferta_id).toBeNull()
  })
})

describe('horário recomendado', () => {
  it('13. sem histórico, a janela é estimativa de baixa confiança', () => {
    const j = recomendarHorario({ agora: AGORA, config: config(), bloqueado: false, retornoEm: null, leadAguarda: false, respostas: [], nicho: 'confeitaria' })
    expect(j?.tipo).toBe('segmento')
    expect(j?.confianca).toBe('baixa')
    expect(j?.confirmado).toBe(false)
  })

  it('14. respostas consistentes no mesmo horário viram padrão do cliente', () => {
    const respostas = [1, 2, 8, 9].map((d) => ({ em: new Date(`2026-10-${String(22 - d).padStart(2, '0')}T15:20:00-03:00`).toISOString() }))
    const j = recomendarHorario({ agora: AGORA, config: config(), bloqueado: false, retornoEm: null, leadAguarda: false, respostas, nicho: 'confeitaria' })
    expect(j?.tipo).toBe('historico')
    expect(j?.confianca).toBe('media')
    expect(new Date(j!.inicio).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }).startsWith('15')).toBe(true)
  })

  it('uma resposta só não define padrão', () => {
    const j = recomendarHorario({ agora: AGORA, config: config(), bloqueado: false, retornoEm: null, leadAguarda: false, respostas: [{ em: '2026-10-20T19:00:00-03:00' }], nicho: null })
    expect(j?.tipo).toBe('generico')
    expect(j?.confianca).toBe('baixa')
  })

  it('cliente esperando resposta: agora, sem esperar a janela de prospecção', () => {
    const j = recomendarHorario({ agora: AGORA, config: config(), bloqueado: false, retornoEm: null, leadAguarda: true, respostas: [], nicho: 'confeitaria' })
    expect(j?.tipo).toBe('agora')
    expect(+new Date(j!.inicio)).toBe(+AGORA) // 13h está fora da janela de prospecção, mas responder não espera
  })

  it('prospecção nunca vai para fim de semana nem fora das janelas permitidas', () => {
    const sexta18h = new Date('2026-10-23T18:00:00-03:00')
    const j = recomendarHorario({ agora: sexta18h, config: config(), bloqueado: false, retornoEm: null, leadAguarda: false, respostas: [], nicho: null })
    expect(new Date(j!.inicio).toISOString()).toBe(new Date('2026-10-26T09:00:00-03:00').toISOString())
  })

  it('resposta a cliente tarde da noite fica para as 8h do dia seguinte', () => {
    const sexta22h = new Date('2026-10-23T22:00:00-03:00')
    const j = recomendarHorario({ agora: sexta22h, config: config(), bloqueado: false, retornoEm: null, leadAguarda: true, respostas: [], nicho: null })
    expect(new Date(j!.inicio).toISOString()).toBe(new Date('2026-10-24T08:00:00-03:00').toISOString())
  })

  it('contato bloqueado não recebe horário', () => {
    expect(recomendarHorario({ agora: AGORA, config: config(), bloqueado: true, retornoEm: null, leadAguarda: true, respostas: [], nicho: null })).toBeNull()
  })
})

describe('validade das sugestões', () => {
  const ctx = { ultimaAtividade: null, etapa: 'respondeu', bloqueado: false, promptVersion: 'vera-sales-v4', catalogoVersao: 'site-2026-10' }
  it('15. sugestão anterior à última mensagem fica desatualizada', () => {
    const s = { created_at: '2026-10-22T10:00:00-03:00', etapa: 'respondeu', prompt_version: 'vera-sales-v4', catalogo_versao: 'site-2026-10' }
    expect(motivoObsoleta(s, ctx)).toBeNull()
    expect(motivoObsoleta(s, { ...ctx, ultimaAtividade: '2026-10-22T11:00:00-03:00' })).toBe('mensagem_nova')
    expect(motivoObsoleta(s, { ...ctx, etapa: 'proposta' })).toBe('etapa_mudou')
    expect(motivoObsoleta(s, { ...ctx, bloqueado: true })).toBe('bloqueado')
    expect(motivoObsoleta({ ...s, enviada_confirmada_em: '2026-10-22T10:05:00-03:00' }, ctx)).toBe('ja_enviada')
  })
})

describe('dados insuficientes, contrato e falhas da IA', () => {
  it('17. lead só com nome e nicho: rascunho neutro para revisar, sem análise inventada', async () => {
    const ia = iaFalsa({ mensagem_a: 'Oi! Sou o Otávio, da Vera Group. Vocês já têm uma página com os produtos ou mostram tudo pelo WhatsApp?', mensagem_b: 'Outra versão qualquer', melhor_opcao: 'B', justificativa: 'Neutra', objetivo: 'Qualificar' })
    const r = await gerarRecomendacao(geracao(), ia.fn)
    expect(ia.chamadas.length).toBe(1) // sem material, a análise nem roda
    expect(r.status).toBe('revisar')
    expect(r.redacao?.mensagem_b).toBeNull() // só um rascunho neutro
    const entradaRedacao = JSON.parse(ia.chamadas[0].user)
    expect(entradaRedacao.analise.dados_suficientes).toBe(false)
    expect(entradaRedacao.analise.fatos_verificados).toEqual([])
  })

  it('18. JSON inválido da IA vira erro tratável', async () => {
    const c = msg('recebida', 'Quanto custa?', 1)
    const ia = iaFalsa('isso não é json')
    await expect(gerarRecomendacao(geracao({ mensagens: [msg('enviada', 'Oi', 2), c] }), ia.fn)).rejects.toBeInstanceOf(ErroIA)
  })

  it('a IA não consegue inventar evidência, sinal ou oferta', () => {
    const c = msg('recebida', 'Oi', 1)
    const a = validarAnalise(analiseBase({
      sinais: [
        { codigo: 'pediu_proposta', evidencia_id: 'msg_inventada' },
        { codigo: 'respondeu', evidencia_id: ev(c) },
        { codigo: 'sinal_que_nao_existe', evidencia_id: ev(c) },
        { codigo: 'pediu_preco', evidencia_id: 'lead.nicho' },
      ],
      oferta_id: 'plano_premium', solucao: 'landing_page',
      conhecido: [{ fato: 'Fatura R$ 50 mil por mês', fonte: 'cliente', evidencia_id: null }],
    }), { evidencias: evidencias([ev(c), 'lead.nicho']), catalogo: CATALOGO_PADRAO })
    expect(a.analise.sinais).toEqual([])
    expect(a.analise.oferta_id).toBeNull()
    expect(a.analise.conhecido[0].fonte).toBe('hipotese')
  })

  it('19. temperatura manual da equipe prevalece, e a calculada continua visível', () => {
    const r = avaliarLead(entrada({ temperaturaManual: 'quente' }))
    expect(r.temperatura).toBe('quente')
    expect(r.temperatura_calculada).toBe('frio')
    expect(r.temperatura_manual).toBe('quente')
  })

  it('21. duas opções quase iguais: a B é descartada', () => {
    const r = validarRedacao({
      mensagem_a: 'Oi, tudo bem? Vocês já mandam algum cardápio quando pedem bolo, ou vão mostrando pelo Whats?',
      mensagem_b: 'Oi, tudo bem? Vocês já mandam cardápio quando pedem bolo ou mostram pelo Whats mesmo?',
      melhor_opcao: 'B', justificativa: '', objetivo: '',
    }, { permitido: true, maxOpcoes: 2, permitirRetomada: false })
    expect(r.mensagem_b).toBeNull()
    expect(r.melhor_opcao).toBe('A')
  })

  it('22. quando não cabe mensagem, a saída é vazia mesmo que a IA escreva', () => {
    const r = validarRedacao({ mensagem_a: 'Oi, conseguiu ver minha mensagem?', mensagem_b: null, melhor_opcao: 'A', justificativa: '', objetivo: '' },
      { permitido: false, maxOpcoes: 2, permitirRetomada: false })
    expect(r.mensagem_a).toBeNull()
    expect(r.melhor_opcao).toBeNull()
  })

  it('23. proposta já enviada: aguarda e depois faz follow-up sem reenviar', () => {
    const v = msg('enviada', 'Te mandei a proposta, qualquer dúvida me fala.', 20)
    const cedo = avaliarLead(entrada({ lead: lead({ etapa: 'proposta' }), mensagens: [v], propostaEnviadaEm: v.enviada_em }))
    expect(cedo.decisao.acao).toBe('aguardar')
    expect(cedo.decisao.motivo).toMatch(/proposta/i)
    const v2 = msg('enviada', 'Te mandei a proposta, qualquer dúvida me fala.', 80)
    const depois = avaliarLead(entrada({ lead: lead({ etapa: 'proposta' }), mensagens: [v2], propostaEnviadaEm: v2.enviada_em }))
    expect(depois.decisao.acao).toBe('fazer_followup')
    expect(depois.decisao.motivo).toMatch(/sem reenviar/)
  })

  it('24. contato bloqueado continua bloqueado se for reimportado com outro id', () => {
    const bloqueios = [{ telefone_chave: telefoneChave('(11) 98000-1000'), place_id: null, lead_id: 'lead-antigo', motivo: 'Pediu para não ser contatado' }]
    expect(telefoneChave('+55 11 98000-1000')).toBe(telefoneChave('11980001000'))
    const novo = lead({ id: 'lead-novo', whatsapp: '5511980001000', telefone: null })
    expect(bloqueioDoLead(novo, bloqueios)).not.toBeNull()
    const r = avaliarLead(entrada({ lead: novo, bloqueios }))
    expect(r.decisao.acao).toBe('nao_contatar')
    const porPlace = avaliarLead(entrada({ lead: lead({ id: 'x', whatsapp: '5511999990000', place_id: 'place-9' }), bloqueios: [{ telefone_chave: null, place_id: 'place-9', lead_id: null, motivo: 'Equipe' }] }))
    expect(porPlace.bloqueado).toBe(true)
  })

  it('25. IA fora do ar: erro claro, e as regras continuam funcionando sem ela', async () => {
    const c = msg('recebida', 'Quanto custa?', 1)
    const ia = iaFalsa(new Error('timeout'))
    await expect(gerarRecomendacao(geracao({ mensagens: [msg('enviada', 'Oi', 2), c] }), ia.fn)).rejects.toThrow(/IA indisponível/)
    const r = avaliarLead(entrada({ mensagens: [msg('enviada', 'Oi', 2), c] }))
    expect(r.decisao.acao).toBe('responder_agora')
    expect(r.temperatura).toBe('morno')
  })

  it('reaproveita a análise quando o contexto não mudou (sem nova chamada de análise)', async () => {
    const v = msg('enviada', 'Oi', 50), c = msg('recebida', 'Quanto custa?', 1)
    const ia1 = iaFalsa(analiseBase({ sinais: [{ codigo: 'pediu_preco', evidencia_id: ev(c) }] }))
    const r1 = await gerarRecomendacao(geracao({ mensagens: [v, c], modo: 'analisar' }), ia1.fn)
    const ia2 = iaFalsa()
    const r2 = await gerarRecomendacao(geracao({ mensagens: [v, c], modo: 'analisar', cache: { analise: r1.analise, contexto_hash: r1.cache_chave } }), ia2.fn)
    expect(ia2.chamadas.length).toBe(0)
    expect(r2.analiseReaproveitada).toBe(true)
    expect(r2.recomendacao.temperatura).toBe(r1.recomendacao.temperatura)
  })
})

describe('configuração', () => {
  it('ignora valores inválidos e mantém os padrões', () => {
    const c = lerConfig({ formalidade: 'gritando', limite_followups: 99, janelas: [{ inicio: '18:00', fim: '09:00' }], fuso: 'America/Sao_Paulo', emojis: 'moderado' })
    expect(c.formalidade).toBe('informal')
    expect(c.limite_followups).toBe(3)
    expect(c.janelas.length).toBe(2)
    expect(c.emojis).toBe('moderado')
  })
})
