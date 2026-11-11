# Chess Basics refinement (four lessons)

Scope: The Chessboard, Meet Your Pieces, Set Up the Board, How Pawns Move, and the shared lesson components they use
(`BoardLesson`, `PieceLesson`, `VoiceControls`, `useLessonVoice`, `Board`). Local, uncommitted.

## Root causes found
| Observation | Root cause |
|---|---|
| Next disappeared during "Speaking…" | `showNext` (BoardLesson) and the demo Next button (PieceLesson) were gated on `voice.speaking`. |
| Overlap / late callbacks after rapid Back/Next or Replay | `speak()` cancelled the browser queue but a cancelled utterance's `onend`/`onerror` (and the muted reading-time timer) still ran later. Now every `speak`/`cancel` bumps a generation counter and stale callbacks do nothing. |
| A knight could be dragged off the board during identification | Boards were built interactive; identification only had empty `dests`. Chessground still lets a piece be picked up. New `Board` prop `fixedPieces` turns dragging and moving off; an answer is now a completed click/tap (press and release at one spot), not chessground's press-down `select` event. |
| "Find a DARK square" hinted a1, c1, e1, g1 before coordinates | Hint copy was written with square names. Hints before the Files part are now visual ("look at the bottom-left corner"); a unit test fails if a pre-coordinate hint contains a square name. |
| Pieces never accumulated in Set Up the Board; the final step was empty | Steps were click-to-identify only and the closing step fell back to the lesson's empty-board FEN. Steps now carry `placePieces`; the board is derived from the steps reached, so Back/Next/resume stay consistent and the recap shows all 32 pieces. |
| Rapid taps could lose an answer in "find all" quizzes | `handleSquareClick` read `foundSquares` from the render closure; two taps before a re-render overwrote each other. Now a synchronous ref mirrors the found set. (Found by the new browser test.) |
| Completion claimed more than was shown | Summaries were static text. Results are now recorded per practice step (independent / hint / demonstration / independent-on-a-fresh-try) and the recap is generated from them. |
| Hint on the Yes/No step only spoke; with voice off it did nothing | It now shows the hint/answer text and goes through the same hint tiers. |
| Pawn lesson showed chessground's "move dots" on every square (including an enemy pawn straight ahead) when a pawn was selected | Lessons now turn `showDests` off and use shape-coded markers (dot = can move, ring = can capture, cross = blocked) with a legend. |
| The completion dialog sat under the site header | Dialog z-index raised, card made scrollable on short screens. |

## What changed (high level)
* Navigation: Back and Next are always rendered in the same row (`LessonNav`, pinned to the bottom of the panel). Explanation steps can always continue; practice steps need the task (or an earlier completed result). An unavailable Next uses `aria-disabled` plus a visible reason. Narration never auto-advances anything. PieceLesson no longer auto-advances after a correct move.
* Voice: Replay / Hint / Show me stay visible (44 px targets). Voice on/off, speed and the push-to-talk microphone are one "Lesson settings" group, with a plain explanation and a clear message if the microphone is blocked. Speech throwing or being absent never blocks learning.
* Assistance tracking (`lessonAssist.ts`, stored per browser under `nivenxa-chess-basics-results-v1`): "Done on your own", "Completed with a hint", "Completed with help", "Done on your own on a fresh try". Where the lesson has an equivalent target, "Try a fresh one on your own" is offered after help. Revisiting a step shows its earlier result.
* Content: all four lessons reworked as specified (see `src/lib/chess/basics/data.ts`); The Chessboard final check is now three applications (flipped-board judgement, g3, a dark square on rank 5); Set Up the Board ends with an independent build task (tray + `SetupBoard`, mouse/touch/keyboard, no dragging, corrections keep correct pieces, hint → highlight, Show me → places the next group).
* Theme: the chosen board colours are read by every Basics lesson (`useBoardTheme`, key `chess-board-theme`).
* Transitions: "Next lesson: X" links carry `?start=1` so the next lesson begins at once; direct visits keep the Start button. Completion shows Next lesson / Practice again / Back to Chess Basics in both lesson types. Practice again clears the per-step results but not the completed badge. An unfinished lesson offers "Continue from step N" (only if the saved length still matches the lesson).

## Storage / accounts
Everything above is per-browser `localStorage` (`nivenxa-chess-basics-progress`, `…-results-v1`, `chess-board-theme`, `chess-voice-*`). Nothing is synced to an account and no account claim is made. Refresh/resume works locally in the same browser; it does not work across browsers or devices.

## Verification
See the delivery report. Unit: `tests/unit/basicsLessons.test.ts`, `lessonAssist.test.ts`. Browser (normal build, narration faked in the page): `tests/chess-basics-refine.spec.ts` (28 tests). Recordings and screenshots: `D:\Nivenxa Clothing\Private-Assets\avatars\basics-review\` (private).

## Round 2 (independent set-up, lesson settings, status messages)
Local, uncommitted. Tests: `tests/chess-basics-round2.spec.ts`, `tests/unit/setupDiagnosis.test.ts`.

| Observation | Root cause | Change |
|---|---|---|
| Step 15 headings/instructions overlapped, clipped, nested scroll | The panel was a fixed-height scroller with a *sticky* Back/Next bar; the in-panel settings disclosure expanded underneath it. | The set-up step's panel grows with the page (`panelRoomy`), Back/Next sits in the flow (`LessonNav inline`), the board stays in view (sticky, wide layout). Under 700px of window height every Basics panel stops scrolling internally and the nav joins the flow. |
| Lesson settings pushed the lesson around | Inline expanding group inside the panel. | A modal dialog (portal): focus moves in, Tab stays inside, Escape or Close returns focus to the "Lesson settings" button. |
| A fully reversed board read as 32 separate errors | Plain square-by-square comparison. | `diagnoseSetup()` groups mistakes into patterns first (teams on each other's sides, one side on the wrong side, king/queen swapped, pawns on the wrong rank) and only then lists single squares. It judges the displayed coordinates only: nothing is rotated or accepted. |
| No way to restart one colour | Only "remove marked pieces". | "Retry White's side" / "Retry Black's side" remove only that colour (the note says how many); nothing is placed for them. A failed check or a retry never counts as help. |
| Tray was one unlabelled strip; selection unclear | Single 12-button grid. | White and Black groups, "N left" / "placed ✓", `aria-disabled` when exhausted, status "Selected: White bishop · 2 remaining. Choose a square.", no replacing an occupied square, a piece can be moved ("Move it") or taken off ("Take it off", Delete) individually. |
| After success it still said "Placing: Black king" | Tray selection was never cleared on success. | Selection cleared on success and after each last placement; "All 32 pieces are correctly placed."; board locked; Hint/Show me `aria-disabled`; "Edit setup" reopens it. A recorded independent result is never downgraded (`mergeResult`). |
| Generic "Not quite" in guided steps | Placeholder copy. | Relevant reminders ("Knights start beside the rooks, on the back row."). |
| Coordinates hard to read on some squares | Soft halo only. | White outline text on set-up and emphasised coordinates; corner badges ✓ / ✕ / ? on quiz squares in addition to colour. |
| "Ready to continue" / "Your turn" lines | Always-on status text. | Removed; only active narration is shown, and not as a live region. |

Meet Your Pieces: rook wording ("a tower with a castle-like top"), a piece-value chip row (pawn ≈ 1, knight ≈ 3, bishop ≈ 3, rook ≈ 5, queen ≈ 9) with the king kept apart as priceless, and "You do not win by collecting points. The main goal is to checkmate the king."
