-- Cortek Dashboard — project_notes
--   * Quick scratch-pad notes per project, shown as cards in a dialog on the
--     Dashboard tab.
--   * `converted_task_id` lets us remember which notes were turned into tasks
--     (so we can show the link / dim them) without losing the original text.

create table if not exists public.project_notes (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  content             text not null,
  converted_task_id   uuid references public.tasks(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists project_notes_project_idx
  on public.project_notes(project_id, created_at desc);
