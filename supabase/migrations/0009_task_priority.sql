-- Cortek Dashboard — add priority enum + column to tasks. Used by the
-- Today picker filters and surfaced as a colored chip on every task row.

create type task_priority as enum ('low', 'medium', 'high', 'urgent');

alter table public.tasks
  add column if not exists priority task_priority not null default 'medium';

create index if not exists tasks_priority_idx on public.tasks (priority);
