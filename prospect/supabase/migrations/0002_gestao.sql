-- 0002 · Vera Group Manager: clientes, propostas, projetos e financeiro.
--
-- O painel deixa de ser só prospecção e vira o centro de gestão da Vera.
-- Só tabelas novas. Nenhuma tabela existente é alterada; as novas apontam
-- para leads e equipe por chave estrangeira.

-- ---------------------------------------------------------------- clientes
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nicho text,
  cidade text,
  documento text,                         -- CNPJ ou CPF
  contato_nome text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  site_url text,
  instagram text,
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  cliente_desde date not null default current_date,
  lead_id uuid unique references public.leads (id) on delete set null,
  responsavel text references public.equipe (email) on update cascade on delete set null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------- propostas
-- itens: [{ "nome": "Landing Express", "descricao": "...", "valor": 1200, "prazo_dias": 5, "recorrente": false }]
create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  titulo text not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  itens jsonb not null default '[]',
  valor_setup numeric not null default 0,
  valor_mensal numeric not null default 0,
  prazo_dias integer,
  validade date,
  condicoes text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada', 'expirada')),
  enviada_em timestamptz,
  respondida_em timestamptz,
  motivo_recusa text,
  contrato_url text,
  contrato_assinado boolean not null default false,
  responsavel text references public.equipe (email) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- projetos
-- checklist: [{ "texto": "Receber logo e fotos", "feito": false }]
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  proposta_id uuid references public.propostas (id) on delete set null,
  tipo text not null default 'landing' check (tipo in ('landing', 'landing_wa', 'site', 'automacao', 'sistema', 'outro')),
  etapa text not null default 'briefing' check (etapa in ('briefing', 'layout', 'desenvolvimento', 'revisao', 'no_ar', 'manutencao', 'pausado')),
  inicio date not null default current_date,
  prazo date,
  entregue_em date,
  valor numeric not null default 0,
  url_previa text,
  url_producao text,
  checklist jsonb not null default '[]',
  responsavel text references public.equipe (email) on update cascade on delete set null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------- financeiro
-- Recorrência: mensalidade de cliente ou despesa fixa. Gera um lançamento
-- por mês pela função gerar_lancamentos_mes.
create table if not exists public.fin_recorrencias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita', 'despesa')),
  descricao text not null,
  categoria text not null,
  valor numeric not null check (valor > 0),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 28),
  cliente_id uuid references public.clientes (id) on delete cascade,
  ativo boolean not null default true,
  inicio date not null default current_date,
  fim date,
  created_at timestamptz not null default now()
);

create table if not exists public.fin_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('receita', 'despesa')),
  descricao text not null,
  categoria text not null,
  valor numeric not null check (valor > 0),
  vencimento date not null,
  pago_em date,
  forma text check (forma is null or forma in ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro')),
  cliente_id uuid references public.clientes (id) on delete set null,
  projeto_id uuid references public.projetos (id) on delete set null,
  proposta_id uuid references public.propostas (id) on delete set null,
  recorrencia_id uuid references public.fin_recorrencias (id) on delete set null,
  competencia date,                       -- 1º dia do mês a que pertence (recorrência)
  socio text references public.equipe (email) on update cascade on delete set null,  -- retirada de sócio
  observacoes text,
  created_at timestamptz not null default now(),
  unique (recorrencia_id, competencia)
);

-- Quanto do lucro é de cada sócio.
create table if not exists public.fin_socios (
  email text primary key references public.equipe (email) on update cascade on delete cascade,
  percentual numeric not null check (percentual >= 0 and percentual <= 100)
);

create index if not exists clientes_status_idx on public.clientes (status);
create index if not exists propostas_status_idx on public.propostas (status);
create index if not exists projetos_cliente_idx on public.projetos (cliente_id);
create index if not exists projetos_etapa_idx on public.projetos (etapa);
create index if not exists fin_lanc_venc_idx on public.fin_lancamentos (vencimento);
create index if not exists fin_lanc_cliente_idx on public.fin_lancamentos (cliente_id);

-- Gera os lançamentos das recorrências ativas para o mês informado. Pode
-- rodar quantas vezes quiser: o unique (recorrencia_id, competencia) impede
-- a cobrança dobrada.
create or replace function public.gerar_lancamentos_mes(p_mes date)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_mes date := date_trunc('month', p_mes)::date;
  v_n integer;
begin
  if not public.eh_equipe() then raise exception 'sem acesso'; end if;
  insert into fin_lancamentos (tipo, descricao, categoria, valor, vencimento, cliente_id, recorrencia_id, competencia)
  select r.tipo, r.descricao, r.categoria, r.valor,
         (v_mes + (r.dia_vencimento - 1))::date, r.cliente_id, r.id, v_mes
  from fin_recorrencias r
  where r.ativo
    and date_trunc('month', r.inicio) <= v_mes
    and (r.fim is null or r.fim >= v_mes)
  on conflict (recorrencia_id, competencia) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ------------------------------------------------------------- acesso
-- Mesma regra do resto do painel: só quem está ativo na equipe.
do $$
declare t text;
begin
  foreach t in array array['clientes', 'propostas', 'projetos', 'fin_recorrencias', 'fin_lancamentos', 'fin_socios'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists equipe_all on public.%I', t);
    execute format('create policy equipe_all on public.%I for all using (public.eh_equipe()) with check (public.eh_equipe())', t);
    execute format('revoke all on table public.%I from anon, public', t);
    execute format('grant all on table public.%I to authenticated, service_role', t);
  end loop;
end $$;
revoke all on function public.gerar_lancamentos_mes(date) from anon, public;
grant execute on function public.gerar_lancamentos_mes(date) to authenticated;

-- Tempo real nas telas que mais de uma pessoa usa ao mesmo tempo.
alter publication supabase_realtime add table public.clientes, public.projetos, public.fin_lancamentos, public.propostas;
