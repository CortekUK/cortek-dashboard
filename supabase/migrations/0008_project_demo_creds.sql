-- Cortek Dashboard — demo credentials on projects (login + password used
-- to demo the live URL). Stored as plain text; revealed on demand in the UI.

alter table public.projects
  add column if not exists demo_username text,
  add column if not exists demo_password text;
