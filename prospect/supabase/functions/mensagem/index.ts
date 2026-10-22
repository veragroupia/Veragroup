import { admin, autorizar, claude, cors, extrairJson, json } from "./util.ts";
import { COMO_LER_A_ENTRADA, PROMPT_EQUIPE } from "./prompt.ts";

// Catálogo aprovado: a tabela de preços do site (index.html, seção 04 Preços).
// Ao mudar preço no site, mude aqui também. Nada fora desta lista vira oferta.
const CATALOGO = [
  { id: "landing_express", nome: "Landing Express", preco: "R$ 1.200", prazo: "5 dias",
    itens: "Uma página completa para o negócio ser encontrado: serviços, fotos, localização e botão de WhatsApp." },
  { id: "landing_whatsapp", nome: "Landing com WhatsApp automático", preco: "R$ 1.800", prazo: "7 dias",
    itens: "A página e um atendimento automático que responde as dúvidas mais comuns e encaminha o cliente." },
  { id: "site_completo", nome: "Site completo", preco: "R$ 2.500 a R$ 4.000, conforme o escopo", prazo: "14 dias",
    itens: "Várias páginas, serviços detalhados, galeria, catálogo ou blog. Para quem precisa mostrar mais." },
  { id: "automacao_whatsapp", nome: "Automação de WhatsApp", preco: "R$ 800", prazo: "5 dias",
    itens: "Para quem já tem site: respostas automáticas, agendamento e lembretes para o cliente." },
  { id: "sistema_sob_medida", nome: "Sistema sob medida", preco: "sob consulta", prazo: "definido na proposta",
    itens: "Loja online, cardápio com gestão, painel de controle." },
];

// O que o site da Vera mostra publicamente. Só nome e o que o site diz.
const PORTFOLIO = [
  { nome: "Vó Neis", descricao: "Confeitaria. Citada no site da Vera como exemplo de sistema sob medida." },
  { nome: "ERK Pratas", descricao: "Loja de pratas. Citada no site da Vera como exemplo de sistema sob medida." },
];

const STATUS = ["pronto", "revisar", "nao_contatar"] as const;
const brt = (d: string | Date) => new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const texto = (v: unknown) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.toLowerCase() !== "null" ? t : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = admin();
  const quem = await autorizar(req, db);
  if (!quem) return json({ erro: "não autorizado" }, 401);
  try {
    const { lead_id, observacao } = await req.json();
    const { data: lead } = await db.from("leads").select("*").eq("id", lead_id).single();
    if (!lead) return json({ erro: "lead não encontrado" }, 404);

    const emailVendedor = quem === "sistema" ? lead.responsavel : quem;
    const { data: membro } = emailVendedor
      ? await db.from("equipe").select("nome").eq("email", emailVendedor).maybeSingle()
      : { data: null };
    const vendedor = membro?.nome?.split(" ")[0] ?? null;

    const [{ data: msgs }, { data: fus }] = await Promise.all([
      db.from("mensagens").select("direcao, texto, enviada_em").eq("lead_id", lead_id)
        .order("enviada_em", { ascending: false }).limit(60),
      db.from("followups").select("agendado_para, tentativa, motivo").eq("lead_id", lead_id)
        .eq("status", "pendente").order("agendado_para").limit(1),
    ]);
    const conversa = (msgs ?? []).reverse().map((m, i) => ({
      id: `msg_${i + 1}`, quem: m.direcao === "enviada" ? "VERA" : "LEAD", quando: brt(m.enviada_em), texto: m.texto ?? "[mídia]",
    }));

    // Cada fato vira uma evidência com id fixo. Campo vazio é dito como desconhecido.
    const evidencias: { id: string; fonte: string; fato: string }[] = [];
    const ev = (id: string, fonte: string, fato: string) => evidencias.push({ id, fonte, fato });
    ev("lead.nome", "cadastro", `Nome: ${lead.nome}`);
    ev("lead.nicho", "cadastro", lead.nicho ? `Ramo informado: ${lead.nicho}` : "Ramo: desconhecido");
    ev("lead.cidade", "cadastro", lead.cidade ? `Cidade: ${lead.cidade}` : "Cidade: desconhecida");
    ev("lead.site", "cadastro", lead.site
      ? `Endereço de site registrado: ${lead.site}. A página não foi analisada.`
      : "Site: campo vazio, ou seja, desconhecido. Não significa que a empresa não tenha site.");
    ev("lead.instagram", "cadastro", lead.instagram
      ? `Instagram registrado: ${lead.instagram}. O perfil não foi analisado.`
      : "Instagram: desconhecido.");
    if (lead.rating != null) ev("lead.google", "Google Maps", `Nota ${lead.rating} com ${lead.avaliacoes ?? 0} avaliações no Google.`);
    if (lead.observacoes) ev("lead.observacoes", "anotação interna da equipe", lead.observacoes);
    const obs = typeof observacao === "string" ? observacao.trim().slice(0, 2000) : "";
    if (obs) ev("observacao_vendedor", "visto agora pela equipe", obs);
    for (const m of conversa) evidencias.push({ id: m.id, fonte: `conversa (${m.quem})`, fato: m.texto.slice(0, 500) });

    const ultima = conversa[conversa.length - 1];
    const situacao = {
      etapa: lead.etapa,
      motivo_perda: lead.motivo_perda ?? null,
      primeiro_contato: conversa.length === 0,
      ultima_mensagem_do_lead_sem_resposta: ultima?.quem === "LEAD",
      followup_pendente: fus?.[0]
        ? { tentativa: fus[0].tentativa, agendado_para: brt(fus[0].agendado_para), motivo: fus[0].motivo }
        : null,
      agora: brt(new Date()),
    };

    const entrada = { vendedor: vendedor ?? "(nome do vendedor não cadastrado)", situacao, evidencias, conversa, catalogo: CATALOGO, portfolio: PORTFOLIO };
    const { text, model } = await claude(db, PROMPT_EQUIPE + COMO_LER_A_ENTRADA, JSON.stringify(entrada, null, 1), 2500);
    const r = extrairJson(text);

    // A IA não pode inventar status, evidência nem oferta: o que não bate é descartado.
    if (!STATUS.includes(r.status)) throw new Error(`Status inválido da IA: ${r.status}`);
    const idsEv = new Set(evidencias.map((e) => e.id));
    const idsOferta = new Set(CATALOGO.map((o) => o.id));
    let a = texto(r.mensagem_a), b = texto(r.mensagem_b);
    if (!a && b) [a, b] = [b, null];
    if (r.status === "revisar") b = null;
    const nao = r.status === "nao_contatar";

    const { data: rascunho, error } = await db.from("rascunhos_ia").insert({
      lead_id,
      status: r.status,
      objetivo_da_etapa: texto(r.objetivo_da_etapa),
      evidencias_usadas: (Array.isArray(r.evidencias_usadas) ? r.evidencias_usadas : [])
        .filter((e: any) => e && idsEv.has(e.id)).map((e: any) => ({ id: e.id, fato: String(e.fato ?? "") })),
      hipotese_comercial: texto(r.hipotese_comercial),
      oferta_id: !nao && idsOferta.has(r.oferta_id) ? r.oferta_id : null,
      informacoes_faltantes: (Array.isArray(r.informacoes_faltantes) ? r.informacoes_faltantes : []).map(String).filter(Boolean),
      mensagem_a: nao ? null : a,
      mensagem_b: nao ? null : b,
      justificativa_curta: texto(r.justificativa_curta),
      proxima_acao_sugerida: texto(r.proxima_acao_sugerida),
      observacao_vendedor: obs || null,
      vendedor: emailVendedor,
      modelo: model,
    }).select().single();
    if (error) throw error;

    await db.from("atividades").insert({ lead_id, tipo: "rascunho_ia", detalhe: { status: r.status }, usuario: quem });
    return json({ ok: true, rascunho });
  } catch (e) {
    return json({ erro: String(e?.message ?? e) }, 500);
  }
});
