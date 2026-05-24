-- Cortek Dashboard — project-level start/end dates for the banner countdown.

alter table public.projects
  add column if not exists start_date date,
  add column if not exists end_date   date;
