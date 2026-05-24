-- Cortek Dashboard — group project resources into named, reorderable sections.
-- Adds:
--   * public.resource_sections (one row per group inside a project)
--   * public.resources.section_id  (nullable; null = unsectioned)
--   * public.resources.position    (ordering within section)
-- Backfill: for every project that already has resources, create a single
-- "General" section and slot the existing rows into it, preserving created_at
-- order as the initial position.
--
-- RLS: disabled, mirroring the rest of the schema (single-user dev).

-- ──────────────────────────────────────────────────────────────────────────
-- resource_sections
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.resource_sections (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  name        text        not null,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists resource_sections_project_idx
  on public.resource_sections (project_id, position);

drop trigger if exists resource_sections_set_updated_at on public.resource_sections;
create trigger resource_sections_set_updated_at
  before update on public.resource_sections
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- resources: new columns
-- ──────────────────────────────────────────────────────────────────────────

alter table public.resources
  add column if not exists section_id  uuid references public.resource_sections(id) on delete set null,
  add column if not exists position    integer not null default 0;

create index if not exists resources_section_idx
  on public.resources (section_id, position);

-- ──────────────────────────────────────────────────────────────────────────
-- Backfill: one "General" section per project that has unsectioned resources.
-- ──────────────────────────────────────────────────────────────────────────

with new_sections as (
  insert into public.resource_sections (project_id, name, position)
  select distinct project_id, 'General', 0
  from public.resources
  where section_id is null
  returning id, project_id
),
ordered as (
  select
    r.id,
    ns.id as new_section_id,
    row_number() over (
      partition by r.project_id
      order by r.created_at
    ) - 1 as new_position
  from public.resources r
  join new_sections ns on ns.project_id = r.project_id
  where r.section_id is null
)
update public.resources r
   set section_id = ordered.new_section_id,
       position   = ordered.new_position
  from ordered
 where ordered.id = r.id;

-- ──────────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────────

alter table public.resource_sections disable row level security;
