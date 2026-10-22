import { admin, autorizar, claude, cors, json } from "./util.ts";
import { lerConfig } from "../_shared/inteligencia/config.ts";
import { ErroIA, gerarRecomendacao, idEvidencia } from "../_shared/inteligencia/motor.ts";
import type { Analise } from "../_shared/inteligencia/contrato.ts";
import type { Bloqueio, Msg, Temperatura } from "../_shared/inteligencia/tipos.ts";

/* Vera Sales Intelligence (vera-sales-v4).
   Corpo: { lead_id, observacao?, modo?: "analisar" | "gerar", forcar?: boolean }
   - "analisar" atualiza a classificação do lead (temperatura, scores, próxima ação, horário) sem escrever mensagem.
   - "gerar" faz o mesmo e, se as regras permitirem, escreve as opções de mensagem.
   Regras de bloqueio, aguardar e retorno combinado rodam antes da IA; se não há o que escrever, a IA de redação nem é chamada.
   Se o contexto não mudou desde a última análise, a análise é reaproveitada (sem nova chamada). */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();
  const quem = await autorizar(req, db);
  if (!quem) return json({ erro: "não autorizado" }, 401);

  let corpo: { lead_id?: string; observacao?: unknown; modo?: unknown; forcar?: unknown };
  try { corpo = await req.json(); } catch { return json({ erro: "corpo inválido" }, 400); }
  const lead_id = corpo.lead_id;
  if (typeof lead_id !== "string") return json({ erro: "lead_id obrigatório" }, 400);
  const modo = corpo.modo === "analisar" ? "analisar" : "gerar";
  const forcar = corpo.forcar === true;
  const observacao = typeof corpo.observacao === "string" && corpo.observacao.trim() ? corpo.observacao.trim().slice(0, 2000) : null;

  try {
    const { data: lead } = await db.from("leads").select("*").eq("id", lead_id).single();
    if (!lead) return json({ erro: "lead não encontrado" }, 404);

    const [msgs, intel, bloqueios, cfg, proposta] = await Promise.all([
      db.from("mensagens").select("id, direcao, texto, enviada_em, confirmada, origem").eq("lead_id", lead_id)
        .order("enviada_em", { ascending: false }).limit(80),
      db.from("lead_inteligencia").select("*").eq("lead_id", lead_id).maybeSingle(),
      db.from("contatos_bloqueados").select("telefone_chave, place_id, lead_id, motivo"),
      db.from("config_comercial").select("*").eq("id", 1).maybeSingle(),
      db.from("propostas").select("status, enviada_em").eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (msgs.error) throw msgs.error;
    if (intel.error || bloqueios.error) {
      return json({ erro: "Falta aplicar a migration 0004_inteligencia_comercial no banco." }, 500);
    }

    const config = lerConfig(cfg.data);
    const emailVendedor = quem === "sistema" ? lead.responsavel : quem;
    const { data: membro } = emailVendedor
      ? await db.from("equipe").select("nome").eq("email", emailVendedor).maybeSingle()
      : { data: null };

    const i = intel.data;
    const cache = i?.analise && i?.contexto_hash ? { analise: i.analise as Analise, contexto_hash: i.contexto_hash as string } : null;
    const p = proposta.data;

    const res = await gerarRecomendacao({
      agora: new Date(),
      config,
      lead,
      mensagens: (msgs.data ?? []) as Msg[],
      bloqueios: (bloqueios.data ?? []) as Bloqueio[],
      liberadoEm: i?.contato_liberado_em ?? null,
      retornoManual: i?.retorno_em ?? null,
      temperaturaManual: (i?.temperatura_manual ?? null) as Temperatura | null,
      propostaEnviadaEm: p?.status === "enviada" ? p.enviada_em : null,
      propostaStatus: p?.status ?? null,
      vendedor: membro?.nome?.split(" ")[0] ?? null,
      observacao,
      modo,
      forcar,
      cache,
    }, (system, user) => claude(db, system, user, 2000));

    const r = res.recomendacao;
    const agora = new Date().toISOString();

    // Classificação atual. As colunas de correção manual não são tocadas.
    const { error: eIntel } = await db.from("lead_inteligencia").upsert({
      lead_id,
      temperatura: r.temperatura_calculada,
      score_interesse: r.score_interesse,
      score_adequacao: r.score_adequacao,
      confianca: r.confianca,
      estado: r.estado,
      estagio: r.estagio,
      necessidade: r.necessidade,
      solucao: r.solucao,
      oferta_id: r.oferta_id,
      sinais: r.sinais,
      conhecido: res.analise.conhecido,
      desconhecido: r.desconhecido,
      pergunta_prioritaria: r.pergunta_prioritaria,
      proxima_acao: r.decisao.acao,
      motivo: r.decisao.motivo,
      janela: r.horario,
      analise: res.analise,
      resumo: res.analise.resumo || null,
      contexto_hash: res.contexto_hash,
      ultima_mensagem_id: res.ultima_mensagem_id,
      prompt_version: res.prompt_version,
      modelo: res.modelo ?? i?.modelo ?? null,
      analisado_em: agora,
      updated_at: agora,
    }, { onConflict: "lead_id" });
    if (eIntel) throw eIntel;

    await db.from("lead_inteligencia_historico").insert({
      lead_id, origem: res.analiseReaproveitada ? "regra" : "ia",
      temperatura: r.temperatura_calculada, score_interesse: r.score_interesse, score_adequacao: r.score_adequacao,
      confianca: r.confianca, proxima_acao: r.decisao.acao, motivo: r.decisao.motivo,
      detalhe: { sinais: r.sinais.map((s) => s.codigo), descartados: res.descartados, modo }, prompt_version: res.prompt_version, usuario: quem,
    });

    let rascunho = null;
    if (modo === "gerar") {
      const red = res.redacao;
      const hipoteses = res.analise.conhecido.filter((f) => f.fonte === "hipotese").map((f) => f.fato);
      const { data, error } = await db.from("rascunhos_ia").insert({
        lead_id,
        status: res.status,
        objetivo_da_etapa: red?.objetivo || null,
        evidencias_usadas: r.sinais.filter((s) => s.evidencia_id).map((s) => ({ id: s.evidencia_id, fato: s.detalhe })),
        hipotese_comercial: hipoteses.length ? `Hipótese: ${hipoteses.join("; ")}` : null,
        oferta_id: r.oferta_id,
        informacoes_faltantes: r.desconhecido,
        mensagem_a: red?.mensagem_a ?? null,
        mensagem_b: red?.mensagem_b ?? null,
        justificativa_curta: red?.justificativa || r.decisao.motivo,
        proxima_acao_sugerida: r.decisao.condicaoRetomar ? `${r.decisao.motivo} ${r.decisao.condicaoRetomar}` : r.decisao.motivo,
        observacao_vendedor: observacao,
        vendedor: emailVendedor,
        modelo: res.modelo,
        acao: r.decisao.acao,
        motivo: r.decisao.motivo,
        temperatura: r.temperatura,
        score_interesse: r.score_interesse,
        score_adequacao: r.score_adequacao,
        confianca: r.confianca,
        melhor_opcao: red?.melhor_opcao ?? null,
        mencionar_assunto_anterior: res.analise.mencionar_assunto_anterior,
        horario: r.horario,
        condicao_retomar: r.decisao.condicaoRetomar,
        alertas: red?.alertas ?? [],
        contexto_hash: res.contexto_hash,
        ultima_mensagem_id: res.ultima_mensagem_id,
        etapa: lead.etapa,
        prompt_version: res.prompt_version,
        catalogo_versao: config.catalogo_versao,
      }).select().single();
      if (error) throw error;
      rascunho = data;
    }

    await db.from("atividades").insert({ lead_id, tipo: modo === "gerar" ? "rascunho_ia" : "analise_ia", detalhe: { status: res.status, acao: r.decisao.acao }, usuario: quem });
    return json({ ok: true, rascunho, recomendacao: r, reaproveitada: res.analiseReaproveitada, evidencia_ids: Object.fromEntries((msgs.data ?? []).map((m: { id: string }) => [idEvidencia(m.id), m.id])) });
  } catch (e) {
    if (e instanceof ErroIA) return json({ erro: e.message, etapa: e.etapa }, 502);
    return json({ erro: String((e as Error)?.message ?? e) }, 500);
  }
});
