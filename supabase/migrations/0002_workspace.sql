-- Cortek Dashboard — Phase 2/3/4 migration: project workspace
-- Run in Supabase SQL editor or via Management API.

-- ──────────────────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────────────────

create type public.task_status as enum (
  'not_started', 'in_progress', 'in_review', 'completed'
);

create type public.requirement_status as enum ('open', 'received');

-- Single flat enum so we can group/sort easily in the Financials tab.
--   client_in = payment received from the client
--   dev_out   = commission / payment to a developer
--   other_in  = misc income
--   other_out = misc expense
create type public.payment_kind as enum (
  'client_in', 'dev_out', 'other_in', 'other_out'
);

create type public.payment_status as enum (
  'pending', 'paid', 'overdue', 'cancelled'
);

-- ──────────────────────────────────────────────────────────────────────────
-- Tables
-- ──────────────────────────────────────────────────────────────────────────

create table public.phases (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  name        text        not null,
  position    integer     not null default 0,
  status      task_status not null default 'not_started',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index phases_project_idx on public.phases (project_id, position);

create table public.tasks (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  phase_id    uuid        references public.phases(id) on delete set null,
  title       text        not null,
  description text,
  status      task_status not null default 'not_started',
  assignee    text,
  due_date    date,
  position    integer     not null default 0,
  -- 'manual' | 'fathom' — what created this task
  source      text        not null default 'manual',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_phase_idx   on public.tasks (phase_id);
create index tasks_status_idx  on public.tasks (status);

create table public.meetings (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  title         text        not null,
  scheduled_at  timestamptz,
  notes         text,
  fathom_url    text,
  transcript    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index meetings_project_idx on public.meetings (project_id, scheduled_at desc);

create table public.requirements (
  id          uuid                primary key default gen_random_uuid(),
  project_id  uuid                not null references public.projects(id) on delete cascade,
  title       text                not null,
  description text,
  status      requirement_status  not null default 'open',
  created_at  timestamptz         not null default now(),
  updated_at  timestamptz         not null default now()
);
create index requirements_project_idx on public.requirements (project_id);

create table public.resources (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  name          text        not null,
  value         text        not null,
  is_sensitive  boolean     not null default false,
  created_at    timestamptz not null default now()
);
create index resources_project_idx on public.resources (project_id);

create table public.reminders (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  title       text        not null,
  remind_at   timestamptz,
  completed   boolean     not null default false,
  created_at  timestamptz not null default now()
);
create index reminders_project_idx on public.reminders (project_id, remind_at);

create table public.checklist_items (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  title       text        not null,
  position    integer     not null default 0,
  done        boolean     not null default false,
  created_at  timestamptz not null default now()
);
create index checklist_project_idx on public.checklist_items (project_id, position);

create table public.today_picks (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  task_id     uuid        references public.tasks(id) on delete cascade,
  pick_date   date        not null default current_date,
  note        text,
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);
create index today_picks_idx on public.today_picks (project_id, pick_date, position);

create table public.payments (
  id           uuid           primary key default gen_random_uuid(),
  project_id   uuid           not null references public.projects(id) on delete cascade,
  kind         payment_kind   not null,
  description  text           not null,
  amount       numeric(12,2)  not null,
  currency     text           not null default 'USD',
  status       payment_status not null default 'pending',
  party        text,
  occurred_on  date,
  created_at   timestamptz    not null default now()
);
create index payments_project_idx on public.payments (project_id, occurred_on desc);

-- ──────────────────────────────────────────────────────────────────────────
-- Triggers
-- ──────────────────────────────────────────────────────────────────────────

create trigger phases_set_updated_at       before update on public.phases       for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at        before update on public.tasks        for each row execute function public.set_updated_at();
create trigger meetings_set_updated_at     before update on public.meetings     for each row execute function public.set_updated_at();
create trigger requirements_set_updated_at before update on public.requirements for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- RLS — disabled for single-user mode (Phase 1 carries this caveat).
-- TODO(auth): re-enable with per-user policies when auth lands.
-- ──────────────────────────────────────────────────────────────────────────

alter table public.phases          disable row level security;
alter table public.tasks           disable row level security;
alter table public.meetings        disable row level security;
alter table public.requirements    disable row level security;
alter table public.resources       disable row level security;
alter table public.reminders       disable row level security;
alter table public.checklist_items disable row level security;
alter table public.today_picks     disable row level security;
alter table public.payments        disable row level security;
