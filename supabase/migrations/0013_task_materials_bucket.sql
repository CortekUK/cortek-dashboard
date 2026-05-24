-- Cortek Dashboard — create the storage bucket used by the task workspace
-- for uploaded documents, images, and PDFs. Public bucket so the URLs we
-- save in task_attachments.url resolve without signing.
--
-- Single-user dev: permissive policies for the anon role on this bucket.
-- TODO(auth): tighten when user management lands.

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-materials', 'task-materials', true, 52428800) -- 50 MB
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Policies (drop-first so re-running this migration is safe)
drop policy if exists "task_materials_select" on storage.objects;
drop policy if exists "task_materials_insert" on storage.objects;
drop policy if exists "task_materials_update" on storage.objects;
drop policy if exists "task_materials_delete" on storage.objects;

create policy "task_materials_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'task-materials');

create policy "task_materials_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'task-materials');

create policy "task_materials_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'task-materials')
  with check (bucket_id = 'task-materials');

create policy "task_materials_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'task-materials');
