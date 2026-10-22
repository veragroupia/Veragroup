-- 0004 · Vera Sales Intelligence.
--
-- Só acrescenta: tabelas novas, colunas novas que aceitam vazio e um gatilho de proteção.
-- Nada é apagado nem reescrito. Os registros antigos ficam como estão:
--   * mensagens.confirmada fica NULL nas mensagens antigas ("envio não comprovado"),
--     porque antes abrir o WhatsApp já gravava a mensagem como enviada.
--
-- Tabelas novas
--   contatos_bloqueados   pedido para não receber mensagens, por telefone e place_id (sobrevive a reimportação)
--   lead_inteligencia     classificação atual de cada lead + correções manuais da equipe
--   lead_inteligencia_historico  uma linha por análise, para auditoria
--   envios                WhatsApp aberto, envio confirmado ou não enviado
--   config_comercial      estilo, janelas, limites, pesos e catálogo da IA comercial
--
-- Para desfazer: veja o fim do arquivo.

begin;

/* ---------- Bloqueios ---------- */

-- DDD + últimos 8 dígitos (mesmo critério do webhook do WhatsApp).
create or replace function public.telefone_chave(p text) returns text
language sql immutable as $$
  select case
    when length(d) < 10 then null
    else substr(d, 1, 2) || right(d, 8)
  end
  from (
    select case
      when x like '55%' and length(x) >= 12 then substr(x, 3)
      else x
    end as d
    from (select ltrim(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '0') as x) a
  ) b
$$;

create table if not exists public.contatos_bloqueados (
  id uuid primary key default gen_random_uuid(),
  telefone_chave text,
  place_id text,
  lead_id uuid references public.leads (id) on delete set null,
  motivo text not null default 'Pediu para não receber mensagens',
  origem text not null default 'equipe' check (origem in ('pedido_do_cliente', 'equipe')),
  criado_por text,
  created_at timestamptz not null default now(),
  check (telefone_chave is not null or place_id is not null or lead_id is not null)
);
create unique index if not exists contatos_bloqueados_tel_idx on public.contatos_bloqueados (telefone_chave) where telefone_chave is not null;
create unique index if not exists contatos_bloqueados_place_idx on public.contatos_bloqueados (place_id) where place_id is not null;

-- Lead novo (radar, cadastro ou importação) de um contato bloqueado já nasce descartado.
create or replace function public.tg_leads_bloqueio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from contatos_bloqueados b
    where (b.telefone_chave is not null and b.telefone_chave in (telefone_chave(new.whatsapp), telefone_chave(new.telefone)))
       or (b.place_id is not null and b.place_id = new.place_id)
  ) then
    new.etapa := 'descartado';
    new.motivo_perda := 'Pediu para não ser contatado';
  end if;
  return new;
end $$;

drop trigger if exists leads_bloqueio on public.leads;
create trigger leads_bloqueio before insert on public.leads
  for each row execute function public.tg_leads_bloqueio();

/* ---------- Classificação atual ---------- */

create table if not exists public.lead_inteligencia (
  lead_id uuid primary key references public.leads (id) on delete cascade,

  -- calculado (a IA e as regras reescrevem)
  temperatura text check (temperatura in ('frio', 'morno', 'quente')),
  score_interesse int check (score_interesse between 0 and 100),
  score_adequacao int check (score_adequacao between 0 and 100),
  confianca text check (confianca in ('baixa', 'media', 'alta')),
  estado text,
  estagio text,
  necessidade text,
  solucao text,
  oferta_id text,
  sinais jsonb not null default '[]',
  conhecido jsonb not null default '[]',
  desconhecido jsonb not null default '[]',
  pergunta_prioritaria text,
  proxima_acao text,
  motivo text,
  janela jsonb,
  analise jsonb,
  resumo text,
  contexto_hash text,
  ultima_mensagem_id uuid,
  prompt_version text,
  modelo text,
  analisado_em timestamptz,

  -- correções da equipe: a automação nunca escreve nestas colunas
  temperatura_manual text check (temperatura_manual is null or temperatura_manual in ('frio', 'morno', 'quente')),
  temperatura_manual_nota text,
  temperatura_manual_por text,
  temperatura_manual_em timestamptz,
  retorno_em timestamptz,
  retorno_nota text,
  retorno_por text,
  -- liberou o contato depois de um pedido para parar (pedidos anteriores deixam de bloquear)
  contato_liberado_em timestamptz,
  contato_liberado_por text,

  updated_at timestamptz not null default now()
);

create table if not exists public.lead_inteligencia_historico (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  origem text not null check (origem in ('ia', 'regra', 'manual')),
  temperatura text,
  score_interesse int,
  score_adequacao int,
  confianca text,
  proxima_acao text,
  motivo text,
  detalhe jsonb,
  prompt_version text,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists lead_intel_hist_lead_idx on public.lead_inteligencia_historico (lead_id, created_at desc);

/* ---------- Envio: aberto ≠ confirmado ---------- */

create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  rascunho_id uuid references public.rascunhos_ia (id) on delete set null,
  variante text check (variante is null or variante in ('a', 'b')),
  followup_id uuid references public.followups (id) on delete set null,
  texto text not null default '',
  status text not null default 'aberto' check (status in ('aberto', 'confirmado', 'nao_enviado', 'leitura_automatica')),
  autor text,
  aberto_em timestamptz not null default now(),
  confirmado_em timestamptz,
  mensagem_id uuid references public.mensagens (id) on delete set null
);
create index if not exists envios_abertos_idx on public.envios (autor, aberto_em desc) where status = 'aberto';
create index if not exists envios_lead_idx on public.envios (lead_id, aberto_em desc);

-- NULL = mensagem antiga, envio não comprovado. true = enviada de verdade (confirmada pela equipe ou lida do WhatsApp).
alter table public.mensagens add column if not exists confirmada boolean;

/* ---------- Rascunhos: contexto e decisão ---------- */

alter table public.rascunhos_ia drop constraint if exists rascunhos_ia_status_check;
alter table public.rascunhos_ia add constraint rascunhos_ia_status_check
  check (status in ('pronto', 'revisar', 'nao_contatar', 'sem_mensagem'));

alter table public.rascunhos_ia
  add column if not exists acao text,
  add column if not exists motivo text,
  add column if not exists temperatura text,
  add column if not exists score_interesse int,
  add column if not exists score_adequacao int,
  add column if not exists confianca text,
  add column if not exists melhor_opcao text check (melhor_opcao is null or melhor_opcao in ('A', 'B')),
  add column if not exists mencionar_assunto_anterior boolean,
  add column if not exists horario jsonb,
  add column if not exists condicao_retomar text,
  add column if not exists alertas jsonb not null default '[]',
  add column if not exists contexto_hash text,
  add column if not exists ultima_mensagem_id uuid,
  add column if not exists etapa text,
  add column if not exists prompt_version text,
  add column if not exists catalogo_versao text,
  add column if not exists texto_final text,
  add column if not exists copiada_em timestamptz,
  add column if not exists enviada_confirmada_em timestamptz,
  add column if not exists mensagem_id uuid references public.mensagens (id) on delete set null;

/* ---------- Configuração comercial ---------- */

create table if not exists public.config_comercial (
  id int primary key default 1 check (id = 1),
  estilo text not null default 'consultivo',
  formalidade text not null default 'informal',
  emojis text not null default 'nenhum',
  objetivo text not null default 'qualificar',
  preferir_qualificacao boolean not null default true,
  janelas jsonb not null default '[{"inicio":"09:00","fim":"11:30"},{"inicio":"14:00","fim":"17:30"}]',
  apenas_dias_uteis boolean not null default true,
  fuso text not null default 'America/Sao_Paulo',
  limite_followups int not null default 3 check (limite_followups between 1 and 10),
  dias_aguardar int not null default 2 check (dias_aguardar between 1 and 30),
  min_respostas_padrao int not null default 3 check (min_respostas_padrao between 2 and 20),
  pesos jsonb not null default '{}',
  catalogo jsonb,
  catalogo_versao text not null default 'site-2026-10',
  politica_previas text not null default 'demonstracao_quando_apropriado',
  prompt_version text not null default 'vera-sales-v4',
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.config_comercial (id) values (1) on conflict (id) do nothing;

/* ---------- Acesso: só a equipe, como as outras tabelas ---------- */

do $$
declare t text;
begin
  foreach t in array array['contatos_bloqueados', 'lead_inteligencia', 'lead_inteligencia_historico', 'envios', 'config_comercial'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists equipe_all on public.%I', t);
    execute format('create policy equipe_all on public.%I for all using (public.eh_equipe()) with check (public.eh_equipe())', t);
    execute format('grant all on table public.%I to authenticated, service_role', t);
    execute format('revoke all on table public.%I from anon, public', t);
  end loop;
end $$;

-- Configuração e bloqueios: só admin altera; toda a equipe lê.
drop policy if exists equipe_all on public.config_comercial;
drop policy if exists equipe_le on public.config_comercial;
drop policy if exists admin_altera on public.config_comercial;
create policy equipe_le on public.config_comercial for select using (public.eh_equipe());
create policy admin_altera on public.config_comercial for update using (public.eh_admin()) with check (public.eh_admin());

do $$
declare t text;
begin
  foreach t in array array['lead_inteligencia', 'envios', 'contatos_bloqueados'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

commit;

/* ---------- Para desfazer (só se não houver dados a preservar) ----------
begin;
drop trigger if exists leads_bloqueio on public.leads;
drop function if exists public.tg_leads_bloqueio();
drop table if exists public.envios, public.lead_inteligencia_historico, public.lead_inteligencia, public.config_comercial, public.contatos_bloqueados;
drop function if exists public.telefone_chave(text);
alter table public.mensagens drop column if exists confirmada;
-- as colunas novas de rascunhos_ia podem ficar: são opcionais e não atrapalham a versão anterior.
commit;
*/
