-- Cortek Dashboard — project_fathom_transcripts
--   * Per-project paste-inbox for Fathom call transcripts.
--   * Workflow: hit "F" on a project Dashboard, paste the transcript (and
--     optionally the Fathom share URL), save. Entries are stored as-is for
--     future reference / extraction. No task-conversion flow.

create table if not exists public.project_fathom_transcripts (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  transcript    text not null,
  fathom_url    text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists project_fathom_transcripts_project_idx
  on public.project_fathom_transcripts(project_id, created_at desc);
