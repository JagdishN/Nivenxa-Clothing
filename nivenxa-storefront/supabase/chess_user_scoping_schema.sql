-- Chess now has real auth (email OTP — see chessAuth.ts), but every write
-- path that predates it (analysis_games, analysis_practice_positions) still
-- only knows a client-generated anonymous owner_id, and puzzle_attempts'
-- user_id column was never actually populated (always inserted as null —
-- see puzzleActions.ts). This adds the missing user_id columns so a
-- logged-in user's saved games, practice positions, and solved puzzles are
-- actually tied to their account, not just their browser.
--
-- owner_id/local_id stay as they are — still required for guests (chess
-- stays fully usable without logging in) and still the upsert conflict
-- target for analysis_games. user_id is purely additive: null for a guest,
-- set once a session exists at save time.
alter table analysis_games add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists analysis_games_user_id_idx on analysis_games (user_id);

alter table analysis_practice_positions add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists analysis_practice_positions_user_id_idx on analysis_practice_positions (user_id);

-- Note: pre-existing rows saved before this migration (or before a user
-- ever logged in) keep user_id = null — there is no reliable way to match
-- an old anonymous owner_id row to a real account after the fact, so this
-- is not a backfill. Going forward, every new save while logged in sets
-- user_id; going forward, every read while logged in filters by it.
