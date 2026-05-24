-- Cortek Dashboard — add start/end dates to phases

alter table public.phases
  add column if not exists start_date date,
  add column if not exists end_date   date;
