# Tivvi opponent avatar: limited local/test integration

Status: TEST ONLY. Not approved for deployment. Names, default avatar A/B and the other seven characters are untouched. Uncommitted.

## What is integrated
- Only on **Play**, in the opponent row, and only in builds made with `NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1`. Without the flag the page is exactly as before.
- Files: `src/app/chess/play/avatar/{TivviAvatar,OpponentAvatar,useAvatarSettings}` (+ SCSS), `src/lib/chess/avatarReaction.ts` (pure rules), small wiring in `src/app/chess/play/page.tsx` (`gameKey`, opponent row).
- The layered Tivvi artwork lives in the client bundle of a flagged build. Masters and the other seven stay in `Private-Assets`. A deploy would expose Tivvi's display art: decide before shipping.

## Behaviour (all from the brief)
| Situation | Avatar |
|---|---|
| Game starts | brief greeting (1.5 s); caption stays until the first move |
| Engine computing its move | `thinking` pose, driven by the page's real `engineThinking` flag (no timers, no random delay); same for every tier and move |
| Beginner | live reactions from EXISTING confirmed grades (`useMoveAnalysis` entries) |
| Intermediate | live reactions only while coaching is live (not in Rapid, which defers to post-game) |
| Expert / Master | no live reactions; thinking + greeting + result still work; no extra analysis engine |
| Confirmed mistake/blunder of the player | `concern` pose 1.5 s; caption stays until the player moves again |
| Inaccuracy, forced move, mate-range, already-lost, still-winning | no reaction |
| Game over | win: warm acknowledgement; draw: calm; loss/resign: warm encouragement; held until a new game |
| Undo / restart / leaving the page | pose and caption cleared; late results ignored (move at that ply must match) |
| Animation off, OS reduced motion | poses and captions only, no movement, no tweens |
| Off-screen / hidden tab | nothing runs (bursts are not scheduled) |
| < 64 px (48 px on phones) | blink only, no head/ear motion, instant pose changes |

Never started by the avatar: Stockfish jobs, explanation requests. It only reads `entries`.

## Verification
- Unit: `tests/unit/avatarReaction.test.ts` (10) covers gating by tier/mode, safeguards, freshness, restart/undo staleness, caption lifetime. Full unit suite: 62 passing at last run.
- Real game (production build, flag on): `tests/chess-avatar-play.spec.ts` (8): greeting + caption, thinking aligned with "Engine thinking…", resign result persists, reduced motion, animation-off persistence, off-screen and hidden-tab pausing, Expert never reacts live, real graded mistake then Undo clears it and leaving/returning resets. All passed on the final build. The existing Play smoke test also passes.
- Real-game recordings (private, show artwork): `Private-Assets/avatars/real-game/` (desktop + emulated mobile, with pose timeline JSON).

## Measurements (real game, production build; `scripts/measure-avatar-play.mjs`)
Beginner/White, 6 pawn moves, real engine + analysis, writes blocked, 4 runs per condition, medians. Chromium on this desktop.
Mobile = Chromium device emulation (390x844, 2x, touch) with 4x CPU throttle. It is NOT a real phone: no real-device numbers exist yet.

Desktop (final build, `chess-avatar-play-measurements-v3-final.json`):
| | hidden (baseline) | static (animation off) | animated |
|---|---|---|---|
| move → piece, median / p95 ms | 654 / 724 | 660 / 787 | 647 / 750 |
| move → engine reply, median / p95 ms | 1160 / 1220 | 1161 / 1300 | 1152 / 1256 |
| long tasks per game (count / total ms) | 1 / 101 | 1 / 102 | 1 / 104 |
| frame median / p95 ms | 16.7 / 16.8 | 16.7 / 16.7 | 16.7 / 16.8 |
| main-thread CPU ms per second | 73.5 | 70.6 | 105.5 |
| layouts per second | 4.3 | 3.9 | 30.4 |

Mobile emulated (build before the last desktop-only tweaks; the 48 px version has no tweens, so unaffected; `chess-avatar-play-measurements-v2-transition-fix.json`):
| | hidden | static | animated |
|---|---|---|---|
| move → piece, median / p95 ms | 898 / 1082 | 950 / 1033 | 902 / 1049 |
| move → engine reply, median / p95 ms | 1500 / 1661 | 1525 / 1636 | 1504 / 1659 |
| long tasks per game (count / total ms) | 6 / 365 | 7 / 501 | 7 / 540 |
| frames over 50 ms per game | 9 | 8 | 10 |
| main-thread CPU ms per second | 460 | 477 | 499 |

Pose vs engine: the `thinking` pose started and ended within 0-2 ms of the page's own "Engine thinking…" in every measured move (desktop and mobile).

What changed because of measurement: (1) pose tweens ran even with animation off and forced a layout every frame (static avatar +20 layouts/s): tweens now only run when motion is on at full size; (2) a 1.6 s "ponder" drift on every thinking phase was removed (thinking is a held pose) and tweens shortened to 0.18 s.

## Limits (not done / not claimed)
- Board responsiveness and engine reply time show no difference between conditions. The main-thread cost of the animated 64 px avatar on desktop is real (about +30 ms of CPU per second in this busy 6-move sample, mostly SVG layout during pose tweens) and the emulated-mobile long-task total is higher with the avatar (365 → 501/540 ms per game) within 4-run noise. No real device was measured.
- Worker (engine) CPU is not counted by these page metrics; engine reply time is the contention proxy.
- Only Beginner was measured. Intermediate/Expert are covered by unit rules and one Expert e2e, not by performance runs.
- No Intermediate "assistance setting" other than the existing live/post-game coaching mode exists; the rule follows that.
- No Learning-Partner slip behaviour, no character picker, no sound.
- Captions use the working name "Tivvi" (not final).

---

## Update: Play layout, check, loading labels (v5, local only)

- **Fit:** board column = min(46vw, 100svh − 274px, 780px), never below 360px (page scrolls instead on short windows / zoom). Heading, mode/strength and status share one row. Opponent header is 64 px on desktop (one-line caption). Right panel is capped at the board column height and scrolls internally.
- **Check:** `src/lib/chess/checkInfo.ts` reads check from the position (chess.js): checking piece, line, legal ways out. Board highlights the king (red glow + ring), status badge "Check — your move" / "Check — TIVVI to move" persists until resolved; the Insight card shows verified facts at once and legal ways out under "Why?" (Guided play only).
- **Labels:** "TIVVI is thinking…" only while the engine computes; "Reviewing your move…" / "Reviewing TIVVI's move…" with move number and side for commentary; failures show a brief non-blocking message.
- **Labels de-duplicated:** mode + strength appear once (top row); TIVVI's description is "Friendly partner".
- **Tests:** `tests/chess-play-layout.spec.ts` (scripted UCI stub for deterministic check positions), `tests/chess-player-avatar.spec.ts` (simulated session; no real accounts), `tests/unit/checkInfo.test.ts`. Measurements: `docs/chess-avatar-play-measurements-v5-play-layout.json`.

## Update: Guided-play feedback (v6, local only)

Root causes found: the Insight card only ever showed the newest ply, so TIVVI's reply replaced the feedback on the human move; the engine
was held for up to 4.5 s waiting for commentary; failed or hung analysis was swallowed, so the card stayed on "Reviewing…" forever;
commentary requests had no timeout; undo removed "the last N entries" (wrong ones while a result was pending) and one global generation
counter dropped analysis for moves still on the board; late results were matched by move/FENs only (a replayed move in a new game could
accept an old game's result); reaction captions lived until the player's next move, so they outlived the position they described.

Changes: `useMoveAnalysis` (per-ply job ids, a session id on every entry, undo by ply, analysis and commentary timeouts with an explicit
"unavailable" entry, separate `queueMs/analysisMs/commentaryMs` on each entry); `insightFeed.feedSections` (your move / reply, history
excludes what is shown); `InsightPanel` (two sections, confirmed-grade label, "How can I respond?" from legal moves, no nested scroll);
`OpponentAvatar` (captions bound to their position, no replay for late grades, no duplicate thinking text); turn/check chip now sits in the
active player's header. Tests: `tests/chess-feedback.spec.ts` (12), unit tests for sections and caption validity. Measurements:
`docs/chess-feedback-measurements.json` (`scripts/measure-feedback.mjs`). Recording/screenshots (private): `scripts/record-feedback.mjs`,
`scripts/capture-results.mjs`.

## Update: Explanation accuracy and Relaxed reply pace (v7, local only)

Explanation root causes: the model was given only the position BEFORE the move, a possibly gappy list of earlier moves (built from the
analysis entries, which lack any move whose analysis is pending or failed) and no side or move number; the system prompt invited it to
comment on "inconsistent" input. Results: 16.dxe5 explained as Black's earlier ...e5, 17.Bc3 "the move list looks jumbled", Black's rook
move called "to the open file" with a pawn on it. Fix: `src/lib/chess/moveFacts.ts` builds verified facts from chess.js (the move must be
legal from fenBefore AND land on fenAfter), the game's own numbered history is sent, and every generated text is vetted (server AND
client) against those facts: another side's move notation, internal-confusion wording, capture omitted, piece-on-square and open-file
claims, false check/mate claims. A rejected text becomes one plain factual sentence; nothing is invented. Grading never reads the text.

Pace: `src/lib/chess/replyPace.ts` (Quick 0.5 s, Comfortable 2 s, Relaxed 4 s; Beginner default Relaxed; explicit choice saved in
`nivenxa.chess.play.pace`). The engine effect in `play/page.tsx` computes at once, then holds the reply only for the time still missing
from the minimum (measured from the human move being accepted), re-validates game/position/ended/duplicate immediately before applying,
and cancels on undo/new game/resign/end/navigation. Undo during a pending reply takes back only your move. A replayed identical move
after undo is its own event (an earlier duplicate guard keyed on the position wrongly blocked its reply: fixed and covered).
Commentary requests run two at a time, mistakes/blunders first. Result summaries: one presentation at a time, "Provisional" when fewer
of your moves are graded than played, "—" instead of 100% when none are. Tests: `tests/chess-pace.spec.ts`,
`tests/chess-explanation-accuracy.spec.ts`, `tests/unit/moveFacts.test.ts`, `tests/unit/replyPace.test.ts`. Measurements:
`docs/chess-pace-measurements.json`, `docs/chess-feedback-measurements-v2-relaxed.json`.

## v8 — Reply pace is decided by the level (supersedes the v7 selector)

The Reply pace selector (setup and Settings), the Quick/Comfortable/Relaxed labels and the saved preference are removed. The selected level sets the minimum time from the human move being accepted to the reply: Beginner 4 s, Intermediate 2 s, Expert and Master 0.5 s. A legacy `nivenxa.chess.play.pace` value is ignored. Engine computation still starts at once and counts toward the minimum; cancellation, revalidation and exactly-once replies are unchanged. Test suites shorten the minimum through `nivenxa.chess.test.replyMinMs`, honoured only in a build made with `NEXT_PUBLIC_CHESS_TEST_HOOKS=1`. Measurements: `docs/chess-pace-measurements.json`.

## v9 — Commentary evidence, opponent characters, coach introduction, custom profile pictures (local only)

**Commentary accuracy (root causes + fix).** Beginner/Intermediate explanations were requested with a prompt that carried no grade, so a Mistake could be paired with praise; nothing checked the text against the engine result. Now every graded move carries evidence from the analysis search that already ran (no extra search): the opponent's best reply (`evaluateWithReply`) and the engine's better move. `moveFacts.ts` rebuilds the move's facts with chess.js, adds `buildEvidence` (legal captures of the moved piece by ANY opposing piece, the reply's capture/check/mate), steers the model with `evidenceForPrompt`, and checks the answer (`vetFields` + `vetAgainstGrade`) on the server AND in the browser. A rejected text becomes: the engine-verified sentence ("Black can reply hxg6, capturing the queen on g6.") when the search proved a concrete downside; otherwise "Explanation unavailable." with the factual move description shown separately and labelled "The move:". Ungraded moves keep the factual sentence. Only specific claim types are checked (see `vetAgainstGrade`); this is not a tactical validator. Regression cases: `tests/unit/commentaryRegression.test.ts`, `tests/chess-explanation-accuracy.spec.ts`.

**Opponents.** `botRoster.ts` (eight characters, provisional names; the cosmetic choice is stored in `nivenxa.chess.play.bot`), `BotPicker`, `BotArt`. Display-size WebP derivatives (128 px) of the approved artwork live in `src/assets/chess-bots/`; masters stay private. Only Tivvi is animated; other characters are flat artwork with static captions. A character never changes strength, assistance or pace.

**Coach introduction.** Beginner only, three completed games (`coachIntro.ts`, `useCoachIntro.ts`, `/api/chess/coach-intro`, migration `20261110120000_chess_coach_intro_and_profile_picture.sql`). Counts: checkmate, stalemate and draw-rule endings; resignation or agreed draw only after 10 of the player's own moves. Per game id, so never double counted; guests keep progress in the browser; on sign-in the guest ids are merged by union.

**Profile pictures.** `profilePicture.ts` (decode, validate, re-encode to 256 px WebP, strip metadata), `profilePictureStore.ts`, `/api/chess/profile-picture` (GET own image/info, POST, DELETE; account only from the server session), `ProfilePictureDialog`. Private storage bucket `chess-profile-pictures`, no client policies, table `chess_profile_pictures` (see v10: the first draft reused `chess_profiles` and was wrong). Migration is NOT applied by the app.

**Pacing.** Level-based as in v8. The test-only override is inert in a normal build (the switch is a build-time variable that a normal build does not set; the code itself is still in the bundle). Verified by `scripts/smoke-normal-build.mts`: with an override of 0 ms stored, Beginner's reply still took 4031-4042 ms.

**Evidence.** `docs/chess-real-commentary-check.json` (real configured endpoint, 5 fixed positions), `docs/chess-pace-measurements.json`, recordings in `Private-Assets/avatars/bots-review/` and `pace-review/`.

## v10 — Weak-grade explanations tightened, migration conflict fixed, wording, artwork, setup

**Why 7.Be3 (Mistake) and 9.Rb1 (Inaccuracy) got through.** The recording/games were not available to reproduce, so the mechanism was reconstructed from the code (and tested with stand-in positions, not described as exact reproductions): for a weak grade the check only asked that the text *mention* the engine reply's SAN, or a piece name plus a square from the reply capture, and it looked for a downside word only when praise words appeared. A text about the move's natural development that happens to name a square or piece in the reply therefore passed. Now a weak grade needs (1) a downside the engine line actually proved (mate, capture, check, or an attacked piece found with chess.js `attackers`: undefended or attacked by something cheaper) and (2) the text naming the verified reply move; any other named move (an unverified tactic) rejects the text. With no proven downside the card shows the grade and "Explanation unavailable." Bare pawn pushes (e.g. "c6") are not checked.

**Migration defect found by inspection.** `chess_profiles` already exists (consent migration: NOT NULL consent columns, client insert/update policies), so the first draft's `create table if not exists` was a no-op and its upsert would have failed. The picture record now lives in its own `chess_profile_pictures` table; the object path is derived from the session's user id and a version (never read from a table). Not applied anywhere: no isolated database was available.

**Other.** Roster descriptions no longer imply styles; Lumio is "Guided opponent" ("Play a guided game with Lumio."). Roster artwork is a lazy chunk (`@bot-art`), built only into a build that has the opponent feature. Setup is more compact with a sticky Start Game button (`.page` now `overflow: clip`). Scripts: `real-weak-moves-study.mts`, `verify-background-tab.mts`, `measure-real-engine-pace.mts`, `verify-account-features.mts` (NOT RUN: needs a staging project).

## v11 — Engine-line evidence, review-evidence export, coach progress messages, session expiry

**Why the 9.Nc3 / 25.Rc2 / 27.b4 texts still passed (exact games not available; mechanism reconstructed and covered with SUBSTITUTE positions).** The previous rule counted a legal capture, check or attack in the engine's first reply as a "verified downside" and only asked the text to name that reply. A text of pure idea ("natural development", "chasing the queen and gaining space") that also named the reply passed. A capture or check is not evidence of a loss: it may be recaptured, or it may cost nothing.

**New evidence model.** The principal variation of the SAME search that grades a move is stored (`pvUci`), replayed with chess.js and settled (ends on a quiet move, so recaptures inside the line are counted). Only a net material loss over that line, or a forced checkmate, is a verified downside. The downside is rendered in plain words ("Black's pawn on h7 can capture your queen on g6 (hxg6). In the engine's best line (hxg6 d4) you end up 8 points of material behind.") and is the COLLAPSED summary itself; the model's text, if it passes (names the reply, says something is lost, names what is lost, names no other move), is the inline "Why?" detail. A weak grade with no verified loss is not sent to the model at all and shows "Explanation unavailable." with the factual move description separate. Compensation is not modelled: if the line shows no material loss the grade stays unexplained.

**Other fixes found on the way.** A move that delivers checkmate used to be graded against a 0 evaluation (a loss); it is now the best outcome.

**Review evidence export (development only).** `src/lib/chess/reviewEvidence.ts`: bounded in-tab record (300 moves) of positions, engine settings, grade, principal variation, commentary facts/evidence, returned text, validation outcome and displayed text; `window.__nivenxaEvidence.export()` and a Settings button "Download review evidence (test builds)". Enabled only in non-production builds or builds with NEXT_PUBLIC_CHESS_TEST_HOOKS=1. Nothing is uploaded; no credentials, emails, tokens or profile images are ever passed in. Fixtures captured by `scripts/real-weak-moves-study.mts` live in `tests/fixtures/review-evidence/` and are replayed by `tests/unit/commentaryFixtures.test.ts`.

**Coach progress messages, session expiry, keyboard.** See the tests `chess-bots.spec.ts` (intro-progress, coach-intro-notice, completion announcement), `chess-session-expiry.spec.ts` (mocked 401 during upload, an opponent reply and progress saving) and the radio-group arrow keys in `BotPicker`.
