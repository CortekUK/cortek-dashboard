-- Cortek Dashboard — let resource sections carry a tone color.
-- Stores one of the StatusTone names ('neutral' | 'info' | 'warning' |
-- 'success' | 'primary' | 'destructive') so the UI can map straight to
-- TONE_CLASSES (mirrors the tags.color pattern in 0010).

alter table public.resource_sections
  add column if not exists color text not null default 'neutral';
