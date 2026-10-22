-- 0003 · Rascunhos de mensagem da IA (botão "Gerar mensagem" na página do lead).
--
-- Cada vez que alguém pede uma mensagem, a função `mensagem` grava aqui o que a
-- IA devolveu: status (pronto, revisar, nao_contatar), evidências usadas, oferta
-- do catálogo e as variantes A e B. Fica o histórico para a equipe comparar.
--
-- Esta migration cria UMA tabela nova. Nenhuma tabela existente é alterada.

begin;

create table if not exists public.rascunhos_ia (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,

  status text not null check (status in ('pronto', 'revisar', 'nao_contatar')),
  objetivo_da_etapa text,
  evidencias_usadas jsonb not null default '[]',
  hipotese_comercial text,
  oferta_id text,
  informacoes_faltantes jsonb not null default '[]',
  mensagem_a text,
  mensagem_b text,
  justificativa_curta text,
  proxima_acao_sugerida text,

  -- O que o vendedor escreveu na hora de gerar ("vi nos destaques que...").
  observacao_vendedor text,
  -- Quem pediu, para a IA assinar com o nome certo.
  vendedor text,
  -- Qual variante foi usada, quando alguém envia ou copia.
  usada text check (usada is null or usada in ('a', 'b')),
  modelo text,
  created_at timestamptz not null default now()
);

create index if not exists rascunhos_ia_lead_idx on public.rascunhos_ia (lead_id, created_at desc);

alter table public.rascunhos_ia enable row level security;
drop policy if exists equipe_all on public.rascunhos_ia;
create policy equipe_all on public.rascunhos_ia for all using (public.eh_equipe()) with check (public.eh_equipe());

grant all on table public.rascunhos_ia to authenticated, service_role;
revoke all on table public.rascunhos_ia from anon, public;

do $$ begin
  alter publication supabase_realtime add table public.rascunhos_ia;
exception when duplicate_object then null;
end $$;

commit;
