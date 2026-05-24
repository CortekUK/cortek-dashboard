-- Cortek Dashboard — Meetings v2
--
-- 1. Add a `meeting_url` column to public.meetings — the call link itself
--    (Zoom / Meet / Teams / etc.), separate from the post-call Fathom URL.
-- 2. Create per-meeting pre-call checklist table. Each meeting carries its
--    own checklist instead of the single project-wide list we had before.

alter table public.meetings
  add column if not exists meeting_url text;

create table if not exists public.meeting_checklist_items (
  id          uuid        primary key default gen_random_uuid(),
  meeting_id  uuid        not null references public.meetings(id) on delete cascade,
  title       text        not null,
  position    integer     not null default 0,
  done        boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists meeting_checklist_meeting_idx
  on public.meeting_checklist_items (meeting_id, position);

create trigger meeting_checklist_items_set_updated_at
  before update on public.meeting_checklist_items
  for each row execute function public.set_updated_at();

alter table public.meeting_checklist_items disable row level security;
