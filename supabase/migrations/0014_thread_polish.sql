-- Cortek Dashboard — thread polish: comment attachments + reactions.

create table if not exists public.task_comment_attachments (
  id          uuid        primary key default gen_random_uuid(),
  comment_id  uuid        not null references public.task_comments(id) on delete cascade,
  url         text        not null,
  label       text,
  position    integer     not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists task_comment_attachments_comment_idx
  on public.task_comment_attachments (comment_id, position);

create table if not exists public.task_comment_reactions (
  id          uuid        primary key default gen_random_uuid(),
  comment_id  uuid        not null references public.task_comments(id) on delete cascade,
  emoji       text        not null,
  author      text        not null default 'Anonymous',
  created_at  timestamptz not null default now(),
  -- One reaction per (comment, emoji, author) — toggling re-uses this row.
  unique (comment_id, emoji, author)
);
create index if not exists task_comment_reactions_comment_idx
  on public.task_comment_reactions (comment_id);

alter table public.task_comment_attachments disable row level security;
alter table public.task_comment_reactions    disable row level security;
