# NIVENXA Chess — issue tracker (every requirement in the brief)

Scope: Chess only, plus the shared footer-gap fix the brief later authorised (Chess, Living, Studio, root pages).
Not touched: shared login layout/styling, account/session policy, Living/Studio/Technologies behaviour other than the footer frame.
Nothing was deployed, no production data changed, no migration applied. "Verified" = I ran it and saw it; "Not verified" says so plainly.

Status key: **Fixed** (defect confirmed, fixed, tested) · **Working** (checked, no change needed) · **Partial** · **Not done** · **Proposal** (assessed only, in `docs/chess-enhancement-assessment.md`).

## Baseline (before any change)
- `tsc --noEmit`: clean. `eslint src/app/chess src/lib/chess src/components/chess`: **40 problems (35 errors, 5 warnings)**, all pre-existing.
- `/chess/puzzles` on `next dev`, warm, 5 samples: 4.99, 3.22, 3.31, 3.21, 3.22 s (median **3.22 s**).
- Puzzle data audit (`npm run audit-puzzles`, read-only, 258 puzzles): all FENs/moves legal, mate labels consistent, no duplicate FENs → **nothing to quarantine**. Two mate-in-one puzzles (`oM7y3`, `02NvQ`) have more than one mating move.
- Existing Playwright specs `strength-slider-ui` and `draw-resign-ui` already fail: they look for a range slider that no longer exists in the Play UI (`type="range"` appears nowhere in `play/page.tsx`). Not caused by this work; replaced by `chess-play-smoke.spec.ts`. They were not deleted.

## Final state
- `tsc --noEmit` clean. `eslint` same scope: **36 problems (33 errors, 3 warnings)** — fewer than baseline; none in files I created. `next build` passes.
- Unit tests `npm run test:unit`: **22/22**. Browser tests on the production build (`next start`): **14/14** (`chess-puzzles` 9, `chess-play-smoke` 2, `chess-auth` 2, `chess-engine-measure` 1).

## Tracker

| # | Requirement | Evidence | Files | Status |
|---|---|---|---|---|
| A1 | Test isolation: test accounts, no mutation of real records, solved/failed/skipped/revealed/resumed/interrupted attempts | Every browser test aborts the save call (server-action POST) and counts attempts; nothing was written. Solved, hint-solved, skipped, revealed and replayed attempts are exercised. **No test accounts exist or were created**; authenticated flows (stats line, server-side solved dedupe, sign-out) were not run. "Resumed" and "interrupted" are not applicable/implemented (see B8). | `tests/chess-puzzles.spec.ts` | **Partial** |
| A2 | Performance: measure home, click feedback, catalogue, topic, filters, game start, engine, auth | See "Measurements". Measured: catalogue + topic data fetch and page response (dev and prod), click-to-feedback, content-ready, home height, game start, engine reply, main-thread stalls. **Not measured:** filter-change latency (filters are links, same path as topic load), bundle size/images, auth and sign-out latency (no OTP access/session). Cause found: `getThemeSummaries` ran 18 sequential Supabase queries. | `scripts/bench-puzzle-queries.ts`, tests `*-measure.spec.ts` | **Partial** |
| A3 | Navigate immediately, then load content | `loading.tsx` skeletons for catalogue and topic; heading/nav/URL consistent; board placeholder + inert buttons; error boundary with retry; keyed puzzle component; Back/Forward tested. In-page click→skeleton **33 / 40 / 45 ms** on the production build with 1.5 s injected server delay. **Not verifiable in `next dev`** (no prefetched fallback) — only in a production build. Failure screen verified by reading code only (no way to force a server failure without stubbing Supabase). Stale-request handling is Next's interruptible navigation + keyed components; no dedicated race test. | `puzzles/(catalogue)/loading.tsx`, `[theme]/loading.tsx`, `PuzzleSkeletons.tsx`, `error.tsx`, `puzzles.ts` | **Fixed** (error screen: not browser-verified) |
| A3b | Real 404 for unknown topics | Streaming started before the page's `notFound()` → HTTP 200 + noindex. Fixed with a pure slug check in `[theme]/layout.tsx` and a route group so the topic route has its own loading boundary. Test asserts status 404. | `[theme]/layout.tsx`, `(catalogue)/` | **Fixed** |
| A4 | Engine responsiveness | Engine already runs in a Web Worker (`stockfish-18-lite-single`), has "Loading engine…" / "Engine thinking…" / error states, cancels stale replies, destroys on unmount. Measured: no long task >121 ms. **Added:** 20 s start-up timeout (a worker that never answers used to leave "Loading engine…" forever). Start-up failure and timeout paths not exercised in a browser. | `lib/chess/engine.ts` | **Working** + small fix |
| B1 | Try again only after completion | Was rendered on every unfinished puzzle. Now: open puzzle = Hint, Show solution, Skip; solved = Next (primary) + Try again + Replay; revealed = Try yourself + Next. Tested. | `PuzzleSolver.tsx` | **Fixed** |
| B2 | Puzzle correctness audit; alternative solutions; quarantine | Audit script: 258 puzzles, 0 illegal/mislabelled/duplicate. `judgeMove` now accepts any move that forces mate when the puzzle is a labelled mate with ≤2 solver moves left (both mate-in-one puzzles with alternatives covered by a unit test). **Limit:** mate-in-3+ first moves accept only the stored move (exhaustive search too slow); non-mate tactics accept only the stored move. Nothing needed quarantining, so no rows were changed. | `puzzleLogic.ts`, `scripts/audit-puzzles.ts`, `docs/chess-puzzle-audit.json` | **Fixed** (bounded) |
| B3 | Difficulty and ratings | Ratings are Lichess puzzle ratings (difficulty for real players); the beginner/intermediate/advanced cut-offs (≤1200, ≤1800) are this app's own. "Mate in One 399–2397" is real data (23 puzzles: 19 beginner, 3 intermediate, 1 advanced); only "All" and "Beginner" show because bands under 8 puzzles are hidden by design (`MIN_BAND_PUZZLES`). Counts, card ranges and listed puzzles come from the same function — unit-tested incl. band edges. Topic breadcrumb now carries the level back. Plain-language note on the catalogue. Failure vs "no matches" now distinct (error boundary vs empty state). No puzzle was relabelled. | `puzzles.ts`, `PuzzleCatalogueGrid.tsx`, tests | **Fixed** |
| B4 | Position-specific hints | Generic "Look at each of your pieces…" replaced by 3 tiers built from the stored move in the actual position (mate length, check/capture/promotion/quiet, then piece + square, then the move). Theme sentence only appended for non-mate puzzles. Hint-assisted solves are classified separately. | `buildHints` | **Fixed** |
| B5 | Solution explanations | Mate: the mating move, the checking piece(s), which king squares are blocked/attacked/on the check line, "no capture or block" — all computed from the board; mate-in-two lists every defence with its mating reply. Fork: both targets from real attacks. Other tactics: the line + real material gain. Replay button. **Not done:** a general threat/defence explanation for pins, skewers, deflection etc. (only the line and material result). | `explainSolution`, `mateAnatomy` | **Partial** |
| B6 | Wrong-move feedback | Names a legal defence ("That is check, but it is not mate: Black can reply Ke7"), "does not give check", or "your piece can simply be captured" — only facts verified on the board; illegal moves distinguished; board snaps back and allows another try; alternative mates are not called wrong. | `explainWrongMove` | **Fixed** |
| B7 | Explicit objectives | "White to move — checkmate in one move." / "…checkmate in 2 moves." / theme objectives; side to move always shown. | `objectiveText` | **Fixed** |
| B8 | Progression and persistence | One result per puzzle visit (`recordedRef`); replay/Try again is practice and never saved; revealed solution is `solution_viewed` and never counts as solved; a logged-in player's second solved result is not inserted (server). Skip records `skipped`. Double-click on Skip/Next/Previous no longer skips two puzzles (found by a test). **Needs migration** `20261109090000_puzzle_attempt_outcomes.sql` for the richer columns; **not applied** — until then the legacy `solved` column is written (true only for genuine solves) so nothing breaks. **Not done:** resume after refresh (never supported), merging guest results at login (guest rows have no owner), recording an abandoned attempt. | `puzzleActions.ts`, `PuzzleSolver.tsx`, migration | **Partial** |
| B9 | Feedback | One `aria-live` status region beside the board; save failure shown as a toast; Share feedback unchanged. The nav's one-time "Help us improve" popup used to appear mid-puzzle/mid-game — now suppressed on `/chess/puzzles/*` and `/chess/play`. | `PuzzleSolver.tsx`, `ChessNav.tsx` | **Fixed** |
| C1 | Reduce home scrolling | Desktop 2103 → **1347 px**, mobile 2796 → **2218 px**. Compact hero, tournament as a one-row summary (275 → 142 px) linking to details, repeated banner removed, shorter card copy, smaller footer gap. Body text size unchanged (17.28 px / 15.2 px). | `ChessLandingContent.tsx`, `Chess.module.scss` | **Fixed** |
| C2 | Action wording | "PLAY START PLAYING" → "Start playing" (primary) + "Try a puzzle" (secondary outline). | same | **Fixed** |
| C3 | Honest teaching promise | "Every move explained" removed (Master has no commentary, Expert a dashboard): hero, subtext, cards and page titles now describe Teacher/Coach/Expert/Master accurately. | `page.tsx`, `layout.tsx`, landing | **Fixed** |
| C4 | Puzzle layout | Header compacted; redundant back link and "You're playing White" sentence removed; board first. At 1280×720 the board now ends at **661 px** (was 865) and the Hint button at 415 px (was 716). Mobile 390×844: board fully visible, **Hint is ~65 px below the first screen** (909 px) — not fixed. | `[theme]/page.tsx`, `Puzzles.module.scss` | **Partial** |
| C5 | Catalogue organisation | Themes preserved; overlap/rating note added; counts accurate. No glossary for unfamiliar terms (e.g. "Decoys", "Clearance"). | `PuzzleCatalogueGrid.tsx` | **Partial** |
| C6 | Route titles / navigation | Titles for Home, Play (new `play/layout.tsx`), Puzzles, each topic; nav follows URL; direct link/refresh/Back/Forward tested; level preserved. | metadata files | **Fixed** |
| C7 | Board accessibility/responsiveness | **Tap-to-move was disabled on every board except one lesson** (`selectable` only on when `onSquareClick` was passed) → fixed in the shared Board; tested by clicking. Typed-move input added to puzzles as the keyboard/screen-reader route (chessground has none). Orientation, legal-move dots, check highlight: existing. **Not done:** promotion choice (always queen except where a puzzle stores another piece), typed-move entry on Play/Learn, a touch-target audit, on-screen-keyboard overlap checks. | `Board.tsx`, `PuzzleSolver.tsx` | **Partial** |
| D | Chess authentication | Code reviewed. Added: auto-verify at 6 digits (typed/pasted/autofilled), digit-only input, one request per attempt (ref guard), friendly expired/rate-limit/offline messages, "Send a new code" with 30 s cooldown and confirmation, alerts with `role="alert"`, "Signing out…" state. Verified with **mocked** Supabase responses only. **Not verified:** the real project's OTP length (assumed 6 — a dashboard setting; if it is 8, change `OTP_LENGTH`), real expiry/rate limits, session expiry behaviour, sign-out latency, guest-progress preservation. Shared login layout/styling untouched. | `_auth/ChessOtpForm.tsx`, `ChessNav.tsx` | **Partial** |
| F | Shared main/footer gap | See `docs/chess-footer-gap.md`: four stacked spacings + per-page `min-height:100vh`. Gap 112–246 px → 24–38 px on most pages; short page footer reaches viewport bottom. | `_variables.scss`, `SiteFooter.module.scss`, `PageShell` | **Fixed** (see doc) |
| E1–E11 | Product proposals | Assessed, not implemented. | `docs/chess-enhancement-assessment.md` | **Proposal** |
| E12 | Shared login | ON HOLD — nothing done. | — | **Proposal** |

## Measurements

Conditions: Windows 11 dev machine, home network to Supabase, Chromium via Playwright, warm unless stated. `next dev` = dev server on :3000; "prod" = `next build` + `next start` on :3100. Browser automation command duration is **not** used as a site metric; click→feedback is measured inside the page with `performance.now()`.

| Metric | Before | After |
|---|---|---|
| Catalogue data fetch (this machine → Supabase), median of 7 | 3370 ms (slowest 3922) | **190 ms** (slowest 264) |
| Topic data fetch, median of 7 | 385 ms | **187 ms** |
| `/chess/puzzles` full response, `next dev`, 5 samples | median 3.22 s (3.21–4.99) | median **0.40 s** (0.37–0.43, one 1.72 s outlier) |
| `/chess/puzzles` full response, prod, 7 samples | not measured (no prod build before) | median 216 ms (198–281); first byte 15–40 ms (the loading shell) |
| `/chess/puzzles/mateIn1` full response, prod | not measured | median 203 ms |
| Click on "Puzzles" → skeleton + heading visible (prod, 1.5 s injected delay) | no feedback until content arrived (old Learn page stayed) | **33–45 ms** (3 runs) |
| Chess home height, desktop 1280×800 | 2103 px (2282 px before the footer fix) | **1347 px** |
| Chess home height, mobile 390×844 | 2796 px (2924 px) | **2218 px** |
| Puzzle page, 1280×720: board bottom / Hint bottom | 865 px (off-screen) / 716 px | **661 px / 415 px** |
| Engine: Start Game → ready (median of 5) | — | 65 ms (engine preloads on the setup screen) |
| Engine: tapped move → Beginner reply (median of 5) | — | 1156 ms; longest main-thread task 57–121 ms |

Notes: the dev-server numbers include Next's dev compile overhead; they are before/after comparisons on the same setup, not production timings. No improvement is claimed for bundle size, images or rendering — not measured.

## Screenshots (`docs/chess-screenshots/`)
`before/` and `after/` — footer gap on 12 pages × desktop/mobile (before shots are cut to one viewport by the `<body>`-scroll artefact described in the footer doc) · `home-before/`, `home-after/` — Chess home · `puzzle-layout-before/`, `puzzle-layout-after/` — puzzle page at laptop/mobile sizes · `puzzles/` — loading skeleton, fresh puzzle, solved, solution-viewed, wrong-move states · `engine/engine-timing.json`.

## Remaining decisions / blockers
1. **Apply migration `20261109090000_puzzle_attempt_outcomes.sql`** (staging first) to start storing outcome/hints/wrong-attempts. Until then nothing is lost; richer stats and the "solved on your own" view wait on it.
2. Confirm the Supabase **OTP length** (code assumes 6) and whether auto-verify on the sixth digit is wanted.
3. No test accounts exist; authenticated puzzle stats, sign-out latency and guest→login merging need a seeded staging user.
4. Promotion choice (underpromotion) and typed-move entry outside puzzles are not built.
5. Two pre-existing Playwright specs (`strength-slider-ui`, `draw-resign-ui`) are stale — rewrite or delete (your call).
6. `app/globals.css` makes `<body>` the scroll container (`html, body { height:100%; overflow:auto }`), contradicting the comment in `globals.scss`; deliberately left alone (affects every app).
7. Mobile puzzle Hint button is ~65 px below the first screen at 390×844.
8. **`.env.local.example` is a tracked file and currently has a modified `ADMIN_TOURNAMENTS_PASSWORD` line** (not from this work). If that is a real password it must not be committed; `.env.local` (the file the app reads) was last modified in September.
