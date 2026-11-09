-- My Activity (Chess): one canonical record per PLAYED game, plus the indexes the history lists actually use.
-- Additive and backward compatible: nothing existing is altered, dropped or rewritten. NOT applied by the app —
-- run it deliberately (staging first). The app tolerates it being absent (the lists then say history is unavailable).
--
-- Data model after this migration
--   chess_games      one row per game played on NIVENXA (compact: SAN moves as one string, no per-move FENs)
--   analysis_games   saved analyses of ANY source (played / imported / recreated); unchanged. A played game's analysis is
--                    linked from chess_games.analysis_game_id instead of re-saving the game under a second identity.
--   puzzles          each puzzle once;  puzzle_attempts  references it by id (outcome columns: 20261109090000)

create table if not exists chess_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Client-generated per game, so saving the same finished game twice (retry, double click) updates one row.
  local_id uuid not null,
  status text not null default 'completed' check (status in ('in_progress', 'completed', 'resigned', 'abandoned')),
  player_color text not null check (player_color in ('w', 'b')),
  -- Who the opponent was, as shown to the player (e.g. "Nivenxa · Intermediate"), and the tier id for filtering.
  opponent text not null,
  tier text,
  -- Human label of the time control, e.g. "Rapid · 10 + 5" (null for the untimed Beginner tier).
  time_control text,
  result text check (result in ('1-0', '0-1', '1/2-1/2', '*')),
  -- null = the standard starting position. Kept so replay/PGN stay exact for any other start.
  starting_fen text,
  variant text not null default 'standard',
  -- SAN moves separated by spaces ("e4 e5 Nf3 ..."). Everything else (FENs, PGN) is derived on demand.
  moves_san text not null default '' check (length(moves_san) <= 8000),
  move_count int not null default 0,
  -- The saved analysis of this game (analysis_games), when the player has run one. Not a copy of the game.
  analysis_game_id uuid references analysis_games (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- History list: newest first, keyset pagination on (started_at, id), scoped to one user.
create index if not exists chess_games_user_started_idx on chess_games (user_id, started_at desc, id desc);

drop trigger if exists chess_games_set_updated_at on chess_games;
create trigger chess_games_set_updated_at
  before update on chess_games
  for each row
  execute function set_updated_at();

-- Row-level security: a signed-in user can only ever see/change their own rows. (The app also checks the session on
-- the server for every read and write; this is the second lock.)
alter table chess_games enable row level security;
drop policy if exists chess_games_owner on chess_games;
create policy chess_games_owner on chess_games for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Saved analyses list: newest first per user.
create index if not exists analysis_games_user_created_idx on analysis_games (user_id, created_at desc, id desc);

-- Puzzle history list: newest first per user.
create index if not exists puzzle_attempts_user_attempted_idx on puzzle_attempts (user_id, attempted_at desc, id desc);
