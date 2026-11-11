-- NIVENXA Chess: (1) Beginner coach-introduction progress, (2) custom profile pictures.
-- Additive, nothing existing is altered. NOT applied by the app: run it deliberately (staging first).
-- The app tolerates it being absent: progress then lives in the browser only, and profile pictures report "unavailable".

-- (1) One row per COMPLETED coach game. local_id is the client-generated game id, so a retry, a double save or merging a guest's
-- progress after sign-in can never count a game twice. Rows are only ever inserted (merging cannot lower progress).
create table if not exists chess_coach_intro_games (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, local_id)
);
alter table chess_coach_intro_games enable row level security;
drop policy if exists chess_coach_intro_owner_read on chess_coach_intro_games;
create policy chess_coach_intro_owner_read on chess_coach_intro_games for select using (auth.uid() = user_id);
-- Writes go through the server route (service role), which takes the account from the session. No client insert policy on purpose.

-- (2) Profile picture: a DEDICATED table. (chess_profiles already exists from 20261022090000_chess_consent.sql with NOT NULL consent
-- columns and client insert/update policies, so it is deliberately not reused: a picture row must never depend on consent data, and a
-- client must never be able to write its own picture record.) The image is a PRIVATE storage object at "<user id>/<version>.webp";
-- the server DERIVES that path from the session's user id and this version, it never reads a path from a table.
create table if not exists chess_profile_pictures (
  user_id uuid primary key references auth.users (id) on delete cascade,
  has_picture boolean not null default false,
  avatar_version int not null default 0,
  updated_at timestamptz not null default now()
);
alter table chess_profile_pictures enable row level security;
drop policy if exists chess_profile_pictures_owner_read on chess_profile_pictures;
create policy chess_profile_pictures_owner_read on chess_profile_pictures for select to authenticated using (auth.uid() = user_id);
-- No insert/update/delete policy: only the server route (service role) writes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chess-profile-pictures', 'chess-profile-pictures', false, 524288, array['image/webp'])
on conflict (id) do nothing;
-- No storage.objects policies are created: the bucket is private, so anon and authenticated clients can neither read nor write it.
-- Only the server (service role) does, after checking the session.
