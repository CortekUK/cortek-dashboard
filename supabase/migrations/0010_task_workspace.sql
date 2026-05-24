-- Cortek Dashboard — task workspace: tags, attachments (looms/docs),
-- in-task checklist, versioned feedback rounds, git fields, time tracking.
--
-- All new tables follow the project pattern: RLS disabled (single-user dev)
-- and a set_updated_at trigger where rows are mutable.

-- ──────────────────────────────────────────────────────────────────────────
-- tasks: new columns
-- ──────────────────────────────────────────────────────────────────────────

alter table public.tasks
  add column if not exists branch_name       text,
  add column if not exists pr_target_branch  text,
  add column if not exists pr_url            text,
  add column if not exists estimated_hours   numeric(6,2),
  add column if not exists actual_hours      numeric(6,2);

-- ──────────────────────────────────────────────────────────────────────────
-- tags + task_tags
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.tags (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  name        text        not null,
  -- One of the StatusTone names ('primary' | 'info' | 'success' | 'warning' |
  -- 'destructive' | 'neutral') so the UI can map straight to TONE_CLASSES.
  color       text        not null default 'neutral',
  created_at  timestamptz not null default now(),
  unique (project_id, name)
);
create index if not exists tags_project_idx on public.tags (project_id);

create table if not exists public.task_tags (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  tag_id   uuid not null references public.tags(id)  on delete cascade,
  primary key (task_id, tag_id)
);
create index if not exists task_tags_tag_idx on public.task_tags (tag_id);

-- ──────────────────────────────────────────────────────────────────────────
-- task_attachments — Looms + linked docs, briefing vs completion
-- ──────────────────────────────────────────────────────────────────────────

create type public.task_attachment_kind as enum (
  'briefing_loom',
  'briefing_doc',
  'completion_loom',
  'completion_doc'
);

create table if not exists public.task_attachments (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks(id) on delete cascade,
  kind        task_attachment_kind not null,
  url         text        not null,
  label       text,
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists task_attachments_task_idx
  on public.task_attachments (task_id, kind, position);

-- ──────────────────────────────────────────────────────────────────────────
-- task_checklist_items — task-local checklist (distinct from
-- project-level checklist_items).
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.task_checklist_items (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks(id) on delete cascade,
  title       text        not null,
  done        boolean     not null default false,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists task_checklist_task_idx
  on public.task_checklist_items (task_id, position);

drop trigger if exists task_checklist_set_updated_at on public.task_checklist_items;
create trigger task_checklist_set_updated_at
  before update on public.task_checklist_items
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- task_feedback_rounds — versioned feedback loop. round_number increments
-- per-task (computed app-side from max(round_number)+1). status flips to
-- 'addressed' when the dev has resolved the round.
-- ──────────────────────────────────────────────────────────────────────────

create type public.feedback_round_status as enum ('open', 'addressed');

create table if not exists public.task_feedback_rounds (
  id            uuid        primary key default gen_random_uuid(),
  task_id       uuid        not null references public.tasks(id) on delete cascade,
  round_number  integer     not null,
  body          text        not null,
  loom_url      text,
  author        text        not null default 'Anonymous',
  status        feedback_round_status not null default 'open',
  addressed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (task_id, round_number)
);
create index if not exists task_feedback_task_idx
  on public.task_feedback_rounds (task_id, round_number);

drop trigger if exists task_feedback_set_updated_at on public.task_feedback_rounds;
create trigger task_feedback_set_updated_at
  before update on public.task_feedback_rounds
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- RLS — disabled for single-user mode (mirrors migrations 0001/0002).
-- TODO(auth): re-enable with per-user policies when auth lands.
-- ──────────────────────────────────────────────────────────────────────────

alter table public.tags                  disable row level security;
alter table public.task_tags             disable row level security;
alter table public.task_attachments      disable row level security;
alter table public.task_checklist_items  disable row level security;
alter table public.task_feedback_rounds  disable row level security;
