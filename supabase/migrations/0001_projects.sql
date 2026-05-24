-- Cortek Dashboard — Phase 1 migration
-- Run in Supabase SQL editor (Project > SQL > New query).

-- Lifecycle enum for a project. Demo = pitching the client, not closed yet.
-- in_progress = closed deal, actively working. archived = done / shelved.
create type public.project_stage as enum ('demo', 'in_progress', 'archived');

create table public.projects (
  id            uuid          primary key default gen_random_uuid(),
  client_name   text          not null,
  project_name  text          not null,
  stage         project_stage not null default 'demo',
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create index projects_stage_idx       on public.projects (stage);
create index projects_created_at_idx  on public.projects (created_at desc);

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- TODO(auth): Re-enable RLS and add per-user policies when user management
-- lands in Phase 2+. Single-user dev only — the anon key currently grants
-- full read/write to this table.
alter table public.projects disable row level security;
