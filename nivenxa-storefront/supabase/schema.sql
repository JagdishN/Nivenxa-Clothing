-- ─────────────────────────────────────────────────────────────────────────
-- Nivenxa Chess — Puzzles + Tournaments schema
--
-- No Supabase CLI / migration tooling is set up in this project yet, so
-- this is a plain schema file rather than a numbered migration. Run it
-- once, by hand, in the Supabase SQL Editor for this project (or via
-- `supabase db push` if you later set up the CLI and link it).
--
-- RLS is intentionally OFF on both tables below. Auth isn't wired up yet,
-- so there is no session to write policies against. This means the
-- publishable (anon-equivalent) key can currently read every row in both
-- tables regardless of any `verified` filter applied in application code —
-- getPublicTournaments() filters in the query, but a direct REST call with
-- the publishable key could still read unverified rows. Add RLS policies
-- (e.g. "select where verified = true" for anonymous, full access for an
-- authenticated admin role) once real auth exists — do not ship this to a
-- production project long-term with RLS off.
-- ─────────────────────────────────────────────────────────────────────────

-- ─── Puzzles ────────────────────────────────────────────────────────────

create table if not exists puzzles (
  id uuid primary key default gen_random_uuid(),
  lichess_puzzle_id text not null unique,
  fen text not null,
  -- Space-separated UCI moves. First move is the "setup" move already
  -- played (opponent's move that creates the puzzle position); the rest is
  -- the solution sequence — this matches Lichess's own puzzle CSV format,
  -- so no reshaping is needed on import.
  moves text not null,
  rating int not null,
  themes text[] not null default '{}',
  popularity int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists puzzles_themes_idx on puzzles using gin (themes);
create index if not exists puzzles_rating_idx on puzzles (rating);

create table if not exists puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: no auth yet. Once auth exists, this should reference
  -- auth.users(id) and probably become not-null for new rows.
  user_id uuid,
  puzzle_id uuid not null references puzzles (id) on delete cascade,
  solved boolean not null,
  attempted_at timestamptz not null default now(),
  time_taken_seconds int
);

create index if not exists puzzle_attempts_puzzle_id_idx on puzzle_attempts (puzzle_id);
create index if not exists puzzle_attempts_user_id_idx on puzzle_attempts (user_id);

-- ─── Tournaments ────────────────────────────────────────────────────────

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  tournament_type text not null check (tournament_type in ('International', 'National', 'Local', 'Academy')),
  start_date date not null,
  end_date date,
  location_name text not null,
  latitude double precision,
  longitude double precision,
  fide_rated boolean not null default false,
  time_control text not null,
  format text not null,
  top_players text,
  prize_pool text,
  organizer_name text not null,
  organizer_verified boolean not null default false,
  register_url text,
  -- Organizer's WhatsApp number in international format (e.g. +91XXXXXXXXXX).
  -- Used to build a wa.me deep link on the public Register button when the
  -- organizer has no register_url of their own.
  organizer_whatsapp text,
  -- URL to an image of the organizer's own payment QR (Supabase Storage —
  -- see the `tournament-qr` public bucket below). Purely informational
  -- display on the public page; Nivenxa never processes this payment.
  payment_qr_url text,
  -- Free text: how/when this QR or WhatsApp contact was confirmed with the
  -- organizer, e.g. "Confirmed via WhatsApp with organizer on 2026-09-10".
  -- Filled in by whoever verifies the tournament — not shown publicly by
  -- itself, it's an internal provenance note for admins reviewing the row.
  payment_qr_source text,
  -- Optional short organizer-provided instructions shown alongside the QR,
  -- e.g. "Pay entry fee via UPI, mention your name in remarks".
  payment_note text,
  source text not null default 'manual' check (source in ('manual', 'imported', 'submitted')),
  source_reference text,
  -- Controls PUBLIC visibility (via getPublicTournaments()) — distinct from
  -- organizer_verified, which just records whether the organizer's own
  -- identity/credentials were checked. A tournament can have a verified
  -- organizer and still be held back from the public page (verified=false)
  -- pending a final admin review, or vice versa.
  verified boolean not null default false,
  is_live boolean not null default false,
  -- Nivenxa's own tournaments — highlighted prominently on /chess. Distinct
  -- from organizer_verified/verified, which are about trust/visibility, not
  -- who's running the event.
  is_nivenxa_organized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `create table if not exists` above is a no-op against an already-existing
-- table (as this one is, from a prior pass), so new columns added later need
-- their own explicit, idempotent `alter table` — re-running this whole file
-- is always safe.
alter table tournaments add column if not exists organizer_whatsapp text;
alter table tournaments add column if not exists payment_qr_url text;
alter table tournaments add column if not exists payment_qr_source text;
alter table tournaments add column if not exists payment_note text;
alter table tournaments add column if not exists is_nivenxa_organized boolean not null default false;

create index if not exists tournaments_verified_start_date_idx on tournaments (verified, start_date);

-- Public bucket for organizer payment QR images — informational display
-- only, Nivenxa never touches the actual payment. Public so the image URL
-- can be rendered directly on the public tournaments page without auth.
insert into storage.buckets (id, name, public)
values ('tournament-qr', 'tournament-qr', true)
on conflict (id) do nothing;

-- Keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tournaments_set_updated_at on tournaments;
create trigger tournaments_set_updated_at
  before update on tournaments
  for each row
  execute function set_updated_at();

-- RLS deliberately left disabled on both `puzzles`/`puzzle_attempts` and
-- `tournaments` — see the note at the top of this file.

-- ─── Analysis — saved games ─────────────────────────────────────────────

-- Chess has no login at all yet (see puzzle_attempts.user_id above), so "My
-- Games" can't be scoped to a real account. owner_id is a random id the
-- client generates once and stores in localStorage (analysisOwner.ts) —
-- games are private to that browser, not to a person. Every access goes
-- through a Server Action filtering by owner_id (analysisActions.ts); RLS
-- stays off, same posture as puzzle_attempts, since there's no session to
-- write policies against yet.
create table if not exists analysis_games (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  -- Client-generated, stable across re-saves of the same reconstruction —
  -- the upsert target for "Save this game" being called more than once
  -- (Verify Game, then again from Game Summary) without creating duplicates.
  local_id uuid not null,
  source text not null check (source in ('paste', 'pgn-upload', 'manual', 'image-ocr', 'pdf-ocr', 'nivenxa-play')),
  white text,
  black text,
  event text,
  played_on date,
  result text check (result in ('1-0', '0-1', '1/2-1/2', '*')),
  starting_fen text,
  -- NormalizedMove[] — see src/lib/chess/analysisTypes.ts.
  moves jsonb not null,
  move_count int not null default 0,
  -- Cached QualityMoveEntry[] once the Player's Stockfish pass has completed
  -- once, so reopening a saved game from My Games doesn't always re-run the
  -- full engine pass from scratch.
  analysis jsonb,
  accuracy_white int,
  accuracy_black int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, local_id)
);

create index if not exists analysis_games_owner_id_idx on analysis_games (owner_id);
create index if not exists analysis_games_created_at_idx on analysis_games (created_at desc);

drop trigger if exists analysis_games_set_updated_at on analysis_games;
create trigger analysis_games_set_updated_at
  before update on analysis_games
  for each row
  execute function set_updated_at();

-- Positions a player has flagged from their own analyzed games as worth
-- practicing again later ("Save as My Puzzle" from a Practice Position) —
-- same owner_id/no-auth posture as analysis_games above.
create table if not exists analysis_practice_positions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  source_game_id uuid references analysis_games (id) on delete set null,
  fen text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists analysis_practice_positions_owner_id_idx on analysis_practice_positions (owner_id);
