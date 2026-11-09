# NIVENXA Chess: My Activity (personal history) vs Analysis (start something)

## Routes
| Route | Purpose |
|---|---|
| `/chess/analysis` | Start an analysis: Import/PGN, Recreate, choose one of My Games. Link "View my saved analyses". Open to guests. |
| `/chess/activity` | Redirects to `/chess/activity/games`. Heading + tabs. Guests are sent to `/chess?auth=login&redirect=<path>` and return to the page they asked for. |
| `/chess/activity/games` | My Games. Filters, keyset pagination (`?filter=&cursor=`). Replay, Analyse / View analysis, Download PGN. |
| `/chess/activity/games/[id]` | Replay (moves rebuilt from compact SAN). |
| `/chess/activity/analyses` | My Analyses (summary columns only). Open analysis, delete (two-step). |
| `/chess/activity/puzzles` | My Puzzles: outcome per attempt, Retry, saved positions. |
| `/chess/analysis/my-games` | Redirects to `/chess/activity/analyses` (filters kept; `analyzed`→`analysed`). |
| `/chess/analysis/my-puzzles` | Redirects to `/chess/activity/puzzles`. |
| `/chess/puzzles/<topic>?puzzle=<lichessId>` | Deep link used by Retry. |

Entry point for signed-in users: the avatar "Account menu" (full email, My Activity, Log out).

## Data model (migration `20261110090000_chess_activity.sql`, additive, NOT applied)
- `chess_games`: one canonical record per played game. Moves are compact SAN text (`moves_san`, max 8000 chars), plus `starting_fen`/`variant` (kept so non-standard starts replay), status, colour, tier, time control, result, `analysis_game_id` (nullable FK, on delete set null). `unique(user_id, local_id)` makes the save idempotent. Written once when a game finishes (no clock ticks, no per-move FENs). RLS: `user_id = auth.uid()`.
- Analyses reference the game (`analysis_game_id` / `NormalizedGame.playedGameId`) instead of copying it from the new flow.
- Puzzles are referenced by `puzzle_id`; outcome/hints/wrong attempts come from the earlier unapplied migration `20261109090000_puzzle_attempt_outcomes.sql`.
- Indexes: `chess_games (user_id, started_at desc, id desc)`, `analysis_games (user_id, created_at desc, id desc)`, `puzzle_attempts (user_id, attempted_at desc, id desc)`.
- Server actions (`src/lib/chess/activityActions.ts`) always take the user from the server session; the service key bypasses RLS so ownership is enforced in code.

## Measurements (`docs/chess-activity-measurements.json`, read-only, aggregates)
- Synthetic 40-ply game: existing `moves` JSON 9,141 B vs SAN text 156 B (58.6x). Measures the shapes, not real data.
- Live `analysis_games`: 0 rows. `puzzle_attempts`: 270 rows. `chess_games` and the outcome columns do not exist yet.
- 20-row analysis list: with payload columns 241 ms median, summary-only 224 ms median (single remote client, 7 reps; small gap because the table is empty).
- Puzzle history join, 21 rows: 235 ms median.
- Query plans (EXPLAIN) are not obtainable through PostgREST; not measured.

## Not done / limits
- No test accounts: real signed-in saves, two-user isolation and RLS were not exercised. UI verified with fixtures (`/chess/dev-preview/activity`, dev only) and mocked auth.
- Resume is not implemented (Play has no resumable state; no `in_progress` rows are written).
- Puzzle "Review" is the same action as Retry.
- Analysis runs in the browser, so queued/processing/failed job states do not exist; My Analyses shows complete vs saved-not-analysed.
- Legacy Play games saved through analysis stay under My Analyses, not My Games.
- `analysis_games.moves` still stores FENs; compacting it and storing engine/depth metadata is a recommended follow-up.
