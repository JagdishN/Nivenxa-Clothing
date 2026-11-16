-- Admin-managed tournament photos (uploaded from /admin/tournaments/<id>/edit, watermarked on upload).
-- NOT applied to any environment by this repo change. Apply it yourself (staging first):
--   npm run apply-schema -- supabase/migrations/20261116090000_tournament_photos.sql   (or paste into the Supabase SQL editor)
-- The app reads this table tolerantly: if it does not exist yet, the gallery simply shows only the photos listed in code.

create table if not exists tournament_photos (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments (id) on delete cascade,
  -- The tournament's start date at upload time (YYYY-MM-DD). Also the "folder" name inside the bucket path.
  date_key text not null,
  -- Path inside the private tournament-photos bucket: <tournament_id>/<date_key>/<uuid>.webp (the watermarked copy).
  storage_path text not null unique,
  alt text not null default '',
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tournament_photos_tournament_idx on tournament_photos (tournament_id, sort_order, created_at);

-- Only the server (service-role key) reads or writes this table; no public policies.
alter table tournament_photos enable row level security;

-- Private bucket: photos are served through /api/chess/photos/<id> (cached, hotlink-checked), never by a public URL.
insert into storage.buckets (id, name, public)
values ('tournament-photos', 'tournament-photos', false)
on conflict (id) do nothing;
