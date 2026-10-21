-- 0001 · Agenda da Vera (aba Agenda do Vera Prospect).
--
-- Posts de Instagram e TikTok, tarefas da equipe e compromissos avulsos,
-- no modelo do calendário de conteúdo da Vó Neis. Follow-ups e reuniões com
-- lead continuam nas tabelas deles (followups, reunioes): a tela só lê de lá,
-- para não existir o mesmo compromisso em dois lugares.
--
-- Esta migration cria UMA tabela nova. Nenhuma tabela existente é alterada.

begin;

create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),

  -- O dia em que acontece (o post vai ao ar, a tarefa vence).
  data date not null,
  hora time,

  tipo text not null default 'tarefa'
    check (tipo in ('post', 'story', 'tarefa', 'reuniao')),

  -- Só para post e story.
  plataforma text
    check (plataforma is null or plataforma in ('Reels + TikTok', 'Instagram', 'TikTok', 'Carrossel', 'Story')),

  titulo text not null,
  -- "comentários", "salvamento", "alcance", "pedir orçamento". Texto livre.
  objetivo text not null default '',
  -- Roteiro, legenda, pauta ou passo a passo da tarefa.
  roteiro text not null default '',

  -- Post anda por a fazer → gravado → editado → postado.
  -- Tarefa e reunião: a fazer → feito.
  status text not null default 'a fazer'
    check (status in ('a fazer', 'gravado', 'editado', 'postado', 'feito')),

  responsavel text references public.equipe (email) on update cascade on delete set null,
  lead_id uuid references public.leads (id) on delete set null,

  criado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_data_idx on public.agenda (data);
create index if not exists agenda_resp_idx on public.agenda (responsavel);

-- Mesma regra das outras tabelas do painel: só quem está ativo na equipe.
alter table public.agenda enable row level security;
drop policy if exists equipe_all on public.agenda;
create policy equipe_all on public.agenda for all using (public.eh_equipe()) with check (public.eh_equipe());

grant all on table public.agenda to authenticated, service_role;
revoke all on table public.agenda from anon, public;

-- Tempo real: o que um marca como postado aparece na tela do outro.
do $$ begin
  alter publication supabase_realtime add table public.agenda;
exception when duplicate_object then null;
end $$;

commit;
