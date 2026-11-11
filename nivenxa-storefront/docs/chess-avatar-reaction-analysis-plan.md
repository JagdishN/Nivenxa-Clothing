# Avatar reactions: how they would use move analysis (design only, nothing integrated)

Status: a plan from inspecting the code. No engine, Play or app code was changed. The numbers below that are about the real game are NOT measured; only the prototype's own cost was.

## What already exists (reuse, do not duplicate)
- `src/lib/chess/useMoveAnalysis.ts`: grades each move into a ply-keyed `entries` array (`QualityMoveEntry`: `ply`, `color`, `fenBefore/After`, `evalBeforeCp`, `evalAfterCp`, `cpLoss`, `classification`, `bestMoveUci`).
  - Player moves are always graded. Engine moves are graded only at Expert/Master; at lower tiers they are `kind: 'purpose'` (no grade).
  - It runs on its OWN Stockfish instance (`useStockfish`), serialised through a promise queue, `ANALYSIS_DEPTH = 14`, `ANALYSIS_MOVETIME = 500 ms`, and a `generationRef` that drops queued work after reset/undo.
- `src/lib/chess/moveClassification.ts`: `classifyMove(cpLoss)`: inaccuracy 50–99, mistake 100–299, blunder ≥ 300 cp (best ≤ 5 cp).
- `src/lib/chess/engineEval.ts`: `evaluationToCp` maps mate to ±100000.
- Analysis of finished games reuses these entries (`NivenxaNoticed`, post-game review).

## Rule: the avatar only READS `entries`
No new analysis job, no new worker message, no extra depth for animation. If an entry never arrives (mode off, tier ungraded, analysis error, too late), the avatar stays neutral.

## Trigger (guided / coached play only)
All must hold:
1. `entries` contains a `kind: 'quality'` entry for the PLAYER's move, `classification` is `mistake` or `blunder`, and the entry is final (not mid-update).
2. Same-perspective check: `cpLoss` is already mover-relative; never compare raw White-perspective evals.
3. Mate/forced safeguards: skip when the move was forced (one legal move from `fenBefore`), when `|evalBeforeCp|` or `|evalAfterCp|` is in mate range on BOTH sides (loss is meaningless), or when the mover is still clearly winning after the move (e.g. `evalAfterCp` for the mover ≥ +600) or was already lost before it (≤ −600): review note only.
4. Not stale: key = (game generation, ply, `fenAfter`). Drop if the game was reset/undone/left, or if the position has moved on by more than one ply or more than about 8 s since the move.
5. Not repeated: one reaction per (game, ply). Inaccuracy never triggers a facial reaction; it goes to review.
Result: a 1–2 s supportive/concerned pose, then back to idle. Words go in the coaching panel, optionally.

## Gating by mode
- No-assistance / challenge: the avatar does not read `entries` until the game is over (reactions appear in post-game review). No face, colour, text or timing leak. "Thinking" length follows real engine time only and uses one expression for every move.
- Planned Learning-Partner slip: driven by the training scenario's own flag, not by evaluation. The avatar does NOT announce it. Acknowledge only after the player exploits it, asks for help, or in review.

## What must be measured at integration (not yet measured)
- Engine work: count of Stockfish `go` commands per game before/after; expected delta is zero (reaction layer subscribes to existing entries).
- Move responsiveness: time from move input to board update (Performance marks) before/after; long tasks > 50 ms during moves.
- Avatar cost: per-second main-thread time with the avatar idle, thinking and reacting (prototype figures are in `animation-measurements.json`; they are desktop headless Chromium only).
- Bundle: added bytes for the layered avatar and CSS (prototype: layered SVG 3.8 KB, CSS ~5 KB, before gzip).
