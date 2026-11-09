# Chess — product proposals: assessment only (nothing here is implemented)

Based on the code as of this change. "Exists" lists what the repo already does, so a first version builds on it
rather than duplicating it. Effort: S ≤ 2 days, M ≈ 1 week, L > 1 week, for one developer.

## E1. Opponent roster
- **Exists:** `lib/chess/personas.ts` — three personas (Tactician, Wall, Gambiteer) that differ by MultiPV candidates + a style weight
  (`selectPersonaMove` in `engine.ts`). The file itself notes the Gambiteer does not reliably play gambit openings, and `contempt`
  is probably ignored by the bundled Stockfish. Four skill tiers (`skillTiers.ts`) set strength.
- **Benefit:** variety and a reason to return; personalities teach different lessons.
- **Risks:** "personality" that is only noise on top of Stockfish is a cosmetic clone — the existing note says so. Strength claims
  (e.g. "1400") would be unverified. Tester-visible only if a persona's difference is measurable.
- **Needs:** a measurable behavioural difference per persona (opening book for the Gambiteer; a "prefers trades / avoids trades" eval bias);
  an honest strength label (tier names, not Elo, until calibrated against a reference engine over a few hundred games).
- **First version (S–M):** keep 3 personas, give the Gambiteer a small curated opening line list for its first 6–8 moves, and show a one-line
  "plays: …" description. No Elo numbers.

## E2. Separate strength from assistance
- **Exists:** a tier bundles both: `SKILL_TIERS` couples Stockfish skill range, think time, explanation tone and how often Nivenxa speaks
  (Teacher → Master "no assistance"). Beginner Teacher = weakest engine + most coaching.
- **Benefit:** a strong beginner can face a tough engine while still getting explanations; a weak player can turn help off.
- **Risks:** the setup screen gets two choices instead of one (more to read); explanation cost (Anthropic API usage) rises if
  coaching is on at every strength.
- **Needs:** split `TierConfig` into `strength` and `coaching` fields; setup UI with sensible defaults (coaching follows strength unless changed).
- **First version (M):** keep the four tiers as presets; add one "Coaching: Full / When it matters / Off" selector under them.

## E3. Starting-level assessment
- **Exists:** nothing automatic; the player picks a tier. Puzzles carry Lichess ratings.
- **Benefit:** better first-session fit for new users.
- **Risks:** a 5-puzzle test gives a noisy estimate — it must be skippable and always overridable; ratings are Lichess difficulty, not player Elo.
- **Needs:** ~10 verified puzzles per band with the audit script's guarantees; a mapping from result to tier.
- **First version (S–M):** optional "Not sure where to start?" 5-puzzle flow after sign-up that only pre-selects a tier suggestion; manual choice unchanged.

## E4. Mate in 1–6
- **Exists:** `mateIn1` (23 puzzles) and `mateIn2` (51) are live; the database also holds mateIn3 (9) and mateIn4 (2); no mateIn5/6.
  The ratings span 399–2730, i.e. mate length is already independent of difficulty.
- **Benefit:** a natural progression; the new alternative-mate logic works for any mate puzzle.
- **Risks:** too few puzzles at depth ≥3 to balance by colour/difficulty; exhaustive verification of alternatives is only done up to
  2 solver moves left (deeper = exact stored move accepted — see `judgeMove`); "mixed" selection needs enough of both colours.
- **Needs:** more verified rows (import from the Lichess dump with `scripts/import-puzzles.ts`, then `npm run audit-puzzles`) and a depth-limited
  mate solver if alternatives at depth 3+ should be accepted.
- **First version (S):** add mateIn3 as a catalogue topic once ≥ 25 verified puzzles exist; show "side to move" mix; do not mix lengths in one set.

## E5. Optional public puzzle
- **Exists:** guests can already solve puzzles (results logged with `user_id = null`); no puzzle on the home page.
- **Benefit:** shows the teaching value without a sign-up wall.
- **Risks:** carrying a guest result through login: `puzzle_attempts` rows for a guest have no owner, so they can't be attached later without
  a client-held token. Home weight/scroll (C1 asks for less, not more).
- **Needs:** a small client-side store (sessionStorage) of the guest's result + a post-login merge action; one hand-checked featured puzzle.
- **First version (S):** a single featured mate-in-one embedded on the home page, saved to sessionStorage only; offer "Sign up to keep your progress" afterwards.

## E6. Guided learning path
- **Exists:** Learn has Basics (13 lessons), Openings, Tactics, Endgames, Rules; Puzzles topics map to Tactics lessons through
  `THEME_TO_TACTIC_SLUG` (a link, not a path). Progress exists for Basics only (`basicsProgress.ts`).
- **Benefit:** the missing "what next?" — lesson → 5 matching puzzles → a game with the matching tier.
- **Risks:** content ordering is editorial work; progress storage for Tactics/Endgames does not exist yet.
- **Needs:** per-lesson completion records (extend `basicsProgress`), a curated lesson→puzzle-topic map (already partly there).
- **First version (M):** at the end of each Tactics lesson, a "Practise it" button to the matching puzzle topic filtered to Beginner.

## E7. Practice and challenge modes
- **Exists:** the new outcome classification separates independent solves, hint-assisted solves, solution views and skips
  (`classifyOutcome`; stored when migration `20261109090000_puzzle_attempt_outcomes.sql` is applied). Games are not split this way.
- **Benefit:** an honest "independent accuracy" number.
- **Risks:** two modes double the UI surface; a score the player can game by never revealing anything.
- **Needs:** the migration applied; a definition of "challenge" (no hints, no reveal, one attempt).
- **First version (S):** on the Puzzles page, show "Solved on your own: X of Y" using `outcome = 'solved'` once the migration is live.

## E8. Progress and revision
- **Exists:** `getMyPuzzleStats` (distinct puzzles solved); attempt rows now carry outcome / hints / wrong attempts after the migration.
- **Benefit:** skill progress by topic, hint reliance, repeated mistakes, spaced revision of failed/viewed puzzles.
- **Risks:** guest history can't be merged; spaced repetition needs a schedule table and a reminder channel (none exists).
- **Needs:** migration applied, a "due for review" query (viewed/skipped puzzles older than N days), a simple Leitner-box table.
- **First version (M):** a "Revisit" list on the Puzzles page = puzzles the player viewed or skipped and never solved.

## E9. Post-game learning
- **Exists:** analysis pages (`/chess/analysis/*`), `useGameAnalysis`, `moveClassification.ts`, `positionFacts.ts`, `aiExplainMove.ts`,
  `analysisSession.ts`. The Play page can hand a game to analysis (`playToAnalysis.ts`).
- **Benefit:** turn the 2–3 biggest mistakes into puzzles from the player's own game.
- **Risks:** AI explanation cost and accuracy (the existing code already mixes engine facts with an LLM); a "turning point" needs a
  stable definition (eval swing threshold).
- **Needs:** a threshold-based turning-point finder (data already in the analysis), "Save as My Puzzle" (schema exists, see `schema.sql`).
- **First version (M):** after a game, list the top 3 eval swings with a "Try this position" button using the existing practice-position feature (`usePracticePosition.ts`).

## E10. Parent / coach support
- **Exists:** consent flow records adult vs. child accounts (`chessConsentActions.ts`); no assignment or sharing model.
- **Benefit:** the stated parent audience; coaches assigning topics.
- **Risks:** child-data rules (the privacy policy already restricts this); needs a relationship model and permissioned views — the largest scope here.
- **Needs:** data model (guardian ↔ player links), RLS, UI. Later scope as stated.
- **First version (L):** deferred. A read-only "weekly summary" email to the account holder is the smallest meaningful step.

## E11. Tournament connection
- **Exists:** tournaments list/archive/gallery, per-tournament pages with registration and payment info (`TournamentListing.tsx`), a home-page
  highlight for the next Nivenxa-hosted event, admin at `/admin/tournaments`.
- **Benefit:** link "preparing for the event" to puzzles/games without rebuilding the event pages.
- **Risks:** duplicating the event content; stale links when events change.
- **Needs:** an optional `prep_topics` field on a tournament (admin-set puzzle themes).
- **First version (S):** on a tournament page, a "Prepare" row with 2–3 puzzle topic links chosen by the admin.

## E12. Shared login
ON HOLD. Not assessed and not implemented.
