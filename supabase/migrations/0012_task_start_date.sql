-- Cortek Dashboard — add start_date to tasks so the UI can show both
-- start and end dates plus a "time left" indicator. due_date stays as
-- the end date (no rename).

alter table public.tasks
  add column if not exists start_date date;
