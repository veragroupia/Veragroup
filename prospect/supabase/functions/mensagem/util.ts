import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vera-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

const cache: Record<string, string | null> = {};
export async function segredo(db: SupabaseClient, nome: string): Promise<string | null> {
  if (nome in cache) return cache[nome];
  const env = Deno.env.get(nome.toUpperCase());
  if (env) return (cache[nome] = env);
  const { data } = await db.rpc("get_segredo", { p_nome: nome });
  return (cache[nome] = (data as string) ?? null);
}

export async function autorizar(req: Request, db: SupabaseClient): Promise<string | null> {
  const s = req.headers.get("x-vera-secret");
  if (s && s === (await segredo(db, "vera_secret"))) return "sistema";
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const { data } = await db.auth.getUser(auth);
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: m } = await db.from("equipe").select("email").eq("email", email).eq("ativo", true).maybeSingle();
  return m ? email : null;
}

export async function claude(db: SupabaseClient, system: string, user: string, maxTokens = 2000) {
  const key = await segredo(db, "anthropic_api_key");
  if (key) {
    const model = (await segredo(db, "anthropic_model")) || "claude-sonnet-4-5";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (r.ok) {
      const j = await r.json();
      const text = (j.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
      return { text, model };
    }
    if (!(await segredo(db, "groq_api_key"))) throw new Error(`Claude ${r.status}: ${await r.text()}`);
  }
  const groq = await segredo(db, "groq_api_key");
  if (!groq) throw new Error("Falta uma chave de IA: anthropic_api_key ou groq_api_key");
  const preferido = await segredo(db, "groq_model");
  const modelos = [...(preferido ? [preferido] : []), "openai/gpt-oss-120b", "llama-3.3-70b-versatile"];
  let ultimoErro = "";
  for (const model of modelos) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groq}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (r.ok) {
      const j = await r.json();
      return { text: j.choices?.[0]?.message?.content ?? "", model: `groq/${model}` };
    }
    ultimoErro = `Groq ${r.status}: ${await r.text()}`;
    if (r.status !== 404 && r.status !== 400) break;
  }
  throw new Error(ultimoErro);
}

export function extrairJson(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Resposta sem JSON");
  return JSON.parse(m[0]);
}
