-- Cortek Dashboard — assigned developer on projects
--   Shown on the dashboard info card alongside the client. Free-text for now
--   (matches how task assignees are stored) so we can pick from existing
--   assignee names without a hard FK.

alter table public.projects
  add column if not exists developer_name text;
