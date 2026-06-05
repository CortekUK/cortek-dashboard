-- Cortek Dashboard — project_notes rich content
--   * `content_blocks` is the BlockNote JSON document (source of truth for the
--     rich editor). `content` is still maintained as a plain-text projection so
--     existing previews + convert-to-task keep working.
--   * `project-notes` storage bucket holds images pasted/uploaded inside notes.
--     Bucket is public so the editor can render inline <img src="…public-url">
--     without per-request signed URLs.

alter table public.project_notes
  add column if not exists content_blocks jsonb;

-- Storage bucket — public-read so embedded images render directly.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-notes', 'project-notes', true, 10485760) -- 10 MB
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "project_notes_select" on storage.objects;
drop policy if exists "project_notes_insert" on storage.objects;
drop policy if exists "project_notes_update" on storage.objects;
drop policy if exists "project_notes_delete" on storage.objects;

create policy "project_notes_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-notes');

create policy "project_notes_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'project-notes');

create policy "project_notes_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'project-notes')
  with check (bucket_id = 'project-notes');

create policy "project_notes_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'project-notes');
