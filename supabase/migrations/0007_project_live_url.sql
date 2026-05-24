-- Cortek Dashboard — live URL on projects (deployed URL / production link).

alter table public.projects
  add column if not exists live_url text;
