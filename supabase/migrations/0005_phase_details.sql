-- Cortek Dashboard — phase start/end dates + goals
--
-- Adds planned timeline to phases (nullable so existing rows keep working;
-- the UI requires both on new/edited phases). Adds a phase_goals table for
-- the per-phase goal list shown on the dedicated phase editor screen.

alter table public.phases
  add column if not exists start_date date,
  add column if not exists end_date   date;

create table if not exists public.phase_goals (
  id          uuid        primary key default gen_random_uuid(),
  phase_id    uuid        not null references public.phases(id) on delete cascade,
  text        text        not null,
  achieved    boolean     not null default false,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists phase_goals_phase_idx
  on public.phase_goals (phase_id, position);

drop trigger if exists phase_goals_set_updated_at on public.phase_goals;
create trigger phase_goals_set_updated_at
  before update on public.phase_goals
  for each row execute function public.set_updated_at();

-- TODO(auth): mirrors migration 0001 — RLS stays disabled in single-user dev.
alter table public.phase_goals disable row level security;
