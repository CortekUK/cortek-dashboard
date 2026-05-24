-- Cortek Dashboard — task threads + dev onboarding

-- Per-project free-form welcome text for the Onboarding tab.
alter table public.projects
  add column if not exists onboarding_overview text;

create table public.task_comments (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks(id) on delete cascade,
  author      text        not null default 'Anonymous',
  body        text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

create trigger task_comments_set_updated_at
before update on public.task_comments
for each row execute function public.set_updated_at();

create table public.onboarding_steps (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  title       text        not null,
  body        text,
  position    integer     not null default 0,
  done        boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index onboarding_project_idx on public.onboarding_steps (project_id, position);

create trigger onboarding_set_updated_at
before update on public.onboarding_steps
for each row execute function public.set_updated_at();

-- Same single-user mode — TODO(auth) when user management lands.
alter table public.task_comments   disable row level security;
alter table public.onboarding_steps disable row level security;
