-- 0005 · Vera Sales Intelligence v5: memória comercial, edição e aprovação de rascunhos, preparo automático.
--
-- Depende da 0004. Só acrescenta colunas que aceitam vazio e amplia duas listas de valores permitidos.
-- Nada é apagado nem reescrito.
--
--   lead_inteligencia   memória comercial (com evidências), memória corrigida pela equipe, diretrizes da próxima mensagem,
--                       sinais desconsiderados (antigos ou contrariados), chave do cache da análise.
--                       temperatura passa a aceitar "desconhecido" (respondeu, mas sem sinal de interesse).
--   rascunhos_ia        texto editado de cada opção, aprovação, avaliação humana (boa/ruim), avaliação objetiva
--                       de qualidade, diretrizes usadas e de onde veio o rascunho (manual, automático, lote).
--   config_comercial    preparo automático ao abrir o lead e limite da preparação em lote.

begin;

/* ---------- Temperatura "interesse desconhecido" ---------- */

alter table public.lead_inteligencia drop constraint if exists lead_inteligencia_temperatura_check;
alter table public.lead_inteligencia add constraint lead_inteligencia_temperatura_check
  check (temperatura is null or temperatura in ('frio', 'desconhecido', 'morno', 'quente'));
alter table public.lead_inteligencia drop constraint if exists lead_inteligencia_temperatura_manual_check;
alter table public.lead_inteligencia add constraint lead_inteligencia_temperatura_manual_check
  check (temperatura_manual is null or temperatura_manual in ('frio', 'desconhecido', 'morno', 'quente'));

/* ---------- Memória comercial ---------- */

alter table public.lead_inteligencia
  -- calculado pela análise (cada item com evidência; hipótese nunca vira fato aqui)
  add column if not exists memoria jsonb,
  add column if not exists diretrizes jsonb,
  add column if not exists sinais_desconsiderados jsonb not null default '[]',
  add column if not exists cache_chave text,
  -- correções da equipe: fatos confirmados, itens marcados como errados, horário de funcionamento verificado.
  -- A automação nunca escreve nestas colunas.
  add column if not exists memoria_equipe jsonb not null default '{}',
  add column if not exists memoria_equipe_em timestamptz,
  add column if not exists memoria_equipe_por text;

/* ---------- Rascunhos: edição, aprovação e avaliação ---------- */

alter table public.rascunhos_ia
  add column if not exists texto_editado_a text,
  add column if not exists texto_editado_b text,
  add column if not exists editada_em timestamptz,
  add column if not exists aprovada_em timestamptz,
  add column if not exists aprovada_por text,
  add column if not exists aprovada_variante text check (aprovada_variante is null or aprovada_variante in ('a', 'b')),
  add column if not exists avaliacao_humana smallint check (avaliacao_humana is null or avaliacao_humana in (-1, 1)),
  add column if not exists avaliacao_nota text,
  add column if not exists avaliada_por text,
  add column if not exists qualidade jsonb,
  add column if not exists diretrizes jsonb,
  add column if not exists origem text not null default 'manual' check (origem in ('manual', 'automatico', 'lote'));

create index if not exists rascunhos_ia_lead_idx on public.rascunhos_ia (lead_id, created_at desc);

/* ---------- Configuração ---------- */

alter table public.config_comercial
  add column if not exists preparo_automatico boolean not null default true,
  add column if not exists limite_lote int not null default 20 check (limite_lote between 1 and 100);

update public.config_comercial set prompt_version = 'vera-sales-v5' where id = 1 and prompt_version = 'vera-sales-v4';

commit;

/* ---------- Para desfazer (só se não houver dados a preservar) ----------
begin;
alter table public.lead_inteligencia
  drop column if exists memoria, drop column if exists diretrizes, drop column if exists sinais_desconsiderados,
  drop column if exists cache_chave, drop column if exists memoria_equipe, drop column if exists memoria_equipe_em,
  drop column if exists memoria_equipe_por;
alter table public.config_comercial drop column if exists preparo_automatico, drop column if exists limite_lote;
-- as colunas novas de rascunhos_ia podem ficar: são opcionais e não atrapalham a versão anterior.
commit;
*/
