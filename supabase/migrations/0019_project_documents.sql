-- Cortek Dashboard — project_documents
--   * Unified file store for project-level docs (agreement, invoices, proposals,
--     briefs, anything else).
--   * `category` keeps the Documents tab groupable + filterable.
--   * `replaces_id` lets us version the agreement (latest of chain = current).
--   * `amount` is invoice-specific but cheap to keep on this table; null for
--     other categories.
--   * Storage lives in the 'project-documents' bucket (private — we serve
--     downloads via signed URLs from the client).

do $$ begin
  create type public.project_document_category as enum (
    'agreement', 'invoice', 'proposal', 'brief', 'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.project_documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  category        public.project_document_category not null default 'other',
  name            text not null,
  storage_path    text not null,
  mime_type       text,
  size_bytes      bigint,
  amount          numeric(12,2),
  notes           text,
  replaces_id     uuid references public.project_documents(id) on delete set null,
  uploaded_by     uuid references auth.users(id) on delete set null,
  uploaded_at     timestamptz not null default now()
);

create index if not exists project_documents_project_idx
  on public.project_documents(project_id, uploaded_at desc);

create index if not exists project_documents_category_idx
  on public.project_documents(project_id, category, uploaded_at desc);

-- Storage bucket — private. Downloads use signed URLs created at request time.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 52428800) -- 50 MB
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "project_documents_select" on storage.objects;
drop policy if exists "project_documents_insert" on storage.objects;
drop policy if exists "project_documents_update" on storage.objects;
drop policy if exists "project_documents_delete" on storage.objects;

create policy "project_documents_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-documents');

create policy "project_documents_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'project-documents');

create policy "project_documents_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'project-documents')
  with check (bucket_id = 'project-documents');

create policy "project_documents_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'project-documents');
