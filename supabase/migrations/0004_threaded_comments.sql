-- Cortek Dashboard — threaded comments (replies)

alter table public.task_comments
  add column if not exists parent_id uuid
    references public.task_comments(id) on delete cascade;

create index if not exists task_comments_parent_idx
  on public.task_comments (parent_id);
