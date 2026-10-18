// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Every trainer/step position (fen + pieceSquare) has been checked for
// legality via chess.js, but the prose is a first draft and has NOT been
// checked by a chess-knowledgeable human. Same word rule as
// Openings/Tactics — see those files' header comments.
//
// REVIEW MARKER (18-lesson expansion pass): lessons 13-17 (Stalemate,
// Castling, Pawn Promotion, En Passant, Ways a Game Can End) are entirely
// new this pass — they used to live only as passive, non-interactive
// playback under the separate Rules section (src/lib/chess/rules/data.ts),
// which stays in place unchanged. Set Up the Board (3), How Pawns Move (4),
// How Kings Move (9), Getting Out of Check (11), and Checkmate (12) are
// materially rewritten/expanded this pass. Every other lesson (1, 2, 5-8,
// 10, and the moved-not-rewritten Mini Game at 18) is unchanged. This is
// where a future chess-accuracy review pass should focus first.
//
// BASICS follows a single story, in the exact order the child moves through
// it: What is this board? -> Who plays on it? -> What are my pieces? ->
// Which pieces are stronger? -> Where do they start? -> How does each one
// move? -> How do I take another piece? -> How do I win, or draw?
//
//   1. The Chessboard          7. How Knights Move      13. Stalemate
//   2. Meet Your Pieces        8. How Queens Move       14. Castling
//   3. Set Up the Board        9. How Kings Move        15. Pawn Promotion
//   4. How Pawns Move          10. Check                16. En Passant
//   5. How Rooks Move          11. Getting Out of Check 17. Ways a Game Can End
//   6. How Bishops Move        12. Checkmate            18. Your First Mini Game
//
// - "The Chessboard" merges what used to be three separate lessons (Meet the
//   Chessboard, Turn the Board the Right Way, Square Names) into one lesson
//   in four parts — squares, colours, orientation, coordinates — since they
//   are all facts about the same object and a first-time player shouldn't
//   have to "finish a lesson" three times before they can find e4. Uses
//   `boardSteps` (+ `boardFen`), a `BoardLesson` sequence of demo/squareQuiz/
//   yesNo steps — no piece ever moves, only clicks/judges the board itself.
//   The two orientation steps override the lesson's default empty board with
//   the starting position (`fen` on the step itself) so "light on the right"
//   has real pieces to anchor to.
// - "Meet Your Pieces" and "Set Up the Board" also use `boardSteps`. Meet
//   Your Pieces shows White AND Black together for every piece type
//   (deliberately not White-only, so a child never learns "the white rook is
//   the rook" instead of "this is a rook"), and now teaches point values —
//   with an explicit line that points compare pieces, they don't decide who
//   wins. Set Up the Board builds the starting position corner-by-corner,
//   then closes with White-moves-first/players-alternate — stays
//   click-to-identify-the-square throughout (not literal drag-and-place
//   piece arrangement — a deliberate, unchanged scope line, not an
//   oversight; see PieceLesson.tsx's own judgment step for where real
//   position-recognition interactivity lives instead).
// - The six piece-movement lessons use `steps`: a `PieceLesson` sequence of
//   SEE IT MOVE -> YOUR TURN -> WHAT STOPS IT -> CAPTURE -> SHOW WHAT YOU
//   LEARNED. Movement and capture are taught together, not in separate
//   lessons — every correctness check (blocking, no-jumping, king safety,
//   captures) is real chess.js legal-move generation, nothing hardcoded.
//   How Pawns Move follows a longer, explicit 8-beat sequence (both
//   directions, the one-or-two-square choice, blocked-square cases, "only
//   one square after the first move," then captures) rather than the
//   shorter treatment every other piece-movement lesson uses.
// - Check, Getting Out of Check, and Checkmate use `steps` (`PieceLesson`)
//   — each teaches through a demo before asking the learner to try it, and
//   Getting Out of Check walks through all three escape techniques (move,
//   block, capture) as separate positions, now explicitly noting that not
//   every technique is available in every position.
// - Stalemate, Castling, Pawn Promotion, En Passant, and Ways a Game Can End
//   (new) all use `steps` (`PieceLesson`), not `boardSteps` — they need
//   PieceLesson's real chess.js-backed `try` (drag a piece, including the
//   new 'castling'/'enPassant' filterModes in moveTrainerLogic.ts) and the
//   new `judgment` step kind (a real position + a row of answer options,
//   e.g. "Can White castle here? Yes/No" or "Checkmate / Stalemate /
//   Neither?") — BoardLesson's own `yesNo` can't render an arbitrary real
//   position at all, only a decorative orientation checkerboard, so it
//   isn't a fit for "recognize this position" content. Pawn Promotion's
//   `try` step also sets `requiresPromotionChoice: true`, which shows a
//   small Q/R/B/N piece picker once the pawn reaches the back rank — any of
//   the four counts as correct (the point is the mandatory choice, not
//   judging which piece).
// - Your First Mini Game (`miniGame: true`) is a real, engine-backed game on
//   reduced material (White has Queen + 2 pawns vs Black's Rook + 2 pawns) —
//   not another quiz. It reuses the same `useChessGame` + `useStockfish`
//   hooks as /chess/play, with the engine set to its gentlest skill level.
//   See `MiniGameLesson.tsx` for the component; this file only supplies the
//   starting position and the closing copy. Moved from position 13 to 18
//   this pass (still the course's closer) — its slug is unchanged, so
//   existing localStorage progress for it survives the move untouched (see
//   basicsProgress.ts — progress is keyed by slug, never by array index).
// - The former standalone "Capturing" lesson was removed — capture is now
//   taught as part of every piece-movement lesson (the CAPTURE step), so a
//   separate cross-piece capturing lesson before any piece has been
//   introduced no longer has anything new to teach.
// ─────────────────────────────────────────────────────────────────────────

import type { MoveFilterMode } from '@/app/chess/learn/_shared/moveTrainerLogic'
import type { PieceLessonStep } from '@/app/chess/learn/_shared/PieceLesson'
import type { BoardLessonStep } from '@/app/chess/learn/_shared/BoardLesson'
import { allLightSquares, allDarkSquares } from '@/app/chess/learn/_shared/squareColors'

export interface BasicsTrainerConfig {
  fen: string
  pieceSquare: string
  pieceColor: 'w' | 'b'
  filterMode: MoveFilterMode
  moveExplanation: string
  promptLabel: string
  hintText: string
  revealSquaresFrom: 'start' | 'hint'
}

export interface BasicsLesson {
  slug: string
  name: string
  /** One short, factual line for the detail-page subtitle. */
  description: string
  /** One short, idea-only line for the list-card. */
  summary: string
  /** The board/piece-anatomy lessons — a `BoardLesson` sequence, paired with `boardFen`. */
  boardSteps?: BoardLessonStep[]
  boardFen?: string
  /** The piece-movement and check/checkmate lessons — a multi-step SEE IT MOVE -> ... -> SHOW WHAT YOU LEARNED sequence. */
  steps?: PieceLessonStep[]
  /** Unused by any current lesson — kept for a future single-exercise drill, if one is ever needed again. */
  trainer?: BasicsTrainerConfig
  /** Your First Mini Game only — routes to `MiniGameLesson` instead of any quiz engine. */
  miniGame?: boolean
  miniGameFen?: string
  /** Natural-sounding completion line — e.g. "You learned how the chessboard works!" Falls back to a generic "You learned {name}!" when absent, which reads fine for some lesson names ("You learned Checkmate!") and awkwardly for others ("You learned The Chessboard!" / "You learned How Pawns Move!"), so this should be set for every lesson in practice. */
  completionHeadline?: string
  completionSummary?: string[]
  /** A distinct, more conversational spoken paraphrase of the completion recap (BoardLesson only, for now) — falls back to reading completionHeadline + completionSummary verbatim when absent. A terse ALL-CAPS memory-phrase summary reads awkwardly spoken, which is exactly what this field exists to override. */
  completionSpokenText?: string
}

const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const MINI_GAME_FEN = 'r3k3/4pp2/8/8/8/8/4PP2/3QK3 w - - 0 1'

export const BASICS: BasicsLesson[] = [
  {
    slug: 'the-chessboard',
    name: 'The Chessboard',
    description: 'A chessboard has 64 squares, two colours, one correct direction, and a name for every square.',
    summary: 'Discover the squares, coordinates, and the right way to face the board.',
    boardFen: EMPTY_FEN,
    completionHeadline: 'Chessboard Complete!',
    // Consolidated from 20 to 16 steps (2026-09-30) on repeated feedback
    // that a basic board-orientation lesson shouldn't feel like a 20-screen
    // slog: merged the separate "one row"/"one column" demos into one,
    // dropped the second (incorrectly-oriented) yes/no orientation check
    // (one real judgement plus the earlier demo is enough), and cut the c6
    // and h1 coordinate drills — e4 (taught, scaffolded) plus b7 (an
    // independent "find it yourself" test right after) cover the same
    // ground two fewer screens than e4+c6+b7+h1 did. See
    // [[chess_learn_basics_section]] for the full before/after reasoning.
    boardSteps: [
      // Part A — meet the board
      {
        kind: 'demo',
        stageLabel: 'MEET THE BOARD',
        headline: 'Meet the chessboard',
        text: ['A chessboard has 64 squares.', 'There are 8 squares across and 8 squares down.'],
        spokenText: ["Let's explore the chessboard together.", 'It has sixty-four squares.', 'Eight rows and eight columns.'],
      },
      // Split into two frames — the single step used to only ever highlight
      // a row, even though its text taught both rows AND columns, so a
      // column was never actually shown. Same "one highlight per idea"
      // pattern as the square-address sequence below.
      {
        kind: 'demo',
        stageLabel: 'ROWS AND COLUMNS',
        headline: 'Rows and columns',
        highlightSquares: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
        text: ['Rows go from side to side.'],
        spokenText: ['These squares form a row.', 'A row goes from side to side.'],
      },
      {
        kind: 'demo',
        stageLabel: 'ROWS AND COLUMNS',
        highlightSquares: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
        text: ['Columns go from top to bottom.'],
        spokenText: ['Now watch this column.', 'A column goes from top to bottom.'],
      },
      // Part B — two colours
      {
        kind: 'demo',
        stageLabel: 'TWO COLOURS',
        headline: 'Light and dark squares',
        text: ['Every square is either **LIGHT** or **DARK**.', 'They alternate across the board:'],
        rememberLine: 'LIGHT → DARK → LIGHT → DARK',
        spokenText: ['The squares alternate: light, dark, light, dark.'],
      },
      {
        kind: 'demo',
        stageLabel: 'LIGHT AND DARK',
        headline: 'Chessboards come in many colours',
        text: ["Choose a board colour you like. We'll use it for the rest of this lesson."],
        colorPicker: true,
        spokenText: ["Pick a board colour you like. We'll use it for the rest of this lesson."],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        headline: 'Find a **LIGHT** square',
        mode: 'any',
        correctSquares: allLightSquares(),
        prompt: 'Click any **LIGHT** square on the board.',
        wrongText: "Not quite — that's a **DARK** square. Try a **LIGHT** one.",
        hintText: 'Try a2, c2, e2, or g2.',
        revealSquaresFrom: 'hint',
        correctText: 'Correct — **LIGHT**!',
        spokenPrompt: ['Now tap any light square.'],
        colorAwareSpokenFeedback: 'light',
        // a1 (dark) + a2 (light) — a small, side-by-side pair showing both
        // colors, instead of ringing all 32 light squares at the visual
        // hint tier. a2 is the single square Show Me demonstrates.
        hintAreaSquares: ['a1', 'a2'],
        demonstrationSquare: 'a2',
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        headline: 'Find a **DARK** square',
        mode: 'any',
        correctSquares: allDarkSquares(),
        prompt: 'Click any **DARK** square on the board.',
        wrongText: "Not quite — that's a **LIGHT** square. Try a **DARK** one.",
        hintText: 'Try a1, c1, e1, or g1.',
        revealSquaresFrom: 'hint',
        correctText: 'Correct — **DARK**!',
        spokenPrompt: ['Now find a dark square.'],
        colorAwareSpokenFeedback: 'dark',
        hintAreaSquares: ['a1', 'a2'],
        demonstrationSquare: 'a1',
      },
      // Part C — board direction (real pieces, for a concrete "is this right" judgement)
      {
        kind: 'demo',
        stageLabel: 'LIGHT ON THE RIGHT',
        headline: 'Set the board correctly',
        fen: START_FEN,
        highlightSquares: ['h1'],
        text: ['The square in your bottom-right corner should be **LIGHT**.'],
        rememberLine: 'LIGHT ON RIGHT →',
        spokenText: ['The square in your bottom right corner should be light.'],
      },
      {
        kind: 'yesNo',
        stageLabel: 'IS THIS RIGHT?',
        headline: 'Check the orientation',
        boardIsCorrect: true,
        prompt: 'Is this board the right way around?',
        correctText: 'Correct — **Light on Right**!',
        wrongText: 'Not quite — remember: **Light on Right**.',
        spokenPrompt: 'Is this board facing the right way?',
        // Explains the actual state, not just the rule — this lesson only
        // ever shows the correctly-oriented board (the second, flipped
        // yesNo was cut in an earlier round), so "wrong" here always means
        // the learner answered No about a board that IS right.
        spokenCorrectText: 'Look at the bottom-right corner. It is a light square, so this board is facing the right way.',
        spokenWrongText: 'Actually, look again — the bottom-right corner is light, so this board is facing the right way.',
        hintText: 'Hint: the bottom-right square should be light, not dark.',
      },
      // Part D — files, ranks, and square names. Coordinate labels are
      // emphasized (see Board.tsx's emphasizeCoordinates) for this whole
      // part, since it's the last part of the lesson — nothing to "return to
      // subtle" for within this lesson, only in lessons after it.
      {
        kind: 'demo',
        stageLabel: 'FILES',
        headline: 'Files',
        highlightSquares: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
        text: ['Files go up and down ↕', 'They are named:  a · b · c · d · e · f · g · h'],
        rememberLine: 'FILE = VERTICAL ↕',
        emphasizeCoordinates: true,
        spokenText: ['Files go from top to bottom.', 'They are named a through h.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        headline: 'Find the f-file',
        mode: 'any',
        correctSquares: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'],
        prompt: 'Click anywhere on that column.',
        wrongText: 'Almost — the f-file is the 6th column from the left.',
        hintText: 'Files go a, b, c, d, e, f… count 6 in from the left edge.',
        revealSquaresFrom: 'hint',
        correctText: 'Correct — the f-file!',
        emphasizeCoordinates: true,
        spokenPrompt: ['Now tap anywhere on the f-file.'],
        spokenCorrectText: 'Yes! Every square in this column belongs to the f-file.',
      },
      {
        kind: 'demo',
        stageLabel: 'RANKS',
        headline: 'Ranks',
        highlightSquares: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
        text: ['Ranks go across ↔', 'They are numbered:  1 · 2 · 3 · 4 · 5 · 6 · 7 · 8'],
        rememberLine: 'RANK = HORIZONTAL ↔',
        emphasizeCoordinates: true,
        spokenText: ['Ranks go from side to side.', 'They are numbered one through eight.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        headline: 'Find Rank 6',
        mode: 'any',
        correctSquares: ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'],
        prompt: 'Click anywhere on that row.',
        wrongText: 'Almost — rank 6 is the 6th row from the bottom.',
        hintText: 'Ranks are numbered 1 to 8, starting from the row closest to you.',
        revealSquaresFrom: 'hint',
        correctText: 'Correct — Rank 6!',
        emphasizeCoordinates: true,
        spokenPrompt: ['Now tap anywhere on rank six.'],
        spokenCorrectText: 'Exactly! Rank 6 goes from side to side.',
      },
      // Square-address sequence, split into 3 frames (file alone -> rank
      // alone -> just the intersection) instead of one step showing both
      // full bands at once — on feedback that the file and rank lines read
      // as equally prominent with nothing drawing the eye to where they
      // actually meet. Each frame highlights only what its own line is
      // about, so narration and the highlight it's describing always match
      // exactly — "file e" is spoken while only the e-file is lit, etc.
      {
        kind: 'demo',
        stageLabel: 'SQUARE NAMES',
        headline: 'Every square has an address',
        highlightSquares: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
        // Spelled out for a learner reading with sound muted too, not just
        // a line that only lands when narrated — names the everyday word
        // (column/row) alongside the chess term, matching how the earlier
        // Rows/Columns step already introduced them.
        text: ['First, find column e.', 'In chess, a column is called a file.'],
        emphasizeCoordinates: true,
        spokenText: ['Every square has an address.', 'First, find column e.', 'In chess, a column is called a file.'],
      },
      {
        kind: 'demo',
        stageLabel: 'SQUARE NAMES',
        highlightSquares: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
        text: ['Next, find row 4.', 'In chess, a row is called a rank.'],
        emphasizeCoordinates: true,
        spokenText: ['Next, find row 4.', 'In chess, a row is called a rank.'],
      },
      {
        kind: 'demo',
        stageLabel: 'SQUARE NAMES',
        // Just the one square now — not both bands — so e4 reads as
        // distinct from the two full lines that led up to it.
        highlightSquares: ['e4'],
        // Plain sentence first, for a learner reading with sound muted,
        // then the formula spelled out. `rememberLine` deliberately
        // repeats only the short form, matching the completion recap
        // exactly.
        text: ['Where they meet is e4.', 'e (FILE ↕) + 4 (RANK ↔) = **e4**'],
        rememberLine: 'e + 4 = e4',
        emphasizeCoordinates: true,
        spokenText: ['Where they meet is e4.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        headline: 'Find **e4**',
        mode: 'any',
        correctSquares: ['e4'],
        prompt: 'Click it on the board.',
        wrongText: 'Almost — look at file e and rank 4.',
        hintText: 'Find the letter e at the bottom. Follow that column up to number 4.',
        revealSquaresFrom: 'hint',
        correctText: 'Correct — **e4**! (e = file, 4 = rank)',
        emphasizeCoordinates: true,
        spokenPrompt: ['Now tap e4.'],
        // No static spokenCorrectText — BoardLesson.tsx's correctFeedbackFor
        // generates this dynamically for any single-square target, framed
        // by how much help was actually used (plain / followed-a-hint /
        // Show-Me), rather than one fixed line regardless of assistance.
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        headline: 'Now find **b7**',
        mode: 'any',
        correctSquares: ['b7'],
        prompt: 'Click it on the board — no hints this time.',
        wrongText: 'Almost — look at file b and rank 7.',
        hintText: 'Find the letter b at the bottom. Follow that column up to number 7.',
        revealSquaresFrom: 'hint',
        // "You found it yourself" dropped — it was shown regardless of
        // whether a hint or Show Me was actually used first, which is an
        // inaccurate claim exactly when assistance was needed. The spoken
        // reaction (correctFeedbackFor) already frames this correctly by
        // tier; this visible text just states the plain fact.
        correctText: 'Correct — **b7**!',
        emphasizeCoordinates: true,
        spokenPrompt: ['Now find b7 on your own.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        headline: 'Show what you learned',
        checkpointItems: ['Light and dark squares', 'Files: a-h', 'Ranks: 1-8', 'Square addresses: e4'],
        mode: 'all',
        correctSquares: ['a1', 'h8'],
        prompt: '⭐ Find both corners of the board — a1 and h8.',
        wrongText: 'Not quite. Try again.',
        hintText: 'a1 is the near-left corner, h8 is the far corner.',
        revealSquaresFrom: 'hint',
        correctText: 'Correct — you found both corners!',
        emphasizeCoordinates: true,
        spokenPrompt: ['Now find both corners of the board: a1 and h8.'],
      },
    ],
    // Full sentences, not the ALL-CAPS memory phrases this used to be —
    // those read fine on screen but awkwardly spoken aloud (symbols,
    // arrows, no verb). completionSpokenText below is a further, more
    // conversational paraphrase of this same list, not a literal read-out.
    completionSummary: [
      'Light square on the right.',
      'Files go up and down: a to h.',
      'Ranks go side to side: 1 to 8.',
      'Name a square with its letter first, then number — like e4.',
    ],
    completionSpokenText: "Well done! You know your way around the board. Remember: letter first, then number. Let's meet the pieces next!",
  },
  {
    slug: 'meet-the-pieces',
    name: 'Meet Your Pieces',
    description: 'White and Black have the same six piece types, and some pieces are stronger than others.',
    summary: 'Meet every piece and learn what makes each one special.',
    completionHeadline: 'You met every piece on the board!',
    boardFen: START_FEN,
    boardSteps: [
      {
        kind: 'demo',
        stageLabel: 'TWO TEAMS',
        text: ['Two players play chess.', 'White has one team. Black has one team.', 'Both teams have the same pieces.'],
      },
      {
        kind: 'demo',
        stageLabel: 'STRENGTH',
        text: ['Some pieces are stronger than others.', 'We measure that with points.'],
      },
      {
        kind: 'demo',
        stageLabel: 'KING',
        highlightSquares: ['e1', 'e8'],
        text: [
          'This is the king.',
          'White has one king, Black has one king.',
          'They move the same way — only the colour is different.',
          'The king has no point value. The king is the piece you must protect.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['e1', 'e8'],
        prompt: 'Can you find both kings?',
        wrongText: "Not quite — that's not a king.",
        hintText: 'Kings start right next to the queens.',
        revealSquaresFrom: 'hint',
        correctText: 'You found both kings.',
      },
      {
        kind: 'demo',
        stageLabel: 'QUEEN',
        highlightSquares: ['d1', 'd8'],
        text: [
          'This is the queen.',
          'White has one queen, Black has one queen.',
          'They move the same way — only the colour is different.',
          'Queen = 9 points. She is the strongest piece.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['d1', 'd8'],
        prompt: 'Can you find both queens?',
        wrongText: "Not quite — that's not a queen.",
        hintText: 'Queens start right next to the kings.',
        revealSquaresFrom: 'hint',
        correctText: 'You found both queens.',
      },
      {
        kind: 'demo',
        stageLabel: 'ROOK',
        highlightSquares: ['a1', 'h1', 'a8', 'h8'],
        text: [
          'These are rooks.',
          'White and Black both have two rooks.',
          'They move the same way — only the colour is different.',
          'Rook = 5 points.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['a1', 'h1', 'a8', 'h8'],
        prompt: 'Can you find all four rooks?',
        wrongText: "Not quite — that's not a rook.",
        hintText: 'Rooks start in the corners.',
        revealSquaresFrom: 'hint',
        correctText: 'You found all four rooks.',
      },
      {
        kind: 'demo',
        stageLabel: 'BISHOP',
        highlightSquares: ['c1', 'f1', 'c8', 'f8'],
        text: [
          'These are bishops.',
          'White and Black both have two bishops.',
          'They move the same way — only the colour is different.',
          'Bishop = 3 points.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['c1', 'f1', 'c8', 'f8'],
        prompt: 'Can you find all four bishops?',
        wrongText: "Not quite — that's not a bishop.",
        hintText: 'Bishops start next to the knights.',
        revealSquaresFrom: 'hint',
        correctText: 'You found all four bishops.',
      },
      {
        kind: 'demo',
        stageLabel: 'KNIGHT',
        highlightSquares: ['b1', 'g1', 'b8', 'g8'],
        text: [
          'These are knights.',
          'White and Black both have two knights.',
          'They move the same way — only the colour is different.',
          'Knight = 3 points.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['b1', 'g1', 'b8', 'g8'],
        prompt: 'Can you find all four knights?',
        wrongText: "Not quite — that's not a knight.",
        hintText: 'Knights start right next to the rooks.',
        revealSquaresFrom: 'hint',
        correctText: 'You found all four knights.',
      },
      {
        kind: 'demo',
        stageLabel: 'PAWN',
        highlightSquares: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7'],
        text: [
          'These are pawns.',
          'White and Black both have eight pawns.',
          'They move the same way — only the colour is different.',
          'Pawn = 1 point. They are the weakest piece, but there are a lot of them.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        mode: 'all',
        correctSquares: ['e2', 'e7'],
        prompt: '⭐ Show what you learned — find the two pawns standing in front of the kings.',
        wrongText: "Not quite — that's not the pawn in front of a king.",
        hintText: 'Look one square in front of each king.',
        revealSquaresFrom: 'hint',
        correctText: 'You found them.',
      },
      {
        kind: 'demo',
        stageLabel: 'REMEMBER',
        text: ['Points help us compare pieces.', 'They do not decide who wins the game.'],
      },
    ],
    completionSummary: [
      'White and Black have the same pieces — king, queen, rooks, bishops, knights, and pawns.',
      'Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9. The king has no point value.',
      'Points help compare pieces — they do not decide who wins.',
    ],
  },
  {
    slug: 'set-up-the-pieces',
    name: 'Set Up the Board',
    description: 'Every piece has its own starting square.',
    summary: 'Learn where every piece belongs before the game begins.',
    completionHeadline: 'You can set up the board yourself!',
    boardFen: EMPTY_FEN,
    boardSteps: [
      {
        kind: 'demo',
        stageLabel: 'ROOKS',
        highlightSquares: ['a1', 'h1', 'a8', 'h8'],
        text: ['Rooks start in the corners.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['a1', 'h1', 'a8', 'h8'],
        prompt: 'Click the four corners where the rooks belong.',
        wrongText: "Not quite — that's not a corner.",
        hintText: 'The four corners of the board.',
        revealSquaresFrom: 'hint',
        correctText: 'Rooks in the corners.',
      },
      {
        kind: 'demo',
        stageLabel: 'KNIGHTS',
        highlightSquares: ['b1', 'g1', 'b8', 'g8'],
        text: ['Knights start next to the rooks.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['b1', 'g1', 'b8', 'g8'],
        prompt: 'Click where the four knights belong.',
        wrongText: 'Not quite.',
        hintText: 'Right next to the rooks.',
        revealSquaresFrom: 'hint',
        correctText: 'Knights next to the rooks.',
      },
      {
        kind: 'demo',
        stageLabel: 'BISHOPS',
        highlightSquares: ['c1', 'f1', 'c8', 'f8'],
        text: ['Bishops start next to the knights.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['c1', 'f1', 'c8', 'f8'],
        prompt: 'Click where the four bishops belong.',
        wrongText: 'Not quite.',
        hintText: 'Right next to the knights.',
        revealSquaresFrom: 'hint',
        correctText: 'Bishops next to the knights.',
      },
      {
        kind: 'demo',
        stageLabel: 'QUEEN',
        highlightSquares: ['d1', 'd8'],
        text: [
          'The queen starts on her own colour.',
          'A white queen on a light square, a black queen on a dark square.',
          'Simple memory: queen on her colour.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['d1', 'd8'],
        prompt: 'Click where both queens belong.',
        wrongText: 'Not quite.',
        hintText: 'One light square, one dark square, both on the same file.',
        revealSquaresFrom: 'hint',
        correctText: 'Queen on her colour.',
      },
      {
        kind: 'demo',
        stageLabel: 'KING',
        highlightSquares: ['e1', 'e8'],
        text: ['The king stands right next to the queen.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'all',
        correctSquares: ['e1', 'e8'],
        prompt: 'Click where both kings belong.',
        wrongText: 'Not quite.',
        hintText: 'Right next to the queen.',
        revealSquaresFrom: 'hint',
        correctText: 'Kings next to the queens.',
      },
      {
        kind: 'demo',
        stageLabel: 'PAWNS',
        highlightSquares: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'],
        text: ['Pawns stand in a row in front of the other pieces.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        mode: 'all',
        correctSquares: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'],
        prompt: "⭐ Show what you learned — click White's whole row of pawns.",
        wrongText: 'Not quite.',
        hintText: 'The whole second rank.',
        revealSquaresFrom: 'hint',
        correctText: 'The whole row of pawns.',
      },
      {
        kind: 'demo',
        stageLabel: 'WHO GOES FIRST',
        fen: START_FEN,
        text: [
          'With the board set up, White always moves first.',
          'Then the players alternate — one move each, taking turns, for the whole game.',
        ],
      },
      {
        kind: 'demo',
        stageLabel: 'READY',
        text: ['🎉 The board is ready!', "Now let's learn how your pieces move."],
      },
    ],
    completionSummary: [
      'Rooks in the corners, then knights, then bishops.',
      'The queen stands on her own colour, the king beside her, and pawns fill the row in front.',
      'White always moves first, and players alternate turns from there.',
    ],
  },
  {
    slug: 'pawns',
    name: 'How Pawns Move',
    description: 'Pawns move forward, and capture diagonally.',
    summary: 'Move forward, capture diagonally, and reach the other side.',
    completionHeadline: 'You learned how pawns move!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e3'],
        text: ['Pawns move forward.', 'White pawns move up the board, one square at a time.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceSquare: 'e2',
        pieceColor: 'w',
        filterMode: 'legal',
        onlyTo: ['e3'],
        prompt: 'Move the pawn forward one square.',
        wrongText: 'Not quite. Pawns move straight ahead.',
        hintText: 'Move it one square forward, to e3.',
        revealSquaresFrom: 'hint',
        correctText: 'Pawns move straight ahead.',
      },
      {
        kind: 'demo',
        stageLabel: "BLACK'S DIRECTION",
        fen: '4k3/4p3/8/8/8/8/8/6K1 b - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e6'],
        arrows: [['e7', 'e6']],
        text: ['Black pawns move the other way.', 'White moves up the board — Black moves down it.'],
      },
      {
        kind: 'demo',
        stageLabel: 'ONE OR TWO',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e3', 'e4'],
        text: [
          'A pawn that has never moved may go one square or two.',
          'You choose one step or two — you do not have to move two.',
        ],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceSquare: 'e2',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move the pawn — one square or two, your choice.',
        wrongText: 'Not quite. Pawns move straight ahead.',
        hintText: 'Try e3 (one square) or e4 (two squares) — both are allowed from here.',
        revealSquaresFrom: 'hint',
        correctText: "One square forward — and from its very first move, a pawn may also go two.",
        alternateCorrectText: "Two squares forward! That's only allowed on a pawn's first move.",
      },
      {
        kind: 'demo',
        stageLabel: 'BLOCKED',
        fen: 'k7/8/8/8/4p3/8/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e4'],
        text: ['If the second square ahead is blocked, only one step is available.', "A pawn can't jump over anything — even to capture."],
      },
      {
        kind: 'try',
        stageLabel: 'TRY IT',
        fen: 'k7/8/8/8/4p3/8/4P3/7K w - - 0 1',
        pieceSquare: 'e2',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'The square two ahead is blocked. Move the pawn.',
        wrongText: 'Not quite. One square is still open.',
        hintText: 'Try e3 — the only square available.',
        revealSquaresFrom: 'hint',
        correctText: 'Right — with e4 blocked, only the one-square move is available.',
      },
      {
        kind: 'judgment',
        stageLabel: 'BLOCKED BOTH WAYS',
        fen: 'k7/8/8/8/8/4p3/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e3'],
        prompt: 'Now the very next square is blocked too. Can the white pawn move forward at all?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No forward move at all — a pawn can't jump over the piece blocking it, even one square.",
        wrongText: 'Look again — the square right in front of the pawn is occupied.',
        hintText: "A pawn moving straight ahead can never jump a piece, friend or enemy — it simply can't go anywhere forward.",
      },
      {
        kind: 'demo',
        stageLabel: 'AFTER THE FIRST MOVE',
        fen: 'k7/8/8/8/8/4P3/8/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e4'],
        text: ["This pawn already made its first move — it's no longer on its starting square.", 'From here on, it can only ever move one square at a time.'],
      },
      {
        kind: 'try',
        stageLabel: 'TRY IT',
        fen: 'k7/8/8/8/8/4P3/8/7K w - - 0 1',
        pieceSquare: 'e3',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move this pawn forward.',
        wrongText: 'Not quite. This pawn already moved once.',
        hintText: 'Only e4 — the two-square option is gone for good.',
        revealSquaresFrom: 'hint',
        correctText: 'Just one square — the two-square option only ever existed on its very first move.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURING',
        fen: 'k7/8/8/8/8/3p4/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d3'],
        text: ['Pawns capture in a different way.', 'They take one square diagonally.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: 'k7/8/8/8/8/3p4/4P3/7K w - - 0 1',
        pieceSquare: 'e2',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the black pawn using a diagonal move.',
        wrongText: 'Not quite. Look for a diagonal move.',
        hintText: 'Pawns capture one square diagonally — try d3.',
        revealSquaresFrom: 'hint',
        correctText: 'Pawns capture diagonally, not straight ahead.',
      },
      {
        kind: 'demo',
        stageLabel: 'STRAIGHT AHEAD',
        fen: 'k7/8/8/8/8/4p3/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e3'],
        text: ['A pawn cannot capture a piece straight ahead.', 'It can only capture diagonally, like you just did.'],
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: 'k7/8/8/3p1p2/4P3/8/8/6K1 w - - 0 1',
        pieceSquare: 'e4',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: '⭐ Show what you learned — capture a piece with your pawn.',
        wrongText: 'Not quite. Remember, pawns only capture diagonally.',
        hintText: 'Try one of the diagonal squares — d5 or f5.',
        revealSquaresFrom: 'hint',
        correctText: "Pawns capture diagonally — and only move one square once they've left their starting rank.",
        alternateCorrectText: "Yes, that works too! Either diagonal capture is correct here.",
      },
      {
        kind: 'demo',
        stageLabel: 'LOOKING AHEAD',
        fen: 'k7/8/8/3p1p2/4P3/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        text: [
          "There are two more special pawn moves you'll learn later: reaching the far end of the board (Pawn Promotion), and a special capture called En Passant.",
        ],
      },
    ],
    completionSummary: [
      'Pawns move forward — White up the board, Black down it.',
      "On a pawn's first move, it may go one square or two; after that, only one.",
      'Pawns capture diagonally, never straight ahead, and never jump over anything.',
    ],
  },
  {
    slug: 'rooks',
    name: 'How Rooks Move',
    description: 'The rook moves straight — up, down, left, or right — as far as the path is clear.',
    summary: 'Move in straight lines across rows and files.',
    completionHeadline: 'You learned how rooks move!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: 'k7/8/8/3R4/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d8', 'd1', 'a5', 'h5'],
        text: ['The rook moves straight.', 'It can move up, down, left, or right — as far as the path is clear.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: 'k7/8/8/3R4/8/8/8/7K w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move the rook straight.',
        wrongText: 'Not quite. Rooks move straight — up, down, left, or right.',
        hintText: 'Try moving up, down, left, or right, any distance.',
        revealSquaresFrom: 'hint',
        correctText: 'Rooks move straight — up, down, left, or right.',
      },
      {
        kind: 'demo',
        stageLabel: 'WHAT STOPS IT?',
        fen: 'k7/3P4/8/3R4/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        text: ['Now there is a pawn in front of your rook.', 'Can the rook move through it?'],
      },
      {
        kind: 'try',
        stageLabel: 'WHAT STOPS IT?',
        fen: 'k7/3P4/8/3R4/8/8/8/7K w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Try moving the rook upward, past your pawn.',
        wrongText: 'No, the rook cannot jump over pieces.',
        hintText: 'It can only move up to d6 — right before your pawn.',
        revealSquaresFrom: 'hint',
        correctText: 'The rook cannot jump over pieces — it stops right before them.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURE',
        fen: 'k7/8/8/3R4/8/8/3p4/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d2'],
        text: ['The rook can capture a piece in its path.', 'Move onto the enemy piece to capture it.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: 'k7/8/8/3R4/8/8/3p4/7K w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the black pawn.',
        wrongText: "Not quite. Look for the enemy piece on the rook's path.",
        hintText: 'The pawn is on d2 — move straight down to capture it.',
        revealSquaresFrom: 'hint',
        correctText: 'You captured it — moving onto an enemy piece captures it.',
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: 'k7/3P4/8/3R4/8/8/3b4/7K w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: '⭐ Show what you learned — take the black bishop with your rook.',
        wrongText: 'Not quite. Remember, the rook cannot jump over your pawn — find another way.',
        hintText: 'Your pawn blocks the way up. Try moving down instead, straight to d2.',
        revealSquaresFrom: 'hint',
        correctText: 'You did it — straight moves, blocked by pieces, capturing by landing on them.',
      },
    ],
    completionSummary: ['The rook moves straight — up, down, left, or right.', 'It cannot jump over pieces, and captures by landing on them.'],
  },
  {
    slug: 'bishops',
    name: 'How Bishops Move',
    description: 'The bishop moves diagonally, as far as the path is clear.',
    summary: 'Move diagonally across the board.',
    completionHeadline: 'You learned how bishops move!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: '7k/8/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a8', 'g8', 'h1', 'a2'],
        text: ['The bishop moves diagonally.', 'It can move as far as the path is clear.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '7k/8/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move the bishop diagonally.',
        wrongText: 'Not quite. The bishop moves in diagonal lines.',
        hintText: 'Try any diagonal line, any distance.',
        revealSquaresFrom: 'hint',
        correctText: 'The bishop moves in diagonal lines.',
      },
      {
        kind: 'demo',
        stageLabel: 'SAME COLOUR',
        fen: '7k/8/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a8', 'g8', 'h1', 'a2'],
        text: ['Look at every square the bishop can reach.', 'They are all the same colour as d5.', 'A bishop always stays on that one colour.'],
      },
      {
        kind: 'demo',
        stageLabel: 'WHAT STOPS IT?',
        fen: "7k/5P2/8/3B4/8/8/8/6K1 w - - 0 1",
        pieceColor: 'w',
        text: ["Now there is a pawn on your bishop's path.", 'Can the bishop move through it?'],
      },
      {
        kind: 'try',
        stageLabel: 'WHAT STOPS IT?',
        fen: '7k/5P2/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Try moving the bishop toward f7.',
        wrongText: 'No, the bishop cannot jump over pieces.',
        hintText: 'It can only reach e6 on that diagonal — right before your pawn.',
        revealSquaresFrom: 'hint',
        correctText: 'The bishop cannot jump over pieces — it stops right before them.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURE',
        fen: '7k/1p6/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['b7'],
        text: ['The bishop can capture a piece in its path.', 'Move onto the enemy piece to capture it.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: '7k/1p6/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the black pawn.',
        wrongText: "Not quite. Look for the enemy piece on the bishop's diagonal.",
        hintText: 'The pawn is on b7 — move up and left to capture it.',
        revealSquaresFrom: 'hint',
        correctText: 'You captured it — landing on an enemy piece captures it.',
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: '7k/1n3P2/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: '⭐ Show what you learned — capture the black knight with your bishop.',
        wrongText: 'Not quite. Remember, the bishop cannot jump over your pawn.',
        hintText: 'Try the other diagonal — toward b7.',
        revealSquaresFrom: 'hint',
        correctText: 'You did it — diagonal moves, blocked by pieces, capturing by landing on them.',
      },
    ],
    completionSummary: [
      'The bishop moves diagonally, always on the same colour squares.',
      'It cannot jump over pieces, and captures by landing on them.',
    ],
  },
  {
    slug: 'knights',
    name: 'How Knights Move',
    description: 'The knight moves in an L shape, and can jump over other pieces.',
    summary: "Learn the knight's unique L-shaped move.",
    completionHeadline: 'You learned how knights move!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: '7k/8/8/3N4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['b4', 'b6', 'c3', 'c7', 'e3', 'e7', 'f4', 'f6'],
        text: ['The knight moves in an L shape.', 'Two squares one way, then one square to the side.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '7k/8/8/3N4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move the knight in an L shape.',
        wrongText: 'Not quite. Look for an L shape — two squares one way, one square to the side.',
        hintText: 'Try b4, b6, c3, c7, e3, e7, f4, or f6.',
        revealSquaresFrom: 'hint',
        correctText: "That's an L shape — two squares one way, one square to the side.",
      },
      {
        kind: 'demo',
        stageLabel: 'JUMPING OVER',
        fen: '7k/8/3P4/2PNP3/3P4/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['b4', 'b6', 'c3', 'c7', 'e3', 'e7', 'f4', 'f6'],
        text: ['Now your knight is surrounded by pawns.', 'But watch this — the knight can jump right over pieces!'],
      },
      {
        kind: 'try',
        stageLabel: 'JUMPING OVER',
        fen: '7k/8/3P4/2PNP3/3P4/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Jump your knight out of the cage!',
        wrongText: 'Not quite. The knight still moves in an L — try again.',
        hintText: 'It can still reach b4, b6, c3, c7, e3, e7, f4, or f6 — jumping right over the pawns.',
        revealSquaresFrom: 'hint',
        correctText: 'You jumped right over the pieces! Knights are the only piece that can do that.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURE',
        fen: '7k/8/5p2/3N4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['f6'],
        text: ['The knight can capture a piece it jumps to.', 'Move onto the enemy piece to capture it.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: '7k/8/5p2/3N4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the black pawn.',
        wrongText: 'Not quite. Look for the enemy piece on one of the L squares.',
        hintText: 'The pawn is on f6 — jump there to capture it.',
        revealSquaresFrom: 'hint',
        correctText: 'You captured it — even jumping in, the knight still captures by landing on the piece.',
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: '7k/8/3P1n2/2PNP3/3P4/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: '⭐ Show what you learned — jump out of the cage and capture the black knight.',
        wrongText: 'Not quite. Remember — the knight can jump right over pieces.',
        hintText: 'Jump to f6 to capture it.',
        revealSquaresFrom: 'hint',
        correctText: "You jumped over every piece and captured the knight — that's the knight's superpower.",
      },
    ],
    completionSummary: [
      "The knight moves in an L shape — and it's the only piece that can jump over others.",
      'It captures by landing on the piece.',
    ],
  },
  {
    slug: 'queen',
    name: 'How Queens Move',
    description: 'The queen moves like a rook and a bishop combined.',
    summary: 'Discover how the most powerful piece moves.',
    completionHeadline: 'You learned how the queen moves!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: '7k/8/8/3Q4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d8', 'd1', 'a5', 'h5', 'a8', 'g8', 'h1', 'a2'],
        text: ['The queen moves like a rook and a bishop together.', 'Straight lines, and diagonal lines.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '7k/8/8/3Q4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move the queen — straight or diagonal.',
        wrongText: 'Not quite. The queen can move straight or diagonal, any distance.',
        hintText: 'Try any straight or diagonal line.',
        revealSquaresFrom: 'hint',
        correctText: 'The queen moves like a rook and bishop combined.',
      },
      {
        kind: 'demo',
        stageLabel: 'WHAT STOPS IT?',
        fen: '7k/3P4/8/3Q4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        text: ['The queen cannot jump over pieces either.', 'Can she move past your pawn?'],
      },
      {
        kind: 'try',
        stageLabel: 'WHAT STOPS IT?',
        fen: '7k/3P4/8/3Q4/8/8/8/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Try moving the queen upward, past your pawn.',
        wrongText: 'No, the queen cannot jump over pieces.',
        hintText: 'She can only reach d6 — right before your pawn.',
        revealSquaresFrom: 'hint',
        correctText: 'Even the queen has to stop before a piece in her way.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURE',
        fen: '7k/8/8/3Q4/8/8/p7/6K1 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a2'],
        text: ['The queen captures by landing on an enemy piece.', 'It works the same whether she moves straight or diagonal.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: '7k/8/8/3Q4/8/8/p7/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the black pawn.',
        wrongText: "Not quite. Look for the enemy piece on one of the queen's lines.",
        hintText: 'The pawn is on a2 — try the diagonal.',
        revealSquaresFrom: 'hint',
        correctText: 'The queen captures the same way every piece does — by landing on it.',
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: '7k/3P4/8/3Q4/8/8/r7/6K1 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: '⭐ Show what you learned — capture the black rook with your queen.',
        wrongText: "Not quite. Remember, the queen can't jump over your pawn — try a different line.",
        hintText: 'Try the diagonal toward a2.',
        revealSquaresFrom: 'hint',
        correctText: "Straight or diagonal, blocked by pieces, capturing by landing on them — that's the queen.",
      },
    ],
    completionSummary: [
      'The queen moves like a rook and a bishop combined — straight or diagonal.',
      'She cannot jump over pieces, and captures by landing on them.',
    ],
  },
  {
    slug: 'king',
    name: 'How Kings Move',
    description: 'The king moves one square at a time, and must always stay safe.',
    summary: 'Move safely, one square at a time.',
    completionHeadline: 'You learned how the king moves!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: '7k/8/8/3K4/8/8/8/8 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['c4', 'c5', 'c6', 'd4', 'd6', 'e4', 'e5', 'e6'],
        text: ['The king moves one square at a time.', 'It can move in any direction.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '7k/8/8/3K4/8/8/8/8 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Move the king one square, any direction.',
        wrongText: 'Not quite. The king moves just one square, any direction.',
        hintText: 'Try any of the squares right next to it.',
        revealSquaresFrom: 'hint',
        correctText: 'The king moves one square in any direction.',
      },
      {
        kind: 'demo',
        stageLabel: 'STAY SAFE',
        fen: '2r4k/8/8/3K4/8/8/8/8 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['c5'],
        text: ['Watch out — the black rook is attacking the whole c-file.', 'Can the king move to c5?'],
      },
      {
        kind: 'try',
        stageLabel: 'STAY SAFE',
        fen: '2r4k/8/8/3K4/8/8/8/8 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Try moving the king to c5.',
        wrongText: 'No, that square is not safe — the rook could capture your king there.',
        hintText: "Try a square the rook doesn't attack, like d6 or e5.",
        revealSquaresFrom: 'hint',
        correctText: 'Good — you found a square where your king is safe. A king can never move into check — not even to capture something.',
      },
      {
        kind: 'demo',
        stageLabel: 'TWO KINGS',
        fen: '8/8/8/4k3/8/2K5/8/8 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d4'],
        text: ['There is one more rule: the two kings can never stand right next to each other.', "d4 looks like a normal king move here — but it's right beside the black king."],
      },
      {
        kind: 'judgment',
        stageLabel: 'TWO KINGS',
        fen: '8/8/8/4k3/8/2K5/8/8 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['c3', 'e5'],
        prompt: 'Can the white king move to d4?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — d4 sits right next to the black king, so it's never a legal square for White's king to land on.",
        wrongText: "Look closely at d4's neighbours — one of them is the black king.",
        hintText: 'Squares right next to the enemy king are always off-limits, the same way a check-attacked square is.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURE',
        fen: '7k/8/8/2pK4/8/8/8/8 w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['c5'],
        text: ['The king can capture too — but only a piece right next to it.', 'And only if that square is safe.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: '7k/8/8/2pK4/8/8/8/8 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the black pawn.',
        wrongText: 'Not quite. Look for the enemy piece right next to your king.',
        hintText: 'Try capturing on c5.',
        revealSquaresFrom: 'hint',
        correctText: "The king captures just like it moves — one square, and only if it's safe.",
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: '2r4k/8/8/3Kp3/8/8/8/8 w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: '⭐ Show what you learned — capture the black pawn safely.',
        wrongText: 'Careful — some of those squares are watched by the rook. Try the pawn instead.',
        hintText: 'e5 is safe to capture.',
        revealSquaresFrom: 'hint',
        correctText: 'You captured safely — the king always avoids squares it could be captured on.',
      },
      {
        kind: 'demo',
        stageLabel: 'NEVER CAPTURED',
        fen: '2r4k/8/8/3Kp3/8/8/8/8 w - - 0 1',
        pieceColor: 'w',
        text: [
          'One more thing worth knowing: the king is never actually captured.',
          "The game ends the moment a king can't escape check — that's checkmate, which you'll learn about soon.",
        ],
      },
    ],
    completionSummary: [
      'The king moves one square in any direction — and the two kings can never stand right next to each other.',
      'A king always avoids squares where it could be captured, and is never actually captured itself.',
    ],
  },
  {
    slug: 'check',
    name: 'Check',
    description: 'A move that attacks the king is called check.',
    summary: 'Discover what happens when the king comes under attack.',
    completionHeadline: 'You learned what check means!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'WHAT IS CHECK?',
        fen: '4k3/8/8/3R4/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        text: ['A move that attacks the king is called check.', 'A king in check must get to safety right away.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '4k3/8/8/3R4/8/8/8/7K w - - 0 1',
        pieceSquare: 'd5',
        pieceColor: 'w',
        filterMode: 'checks',
        prompt: 'Find a move that gives check.',
        wrongText: "Not quite. Look for a square where the rook attacks the king.",
        hintText: 'Try d8, straight up the d-file.',
        revealSquaresFrom: 'hint',
        correctText: 'That attacks the king — this is check.',
      },
      {
        kind: 'demo',
        stageLabel: 'ANY PIECE CAN CHECK',
        fen: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
        pieceColor: 'w',
        text: ['Any piece can give check, not just the rook.', 'Here your queen is ready to attack the king.'],
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
        pieceSquare: 'd1',
        pieceColor: 'w',
        filterMode: 'checks',
        onlyTo: ['d8'],
        prompt: '⭐ Show what you learned — give check with your queen.',
        wrongText: "Not quite. Look for a square where the queen attacks the king.",
        hintText: 'Try d8, straight up the d-file.',
        revealSquaresFrom: 'hint',
        correctText: 'Check! You attacked the king.',
      },
    ],
    completionSummary: ['A move that attacks the king is called check.', 'Any piece can give check, not only the rook or queen.'],
  },
  {
    slug: 'escaping-check',
    name: 'Getting Out of Check',
    description: 'There are three ways out of check: move, block, or capture.',
    summary: 'Learn the three ways to escape check.',
    completionHeadline: 'You learned how to escape check!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'THREE WAYS OUT',
        fen: 'k7/8/8/8/8/8/4r3/4K3 w - - 0 1',
        pieceColor: 'w',
        text: ['Your king is in check.', 'You must get your king safe right away.', 'You can move your king to a safe square.'],
      },
      {
        kind: 'try',
        stageLabel: 'MOVE',
        fen: 'k7/8/8/8/8/8/4r3/4K3 w - - 0 1',
        pieceSquare: 'e1',
        pieceColor: 'w',
        filterMode: 'legal',
        onlyTo: ['d1', 'f1'],
        prompt: 'Move your king to a safe square.',
        wrongText: 'Not quite. Step off the e-file, away from the rook.',
        hintText: 'Try d1 or f1.',
        revealSquaresFrom: 'hint',
        correctText: 'Your king is safe now.',
      },
      {
        kind: 'demo',
        stageLabel: 'BLOCK',
        fen: 'k3r3/8/8/8/8/8/8/4KQ2 w - - 0 1',
        pieceColor: 'w',
        text: ['You can also block the attack.', 'Put one of your own pieces in the way.'],
      },
      {
        kind: 'try',
        stageLabel: 'BLOCK',
        fen: 'k3r3/8/8/8/8/8/8/4KQ2 w - - 0 1',
        pieceSquare: 'f1',
        pieceColor: 'w',
        filterMode: 'legal',
        prompt: 'Block the check with your queen.',
        wrongText: "Not quite. Put your queen on the e-file, between your king and the rook.",
        hintText: 'Try e2.',
        revealSquaresFrom: 'hint',
        correctText: 'You blocked the attack — the rook no longer reaches your king.',
      },
      {
        kind: 'demo',
        stageLabel: 'CAPTURE',
        fen: 'k7/8/8/8/8/8/4r3/2N1K3 w - - 0 1',
        pieceColor: 'w',
        text: ['Or you can capture the piece giving check.'],
      },
      {
        kind: 'try',
        stageLabel: 'CAPTURE',
        fen: 'k7/8/8/8/8/8/4r3/2N1K3 w - - 0 1',
        pieceSquare: 'c1',
        pieceColor: 'w',
        filterMode: 'captures',
        prompt: 'Capture the piece giving check.',
        wrongText: 'Not quite. Look for a piece that attacks the checking rook.',
        hintText: 'Your knight can jump to e2 and capture it.',
        revealSquaresFrom: 'hint',
        correctText: 'You captured the attacker — no more check.',
      },
      {
        kind: 'demo',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: 'k7/8/8/8/8/8/4r3/2N1K3 w - - 0 1',
        pieceColor: 'w',
        text: [
          'Move, block, or capture — three ways to get out of check.',
          "Not every position offers all three, though — sometimes only one or two are actually available, and you'll need to find whichever one works.",
        ],
      },
    ],
    completionSummary: [
      'There are three ways to get out of check: move your king, block the attack, or capture the attacking piece.',
      "Not every position has all three available — sometimes only one escape actually exists.",
    ],
  },
  {
    slug: 'checkmate',
    name: 'Checkmate',
    description: 'Checkmate ends the game — the king is in check with no way to escape.',
    summary: 'Learn why checkmate means the king has no safe way out.',
    completionHeadline: 'You learned what checkmate means!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'WHAT IS CHECKMATE?',
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        pieceColor: 'w',
        text: [
          'Checkmate ends the game.',
          'The king is in check, and there is no move, block, or capture that saves it.',
          "That's important — checkmate isn't just \"the king can't move.\" It means none of the three escapes from the last lesson (move, block, or capture) work.",
        ],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        pieceSquare: 'a1',
        pieceColor: 'w',
        filterMode: 'checkmates',
        prompt: 'Find the checkmate move.',
        wrongText: "Not quite. Look at the open file in front of the king.",
        hintText: 'Try a8, straight up the open file.',
        revealSquaresFrom: 'hint',
        correctText: 'Checkmate! The king has no way out.',
      },
      {
        kind: 'demo',
        stageLabel: 'ANY PIECE CAN MATE',
        fen: '6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1',
        pieceColor: 'w',
        text: ['Just like check, any piece can deliver checkmate.', "Here your queen can finish the game."],
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: '6k1/5ppp/8/8/8/8/8/4Q1K1 w - - 0 1',
        pieceSquare: 'e1',
        pieceColor: 'w',
        filterMode: 'checkmates',
        prompt: '⭐ Show what you learned — find the checkmate move.',
        wrongText: 'Not quite. Look for a square where the king has nowhere to go.',
        hintText: 'Try e8, straight up the e-file.',
        revealSquaresFrom: 'hint',
        correctText: 'Checkmate! You won the game.',
      },
    ],
    completionSummary: ['The king is in check with no way to escape.', 'That ends the game — checkmate.'],
  },
  {
    slug: 'stalemate',
    name: 'Stalemate',
    description: 'Stalemate is a draw — the player to move has no legal move, but isn\'t in check.',
    summary: 'Not every game ends in checkmate — learn the one that ends in a draw instead.',
    completionHeadline: 'You learned what stalemate means!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'WHAT IS STALEMATE?',
        fen: 'k7/8/KQ6/8/8/8/8/8 b - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a8'],
        text: [
          "It's Black's move, but the black king has no legal move anywhere — and it isn't in check right now either.",
          'This is called stalemate, and the game is a draw. Nobody wins.',
        ],
      },
      {
        kind: 'judgment',
        stageLabel: 'CHECK FOR YOURSELF',
        fen: 'k7/8/KQ6/8/8/8/8/8 b - - 0 1',
        pieceColor: 'w',
        prompt: 'Is the black king currently in check in this position?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "Right — not in check. That's exactly what makes this stalemate instead of checkmate.",
        wrongText: 'Look again — nothing is actually attacking the black king right now.',
        hintText: 'The white queen controls every square the king could move to, but it isn\'t attacking the king\'s own square.',
      },
      {
        kind: 'demo',
        stageLabel: 'COMPARE',
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        pieceColor: 'w',
        text: [
          'Compare that to checkmate, from an earlier lesson.',
          'Checkmate: the king IS in check, with no escape. Stalemate: the king is NOT in check, but still has no legal move.',
          'Same "no legal move" problem — a completely different result. Checkmate wins the game; stalemate draws it.',
        ],
      },
      {
        kind: 'judgment',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: 'k7/8/KQ6/8/8/8/8/8 b - - 0 1',
        pieceColor: 'w',
        prompt: '⭐ Show what you learned — what is this position?',
        options: ['Checkmate', 'Stalemate', 'Neither'],
        correctOptionIndex: 1,
        correctText: 'Stalemate — no legal move, but not in check. A draw.',
        wrongText: "Not quite. Check whether the king is actually under attack right now.",
        hintText: "The black king has no legal move, but nothing is attacking it — that combination is always stalemate.",
      },
    ],
    completionSummary: [
      'Stalemate: the player to move has no legal move, and is not in check.',
      "It's a draw, not a win — very different from checkmate, even though both mean \"no legal move.\"",
    ],
  },
  {
    slug: 'castling',
    name: 'Castling',
    description: 'A special move that moves your king to safety and brings a rook into play, all in one move.',
    summary: 'Move your king to safety and bring a rook into play, all in one move.',
    completionHeadline: 'You learned how to castle!',
    steps: [
      // 1. What is castling? Watch only — no interaction yet.
      {
        kind: 'demo',
        stageLabel: 'WHAT IS CASTLING?',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        pieceColor: 'w',
        text: [
          'Castling is one special move using your king and one rook at the same time.',
          "It tucks your king away to safety and brings that rook into the game, in a single move. Watch how it works first."
        ],
      },
      // 2. Kingside castling — shown in two frames (the king's slide, then
      // the rook's jump) instead of one static arrow, then a guided attempt.
      // "Replay" is the existing Back button — it already re-opens these
      // same two frames, so no separate control is needed for it.
      {
        kind: 'demo',
        stageLabel: 'KINGSIDE: THE KING MOVES',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        pieceColor: 'w',
        arrows: [['e1', 'g1']],
        text: ['Kingside castling (the short side): the king slides two squares toward the h-rook.'],
      },
      {
        kind: 'demo',
        stageLabel: 'KINGSIDE: THE ROOK JUMPS',
        fen: 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1',
        pieceColor: 'w',
        highlightSquares: ['f1'],
        text: ['Then the rook jumps right over the king, landing beside it.', 'One move, both pieces — that jump happens automatically.'],
      },
      {
        kind: 'try',
        stageLabel: 'KINGSIDE: YOUR TURN',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        pieceSquare: 'e1',
        pieceColor: 'w',
        filterMode: 'castling',
        onlyTo: ['g1'],
        prompt: 'Your turn — castle kingside. Drag the king two squares toward the h-rook.',
        wrongText: 'Drag the king itself, two squares toward the h-rook.',
        hintText: 'Move the king from e1 to g1 — the rook will jump to f1 automatically.',
        revealSquaresFrom: 'hint',
        correctText: 'Kingside castling! Your king is tucked away safely, and the rook came right into play.',
      },
      // 3. Queenside castling — same two-frame pattern, one square further.
      {
        kind: 'demo',
        stageLabel: 'QUEENSIDE: THE KING MOVES',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        pieceColor: 'w',
        arrows: [['e1', 'c1']],
        text: ['Queenside castling (the long side) works the same way, toward the a-rook — just one square further.'],
      },
      {
        kind: 'demo',
        stageLabel: 'QUEENSIDE: THE ROOK JUMPS',
        fen: 'r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1',
        pieceColor: 'w',
        highlightSquares: ['d1'],
        text: ["The rook jumps to the king's other side this time, landing on d1.", 'Same idea, just one square further than kingside.'],
      },
      {
        kind: 'try',
        stageLabel: 'QUEENSIDE: YOUR TURN',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        pieceSquare: 'e1',
        pieceColor: 'w',
        filterMode: 'castling',
        onlyTo: ['c1'],
        prompt: 'Now castle queenside — toward the a-rook.',
        wrongText: 'Drag the king two squares toward the a-rook this time.',
        hintText: 'Move the king from e1 to c1 — the rook will jump to d1.',
        revealSquaresFrom: 'hint',
        correctText: 'Queenside castling! A little further, but the same idea.',
      },
      // Black castles too — so the lesson never reads as a White-only move.
      // Note this is the one pair of steps in the lesson shown from Black's
      // own side of the board (pieceColor: 'b') — necessary, not just
      // stylistic: Board.tsx's turnColor (derived from pieceColor) gates
      // which color's pieces chessground will let the learner drag at all,
      // so dragging Black's king requires pieceColor: 'b' here, which also
      // (correctly) orients the board from Black's own seat for this pair.
      {
        kind: 'demo',
        stageLabel: 'BLACK CASTLES TOO',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',
        pieceColor: 'b',
        arrows: [['e8', 'g8']],
        text: ["Castling isn't just a White move — Black castles exactly the same way, toward either rook."],
      },
      {
        kind: 'try',
        stageLabel: 'BLACK CASTLES TOO',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1',
        pieceSquare: 'e8',
        pieceColor: 'b',
        filterMode: 'castling',
        onlyTo: ['g8'],
        prompt: "Your turn — castle kingside for Black this time.",
        wrongText: 'Drag the black king two squares toward its h-rook.',
        hintText: 'Move the king from e8 to g8 — the rook jumps to f8 automatically.',
        revealSquaresFrom: 'hint',
        correctText: 'Exactly the same move, just the other side of the board.',
      },
      // 4. Neither piece may have moved — shown as a before/after pair (the
      // king wandering off, then returning) rather than stated as one more
      // line in a dense rules paragraph.
      {
        kind: 'demo',
        stageLabel: "HASN'T MOVED — PART 1",
        fen: 'r3k2r/8/8/8/8/8/4K3/R6R w kq - 0 1',
        pieceColor: 'w',
        arrows: [['e2', 'e1']],
        text: ["Castling has a rule beyond the position on the board right now: neither the king nor that rook may have moved yet, this entire game.", "Say the king wandered off to e2 earlier, and is about to come back to e1."],
      },
      {
        kind: 'demo',
        stageLabel: "HASN'T MOVED — PART 2",
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e1'],
        text: ["The king is back on e1 — but returning doesn't undo anything.", "Both of White's castling rights are already gone for the rest of the game, even though the board looks exactly like it did at the start."],
      },
      {
        kind: 'judgment',
        stageLabel: "HASN'T MOVED YET",
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w Qkq - 0 1',
        pieceColor: 'w',
        prompt: "This king and rook haven't physically moved — but White's kingside castling right was already lost earlier in the game, the same way you just saw. Can White still castle kingside here?",
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — once a king or rook has moved, that side's castling right is gone for the rest of the game. Being back in the original position doesn't restore it.",
        wrongText: "Not quite — remember the king-and-rook example you just watched. The pieces being back in place isn't enough on its own.",
        hintText: "A lost castling right never comes back, no matter where the king and rook end up standing now. Only the game's move history decides this, not the current board.",
      },
      // 5. The path must be empty — a blocked frame, then a cleared frame,
      // before the position is actually tested.
      {
        kind: 'demo',
        stageLabel: 'THE PATH MUST BE EMPTY',
        fen: '4k3/8/8/8/8/8/8/R3KB1R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['f1'],
        text: ['Every square between the king and the rook must be empty — all of them, not just most.', "Right now f1 is occupied by White's own bishop, so kingside castling isn't available at all."],
      },
      {
        kind: 'demo',
        stageLabel: 'NOW THE PATH IS CLEAR',
        fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['f1', 'g1'],
        text: ['Move the bishop out of the way, and the whole path between king and rook opens up.', 'Castling becomes available again — nothing else about the position changed.'],
      },
      {
        kind: 'judgment',
        stageLabel: 'PATH MUST BE CLEAR',
        fen: '4k3/8/8/8/8/8/8/R3KB1R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['f1'],
        prompt: 'Back to the blocked version — can White castle kingside here?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — the bishop on f1 is in the way. Every square between the king and rook has to be empty, and f1 isn't.",
        wrongText: 'Look at the square right next to the king, between it and the rook — is it really empty?',
        hintText: "f1 is occupied by White's own bishop, blocking the path the king and rook both need.",
      },
      // 6. Not out of check.
      {
        kind: 'demo',
        stageLabel: "CAN'T CASTLE OUT OF CHECK",
        fen: 'k3r3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        arrows: [['e8', 'e1']],
        text: ["The black rook on e8 attacks straight down the e-file, right onto White's king.", "White's king is in check — and you can never castle your way out of check. It has to be dealt with some other way first."],
      },
      {
        kind: 'judgment',
        stageLabel: 'NOT WHILE IN CHECK',
        fen: 'k3r3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        prompt: "Same position. Can White castle either side right now?",
        options: ['Yes, either side', 'No, neither side'],
        correctOptionIndex: 1,
        correctText: "Correct — you can never castle out of check, on either side. The king must get safe some other way first.",
        wrongText: 'Check the e-file — is anything attacking the king right now?',
        hintText: "The black rook on e8 attacks straight down the e-file, right onto the king.",
      },
      // 7. Not through check — the transit square, not the king's own square.
      {
        kind: 'demo',
        stageLabel: "CAN'T CASTLE THROUGH CHECK",
        fen: 'k4r2/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e1', 'f1', 'g1'],
        text: ["The king isn't in check right now — but trace its route to g1: it has to pass through f1 on the way.", 'The black rook on f8 attacks straight down onto f1. A king can never cross an attacked square, even mid-castle, so kingside castling is blocked here too.'],
      },
      {
        kind: 'judgment',
        stageLabel: "CAN'T CROSS AN ATTACKED SQUARE",
        fen: 'k4r2/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['f1', 'g1'],
        prompt: 'Same position. Can White castle kingside?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: 'No — the king would have to cross f1 to reach g1, and f1 is attacked. The king can never cross an attacked square, even partway through castling.',
        wrongText: "The king isn't attacked on e1 itself right now — but check the square it has to pass through on the way to g1.",
        hintText: "f1 is attacked, and the king's path runs right through it on the way to g1.",
      },
      // 8. Not into check — the landing square specifically, with the
      // transit square left safe, to keep this genuinely distinct from #7.
      {
        kind: 'demo',
        stageLabel: "CAN'T CASTLE INTO CHECK",
        fen: 'k5r1/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['g1'],
        text: ["This time f1 (the square the king passes through) is perfectly safe — but look at g1, where the king would actually land.", 'The black rook on g8 attacks straight down onto g1. Landing there would put the king in check, so that destination is never legal — even though the path to it was clear.'],
      },
      {
        kind: 'judgment',
        stageLabel: "CAN'T LAND ON AN ATTACKED SQUARE",
        fen: 'k5r1/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['f1', 'g1'],
        prompt: 'Same position — f1 is safe, g1 is attacked. Can White castle kingside?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — g1 is where the king would actually land, and it's attacked. A king can never land on an attacked square, so this is blocked even though the path itself (f1) was clear.",
        wrongText: 'The square the king passes through (f1) is fine here — check the square it would actually land on instead.',
        hintText: "g1 is the king's final destination for kingside castling, and the black rook on g8 attacks it directly.",
      },
      // 9. What about the rook? An attacked rook alone changes nothing.
      {
        kind: 'demo',
        stageLabel: 'WHAT ABOUT THE ROOK?',
        fen: 'k6r/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['h1'],
        text: ["The black rook attacks White's h1 rook directly — but nothing else on the board.", "Castling rules only ever look at the king: is it in check, does it cross an attacked square, does it land on one? The rook being attacked was never one of those conditions."],
      },
      {
        kind: 'judgment',
        stageLabel: 'AN ATTACKED ROOK IS FINE',
        fen: 'k6r/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['h1'],
        prompt: 'Same position. Can White still castle kingside?',
        options: ['Yes', 'No'],
        correctOptionIndex: 0,
        correctText: "Yes! Only the king's own path matters for castling — an attacked rook doesn't block anything, since the rook itself is never in danger of being captured mid-castle.",
        wrongText: "The rook being attacked doesn't actually matter here — think about what the KING is doing, not the rook.",
        hintText: 'Castling only cares whether the king itself is in check or crosses/lands on an attacked square — never about the rook.',
      },
      // 10. The queenside detail — b1 must be empty, but may be attacked,
      // since the king only ever crosses d1 and lands on c1.
      {
        kind: 'demo',
        stageLabel: 'THE QUEENSIDE DETAIL',
        fen: '1r2k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['b1', 'c1', 'd1'],
        text: ["Queenside has one extra wrinkle. b1 must still be empty, for the rook to slide across it — but the king itself never steps on b1 at all.", "The king only ever crosses d1 and lands on c1. So an attack on b1, like the black rook here, doesn't stop queenside castling — only an attack on d1 or c1 would."],
      },
      {
        kind: 'judgment',
        stageLabel: 'QUEENSIDE: B1 EXCEPTION',
        fen: '1r2k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceColor: 'w',
        highlightSquares: ['b1'],
        prompt: 'Same position — the black rook attacks b1, which is empty. Can White castle queenside?',
        options: ['Yes', 'No'],
        correctOptionIndex: 0,
        correctText: "Yes! The king moves through d1 to c1. It never steps on b1, so an attack on b1 doesn't stop castling. But b1 must still be empty — that part of the rule doesn't change.",
        wrongText: "b1 being attacked isn't the problem here — check whether it's actually empty, and whether the KING's own squares (d1, c1) are safe.",
        hintText: "The king's path (d1, c1) is clear and unattacked — b1 only needs to be empty, which it is.",
      },
      // 11. Guided practice — one more clean rep each side, now that every
      // rule has been taught, with the full hint system available.
      {
        kind: 'try',
        stageLabel: 'GUIDED PRACTICE',
        fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceSquare: 'e1',
        pieceColor: 'w',
        filterMode: 'castling',
        onlyTo: ['g1'],
        prompt: 'A clean position, nothing in the way. Castle kingside.',
        wrongText: 'Drag the king two squares toward the h-rook.',
        hintText: 'Move the king from e1 to g1.',
        revealSquaresFrom: 'hint',
        correctText: 'Clean and simple — every rule checks out here.',
      },
      {
        kind: 'try',
        stageLabel: 'GUIDED PRACTICE',
        fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
        pieceSquare: 'e1',
        pieceColor: 'w',
        filterMode: 'castling',
        onlyTo: ['c1'],
        prompt: 'Same clean position. This time, castle queenside.',
        wrongText: 'Drag the king two squares toward the a-rook.',
        hintText: 'Move the king from e1 to c1.',
        revealSquaresFrom: 'hint',
        correctText: 'Either side, same king, same rules.',
      },
      // 12. Independent check — fresh positions, not the ones used to teach
      // each rule above, covering both sides and a mix of the restrictions.
      {
        kind: 'judgment',
        stageLabel: 'INDEPENDENT CHECK',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w Kkq - 0 1',
        pieceColor: 'w',
        prompt: "A fresh position: White's queenside right was lost earlier this game. Can White castle queenside here?",
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — that right is gone for good, exactly like the kingside example earlier, just the other side this time.",
        wrongText: "The board looks ready — but check which right was actually lost earlier in the game.",
        hintText: "A lost right never returns, regardless of what the current position looks like.",
      },
      {
        kind: 'judgment',
        stageLabel: 'INDEPENDENT CHECK',
        fen: 'r3k2r/8/8/8/8/8/8/R2BK2R w KQkq - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d1'],
        prompt: "Another fresh position — White's own bishop sits on d1. Can White castle queenside?",
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — d1 is part of the king's own path to c1, and it's occupied. Every square between king and rook must be empty, on either side.",
        wrongText: 'A piece is sitting between the king and the a-rook — which square is it on?',
        hintText: "d1 is occupied, and the king needs to pass through it to reach c1.",
      },
      {
        kind: 'judgment',
        stageLabel: 'INDEPENDENT CHECK',
        fen: 'r3k2r/8/8/8/7b/8/8/R3K2R w KQkq - 0 1',
        pieceColor: 'w',
        prompt: "A black bishop, not a rook this time, is giving check along the h4-e1 diagonal. Can White castle either side?",
        options: ['Yes, either side', 'No, neither side'],
        correctOptionIndex: 1,
        correctText: "No — it doesn't matter which piece is giving check. In check is in check, so castling is off the table on both sides until it's resolved.",
        wrongText: "Look along the diagonal from the bishop toward the king — does it reach the king's own square?",
        hintText: "The bishop on h4 attacks straight down its diagonal, through g3 and f2, onto e1 — the king's own square.",
      },
      {
        kind: 'judgment',
        stageLabel: 'INDEPENDENT CHECK',
        fen: 'r3k2r/8/8/8/8/8/b7/R3K2R w KQkq - 0 1',
        pieceColor: 'w',
        highlightSquares: ['b1'],
        prompt: "Last one — a black bishop attacks b1, which is empty. Can White castle queenside?",
        options: ['Yes', 'No'],
        correctOptionIndex: 0,
        correctText: "Yes — same exception as before, just a bishop doing the attacking instead of a rook. b1 only needs to be empty, and the king never actually stands on it.",
        wrongText: "Which squares does the king itself actually use on its way to c1? b1 isn't one of them.",
        hintText: "The king's own path (d1, c1) is clear and unattacked — b1 being attacked doesn't matter, since the king never lands or stops there.",
      },
      // 13. Recap.
      {
        kind: 'demo',
        stageLabel: 'RECAP',
        fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
        pieceColor: 'w',
        text: [
          "Castling moves your king to safety and brings a rook into play, in one move — for either side, White or Black.",
          "Both rights are lost the moment that king or that rook moves, forever, even if they come back.",
          "The king can never castle out of check, through an attacked square, or onto one — but an attacked rook, or an attacked (empty) square the rook alone passes through, changes nothing.",
        ],
      },
    ],
    completionSummary: [
      'Castling moves your king to safety and brings a rook into play, in one move — for both White and Black.',
      "Both sides lose that right the moment the king or that rook moves, forever — even if they come back.",
      "The king can never castle out of check, through check, or into check — but an attacked rook, or an attacked (empty) square the rook alone passes through, doesn't stop it.",
    ],
  },
  {
    slug: 'pawn-promotion',
    name: 'Pawn Promotion',
    description: 'A pawn that reaches the far end of the board must become a queen, rook, bishop, or knight.',
    summary: "Reach the other side of the board, and your pawn becomes something much stronger.",
    completionHeadline: 'You learned about pawn promotion!',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'WHAT IS PROMOTION?',
        fen: '7k/P7/8/8/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a8'],
        text: [
          'A pawn that reaches the far end of the board — the last rank — does not stay a pawn.',
          'It must immediately become a queen, rook, bishop, or knight. This is called promotion.',
        ],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: '7k/P7/8/8/8/8/8/7K w - - 0 1',
        pieceSquare: 'a7',
        pieceColor: 'w',
        filterMode: 'legal',
        requiresPromotionChoice: true,
        prompt: 'Move the pawn to the last rank to promote it.',
        wrongText: 'Not quite. Move the pawn straight ahead, to a8.',
        hintText: 'Move it to a8 — then choose what it becomes.',
        revealSquaresFrom: 'hint',
        correctText: 'Promoted! Most players choose a queen, since it\'s the strongest piece — but any of the four is a legal choice.',
      },
      {
        kind: 'demo',
        stageLabel: 'ANY OF THE FOUR',
        fen: '7k/8/8/8/8/8/8/6QK w - - 0 1',
        pieceColor: 'w',
        text: [
          "You always choose the piece — the game never picks for you, and it's never automatic.",
          "Almost every time, a queen is the strongest choice. But sometimes a knight, rook, or bishop is actually better — choosing a weaker piece on purpose is called underpromotion.",
        ],
      },
      {
        kind: 'try',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        fen: 'k7/5P2/8/8/8/8/8/7K w - - 0 1',
        pieceSquare: 'f7',
        pieceColor: 'w',
        filterMode: 'legal',
        requiresPromotionChoice: true,
        prompt: '⭐ Show what you learned — push this pawn to the last rank and promote it.',
        wrongText: 'Move it straight ahead, to the last rank.',
        hintText: 'Move it to f8 — then choose its new piece.',
        revealSquaresFrom: 'hint',
        correctText: "Promoted again — and any of the four pieces counts as correct. The mandatory choice is the whole point.",
      },
    ],
    completionSummary: [
      'A pawn reaching the last rank must promote — to a queen, rook, bishop, or knight.',
      "You always choose which piece, and a queen is almost always the strongest pick.",
    ],
  },
  {
    slug: 'en-passant',
    name: 'En Passant',
    description: 'A special pawn capture that can only happen the instant after an enemy pawn jumps two squares past yours.',
    summary: 'A special capture that only works in the one moment right after it happens.',
    completionHeadline: 'You learned en passant!',
    steps: [
      {
        kind: 'demo',
        stageLabel: "THE SETUP",
        fen: 'k7/3p4/8/4P3/8/8/8/7K b - - 0 1',
        pieceColor: 'w',
        arrows: [['d7', 'd5']],
        text: [
          "White's pawn is on e5. Black's pawn, still on its starting square, is about to jump two squares — right past the white pawn, landing beside it instead of in front of it.",
        ],
      },
      {
        kind: 'demo',
        stageLabel: 'THE SPECIAL CAPTURE',
        fen: 'k7/8/8/3pP3/8/8/8/7K w - d6 0 1',
        pieceColor: 'w',
        highlightSquares: ['d6'],
        text: [
          "Black's pawn now sits right beside White's, on d5 — as if it had only moved one square.",
          "Because of that two-square jump, White may capture it as though it HAD only moved one square: diagonally forward onto d6, removing the black pawn on d5. This is en passant — French for \"in passing.\"",
        ],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: 'k7/8/8/3pP3/8/8/8/7K w - d6 0 1',
        pieceSquare: 'e5',
        pieceColor: 'w',
        filterMode: 'enPassant',
        prompt: 'Capture the black pawn en passant.',
        wrongText: "Not quite. The capture lands on the square just past the black pawn, not on the pawn itself.",
        hintText: 'Move your pawn to d6 — it captures the black pawn on d5 along the way.',
        revealSquaresFrom: 'hint',
        correctText: "En passant! You captured a pawn that never actually stood in front of yours.",
      },
      {
        kind: 'judgment',
        stageLabel: "THE ONE-MOVE WINDOW",
        fen: 'k7/8/8/3pP3/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['d5'],
        prompt: "Same pawns, same squares — but a different move has happened since Black's pawn jumped to d5. Can White still capture it en passant?",
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — en passant only exists for one move, right after the two-square jump. Once anything else happens, that window is gone for good.",
        wrongText: "The pawns look the same as before — but the timing is what matters here, not the position.",
        hintText: "En passant is only ever legal on the very next move after the jump — never later, no matter how the position looks.",
      },
    ],
    completionSummary: [
      "En passant lets a pawn capture an enemy pawn that just jumped two squares past it, as if it had only moved one.",
      "It only exists for one move — the one right after the jump. Any other move, and the chance is gone for the rest of the game.",
    ],
  },
  {
    slug: 'ways-a-game-can-end',
    name: 'Ways a Game Can End',
    description: 'Checkmate is the most famous ending, but far from the only one — a game can also end in several kinds of draw, or by resignation.',
    summary: 'Checkmate, draws, and resignation — every way a chess game actually ends.',
    completionHeadline: 'You learned how games end!',
    // REVIEW: rebuilt after a correctness pass flagged that the original
    // checkmate FEN wasn't actually checkmate (king not in check) and the
    // repetition/50-move demos only ever showed two bare kings — a
    // position that's already an automatic draw by insufficient material,
    // so it couldn't demonstrate an ONGOING repetition/move-count sequence
    // at all. Every FEN below was verified via chess.js (inCheck/
    // isCheckmate/isStalemate/legal move count) before being written in.
    steps: [
      {
        kind: 'demo',
        stageLabel: 'RECAP: CHECKMATE',
        // Verified via chess.js: inCheck true, isCheckmate true, 0 legal
        // moves. A real back-rank mate — the rook pins Black's king to the
        // 8th rank; the three unmoved pawns block every escape square.
        fen: 'R5k1/5ppp/8/8/8/8/6K1/8 b - - 0 1',
        pieceColor: 'w',
        arrows: [['a8', 'g8']],
        highlightSquares: ['f8', 'h8'],
        text: [
          'The white rook controls the entire 8th rank, all the way to the king.',
          "The king can't step to f8 or h8 — the rook covers those too — and its own pawns block f7, g7, and h7.",
          'Nothing can block the rook or capture it. That combination is checkmate.',
        ],
      },
      {
        kind: 'judgment',
        stageLabel: 'CHECKMATE CHECK',
        fen: 'R5k1/5ppp/8/8/8/8/6K1/8 b - - 0 1',
        pieceColor: 'w',
        arrows: [['a8', 'g8']],
        prompt: 'The rook is checking the king along the back rank. Can the king escape, block, or capture to stop it?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — every escape square is covered or blocked, nothing can block the rook's path, and nothing can capture it. That's checkmate.",
        wrongText: "Look again at f8 and h8 — the rook's own line covers both of those too.",
        hintText: "The king's own pawns block f7/g7/h7, and the rook already covers f8 and h8.",
      },
      {
        kind: 'demo',
        stageLabel: 'RECAP: STALEMATE',
        // Unchanged, re-verified via chess.js: inCheck false, isStalemate
        // true, 0 legal moves, Black to move — the position itself was
        // always correct; it just never told the learner whose move it was.
        fen: 'k7/8/KQ6/8/8/8/8/8 b - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a7', 'b7', 'b8'],
        text: [
          "It's Black to move, and Black's king is not in check.",
          'But every square next to it is covered: a7 and b7 by both the queen and king, b8 by the queen alone.',
          'No legal move, no check — that combination is stalemate, not checkmate.',
        ],
      },
      {
        kind: 'judgment',
        stageLabel: 'STALEMATE CHECK',
        fen: 'k7/8/KQ6/8/8/8/8/8 b - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['a7', 'b7', 'b8'],
        prompt: 'Black is not in check. Can Black make a legal move?',
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: 'No — a7, b7, and b8 are all covered by the white queen or king, and those are the only squares the black king could move to.',
        wrongText: "Let's check together. The king cannot move onto an attacked square.",
        hintText: 'Check each of the three squares next to the black king — is the queen or king already covering it?',
      },
      {
        kind: 'demo',
        stageLabel: 'RESIGNATION',
        fen: 'R5k1/5ppp/8/8/8/8/6K1/8 b - - 0 1',
        pieceColor: 'w',
        text: [
          "A player can resign at any time, giving up the game on the spot — they don't have to wait for checkmate.",
          'You choose to stop playing and give up the game. Nothing on the board forces it.',
        ],
      },
      {
        kind: 'demo',
        stageLabel: 'AGREED DRAW',
        fen: 'R5k1/5ppp/8/8/8/8/6K1/8 b - - 0 1',
        pieceColor: 'w',
        text: ['Both players can also agree to a draw instead of continuing.', 'One player offers a draw. The other accepts. Both must agree.'],
      },
      // Threefold repetition — a 3-frame counted sequence on one real,
      // ongoing position (verified via chess.js: legal, 21 moves, not
      // check/mate/stalemate), not the bare two-king FEN the original
      // version used (which is already an automatic draw on its own and
      // can't demonstrate an ongoing repetition at all). The moves that
      // connect each repeat aren't simulated — the teaching point is the
      // exact position recurring, not the path between repeats.
      {
        kind: 'demo',
        stageLabel: 'THREEFOLD REPETITION',
        fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1',
        pieceColor: 'w',
        text: ['Imagine this exact position happens during a game.', '1st time.'],
      },
      {
        kind: 'demo',
        stageLabel: 'THREEFOLD REPETITION',
        fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1',
        pieceColor: 'w',
        text: ['A few moves happen, and the exact same position comes back.', '2nd time.'],
      },
      {
        kind: 'demo',
        stageLabel: 'THREEFOLD REPETITION',
        fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1',
        pieceColor: 'w',
        text: ['It happens a third time — same pieces, same squares, same player to move.', '3rd time. Either player may now CLAIM a draw.'],
      },
      // 50-move rule — a real before/after pair (verified via chess.js:
      // both legal, turn correctly flips after the pawn moves), showing
      // the counter close to the limit and then reset, not just an
      // abstract claim over two bare kings.
      {
        kind: 'demo',
        stageLabel: 'THE 50-MOVE RULE',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceColor: 'w',
        text: [
          'If each player has made 50 moves without moving a pawn or capturing a piece, the player whose turn it is can claim a draw.',
          'The other player does not need to agree.',
          '48 moves have gone by like this already — close to the limit.',
        ],
      },
      {
        kind: 'demo',
        stageLabel: 'THE 50-MOVE RULE',
        fen: 'k7/8/8/8/8/4P3/8/7K b - - 0 1',
        pieceColor: 'w',
        arrows: [['e2', 'e3']],
        text: ['A pawn just moved.', 'The counter resets straight back to 0.'],
      },
      {
        kind: 'judgment',
        stageLabel: 'INSUFFICIENT MATERIAL',
        fen: 'k7/8/8/8/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        prompt: "Only the two kings are left on the board. Can either side ever deliver checkmate from here?",
        options: ['Yes', 'No'],
        correctOptionIndex: 1,
        correctText: "No — with just two kings (or too few pieces to ever force checkmate), the game is an automatic draw. Unlike repetition or the 50-move rule, nobody has to claim this one.",
        wrongText: 'Think about what a single king, alone, could ever actually attack and trap.',
        hintText: "A lone king can never deliver checkmate by itself — there just isn't enough material left on the board.",
      },
      {
        kind: 'demo',
        stageLabel: 'CLAIMED VS AUTOMATIC',
        fen: 'k7/8/8/8/8/8/8/7K w - - 0 1',
        pieceColor: 'w',
        text: [
          "Worth keeping straight: checkmate, stalemate, and insufficient material all end the game automatically — nobody has to do anything.",
          'Threefold repetition and the 50-move rule are different — they only become a draw if a player actually claims one. Resigning and agreeing to a draw are simply choices the players make themselves.',
          'More rules: if a position repeats 5 times, or 75 moves pass with no pawn move or capture, the draw happens automatically that time — no claim needed.',
        ],
      },
    ],
    completionSummary: [
      'Checkmate wins the game.',
      'Stalemate is a draw.',
      'Only two kings left? It\'s a draw.',
      'Resigning means giving up.',
      'An agreed draw needs both players to say yes.',
      'Some draws need a claim.',
    ],
  },
  {
    slug: 'mini-game',
    name: 'Your First Mini Game',
    description: 'Use everything you learned in a small game against Nivenxa.',
    summary: "Play your first mini game and put everything you've learned into practice.",
    miniGame: true,
    miniGameFen: MINI_GAME_FEN,
    completionSummary: [
      'You know the board.',
      'You know the pieces.',
      'You know how they move and capture.',
      'You know check and checkmate.',
    ],
  },
]

export function getBasicsLesson(slug: string): BasicsLesson | undefined {
  return BASICS.find((b) => b.slug === slug)
}

/** BASICS is already authored in curriculum order — next lesson is just the next array entry. */
export function getNextBasicsLesson(slug: string): BasicsLesson | undefined {
  const index = BASICS.findIndex((b) => b.slug === slug)
  if (index === -1 || index === BASICS.length - 1) return undefined
  return BASICS[index + 1]
}
