// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Every trainer/step position (fen + pieceSquare) has been checked for
// legality via chess.js, but the prose is a first draft and has NOT been
// checked by a chess-knowledgeable human. Same word rule as
// Openings/Tactics — see those files' header comments.
//
// BASICS follows a single story, in the exact order the child moves through
// it: What is this board? -> Who plays on it? -> What are my pieces? ->
// Which pieces are stronger? -> Where do they start? -> How does each one
// move? -> How do I take another piece? -> How do I actually win?
//
//   1. The Chessboard          6. How Rooks Move      11. How Kings Move
//   2. Meet Your Pieces        7. How Bishops Move     12. Check
//   3. Set Up the Board        8. How Knights Move     13. Getting Out of Check
//   4. How Pawns Move          9. How Queens Move      14. Checkmate
//   5. (see 4)                 10. (see 9)             15. Your First Mini Game
//
// (Rules later handles: Castling, Promotion, En Passant, Stalemate, Draws.)
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
//   wins. Set Up the Board builds the starting position corner-by-corner.
// - The six piece-movement lessons use `steps`: a `PieceLesson` sequence of
//   SEE IT MOVE -> YOUR TURN -> WHAT STOPS IT -> CAPTURE -> SHOW WHAT YOU
//   LEARNED. Movement and capture are taught together, not in separate
//   lessons — every correctness check (blocking, no-jumping, king safety,
//   captures) is real chess.js legal-move generation, nothing hardcoded.
// - Check, Getting Out of Check, and Checkmate now also use `steps`
//   (`PieceLesson`) instead of the old single-exercise `trainer` — each
//   teaches through a demo before asking the learner to try it, and Getting
//   Out of Check walks through all three escape techniques (move, block,
//   capture) as separate positions.
// - Your First Mini Game (`miniGame: true`) is a real, engine-backed game on
//   reduced material (White has Queen + 2 pawns vs Black's Rook + 2 pawns) —
//   not another quiz. It reuses the same `useChessGame` + `useStockfish`
//   hooks as /chess/play, with the engine set to its gentlest skill level.
//   See `MiniGameLesson.tsx` for the component; this file only supplies the
//   starting position and the closing copy.
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
  completionSummary?: string[]
}

const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const MINI_GAME_FEN = 'r3k3/4pp2/8/8/8/8/4PP2/3QK3 w - - 0 1'

export const BASICS: BasicsLesson[] = [
  {
    slug: 'the-chessboard',
    name: 'The Chessboard',
    description: 'A chessboard has 64 squares, two colours, one correct direction, and a name for every square.',
    summary: 'Learn the board — squares, colours, direction, and names.',
    boardFen: EMPTY_FEN,
    boardSteps: [
      // Part A — meet the board
      {
        kind: 'demo',
        stageLabel: 'MEET THE BOARD',
        text: ['A chessboard has 64 squares.', 'It has 8 rows and 8 columns.'],
      },
      {
        kind: 'demo',
        stageLabel: 'ONE ROW',
        highlightSquares: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
        text: ['Here is one row.', 'It has 8 squares.'],
      },
      {
        kind: 'demo',
        stageLabel: 'ONE COLUMN',
        highlightSquares: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
        text: ['Here is one column.', 'It also has 8 squares, going the other way.'],
      },
      // Part B — two colours
      {
        kind: 'demo',
        stageLabel: 'TWO COLOURS',
        text: ['The squares use two colours.', 'The colours take turns from one square to the next.'],
      },
      {
        kind: 'demo',
        stageLabel: 'LIGHT AND DARK',
        text: [
          'Chessboards can use different colours.',
          'They might be white and black, cream and brown, or even white and green.',
          'Whatever the colours are, we call them light squares and dark squares.',
        ],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'any',
        correctSquares: allLightSquares(),
        prompt: 'Click a light square.',
        wrongText: "Not quite — that's a dark square.",
        hintText: 'Try a2, c2, e2, or g2.',
        revealSquaresFrom: 'hint',
        correctText: "That's a light square.",
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'any',
        correctSquares: allDarkSquares(),
        prompt: 'Now click a dark square.',
        wrongText: "Not quite — that's a light square.",
        hintText: 'Try a1, c1, e1, or g1.',
        revealSquaresFrom: 'hint',
        correctText: "That's a dark square.",
      },
      // Part C — board direction (real pieces, for a concrete "is this right" judgement)
      {
        kind: 'demo',
        stageLabel: 'PUT IT THE RIGHT WAY',
        fen: START_FEN,
        text: ["Now let's set up the board correctly.", 'The square at your bottom-right should be a light square.'],
      },
      {
        kind: 'demo',
        stageLabel: 'REMEMBER',
        fen: START_FEN,
        highlightSquares: ['h1'],
        text: ['A simple memory line:', 'Light on the right.'],
      },
      {
        kind: 'yesNo',
        stageLabel: 'IS THIS RIGHT?',
        boardIsCorrect: true,
        prompt: 'Is this board the right way around?',
        correctText: 'Yes — the light square is on the right.',
        wrongText: 'Look again — the bottom-right square here is light. That is correct.',
      },
      {
        kind: 'yesNo',
        stageLabel: 'IS THIS RIGHT?',
        boardIsCorrect: false,
        prompt: 'What about this one — is it the right way around?',
        correctText: 'Right — the dark square is on the right, so this board is turned the wrong way.',
        wrongText: 'Look again — the bottom-right square here is dark. That is the wrong way around.',
      },
      // Part D — files, ranks, and square names
      {
        kind: 'demo',
        stageLabel: 'FILES',
        highlightSquares: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'],
        text: ['The lines going up and down use letters.', 'They go from a to h.'],
      },
      {
        kind: 'demo',
        stageLabel: 'RANKS',
        highlightSquares: ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
        text: ['The lines going across use numbers.', 'They go from 1 to 8.'],
      },
      {
        kind: 'demo',
        stageLabel: 'SQUARE NAMES',
        highlightSquares: ['e4'],
        text: ['Every square has a name.', 'It combines its letter and its number.', 'This square is e4.'],
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'any',
        correctSquares: ['e4'],
        prompt: 'Can you find e4?',
        wrongText: 'Not quite. Remember — letter first, then number.',
        hintText: 'e4 is the letter e, number 4.',
        revealSquaresFrom: 'hint',
        correctText: "That's e4!",
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'YOUR TURN',
        mode: 'any',
        correctSquares: ['c6'],
        prompt: 'Now find c6.',
        wrongText: 'Not quite. Try again.',
        hintText: 'c6 is the letter c, number 6.',
        revealSquaresFrom: 'hint',
        correctText: "That's c6!",
      },
      {
        kind: 'squareQuiz',
        stageLabel: 'SHOW WHAT YOU LEARNED',
        mode: 'all',
        correctSquares: ['a1', 'h8'],
        prompt: '⭐ Show what you learned — find both a1 and h8.',
        wrongText: 'Not quite. Try again.',
        hintText: 'a1 is the near-left corner, h8 is the far corner.',
        revealSquaresFrom: 'hint',
        correctText: 'You found both corners!',
      },
    ],
    completionSummary: [
      'A chessboard has 64 squares, in 8 rows and 8 columns, alternating light and dark.',
      'Set up the board with a light square on your right.',
      'Every square has a name — its letter (a-h) and its number (1-8).',
    ],
  },
  {
    slug: 'meet-the-pieces',
    name: 'Meet Your Pieces',
    description: 'White and Black have the same six piece types, and some pieces are stronger than others.',
    summary: 'Meet every piece — both colours, and how strong each one is.',
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
    summary: 'Learn where each piece begins.',
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
        stageLabel: 'READY',
        text: ['🎉 The board is ready!', "Now let's learn how your pieces move."],
      },
    ],
    completionSummary: [
      'Rooks in the corners, then knights, then bishops.',
      'The queen stands on her own colour, the king beside her, and pawns fill the row in front.',
    ],
  },
  {
    slug: 'pawns',
    name: 'How Pawns Move',
    description: 'Pawns move forward, and capture diagonally.',
    summary: 'Learn how pawns move and capture.',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'SEE IT MOVE',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e3'],
        text: ['Pawns move forward.', 'They move straight ahead, one square at a time.'],
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
        stageLabel: 'TWO SQUARES',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceColor: 'w',
        highlightSquares: ['e4'],
        text: ['On its first move, a pawn may move two squares.', 'After that first move, it can only move one square at a time.'],
      },
      {
        kind: 'try',
        stageLabel: 'YOUR TURN',
        fen: 'k7/8/8/8/8/8/4P3/7K w - - 0 1',
        pieceSquare: 'e2',
        pieceColor: 'w',
        filterMode: 'legal',
        onlyTo: ['e4'],
        prompt: 'Now move it two squares.',
        wrongText: 'Not quite. Try moving two squares this time.',
        hintText: 'From its starting square, a pawn may move two squares forward, to e4.',
        revealSquaresFrom: 'hint',
        correctText: "On its first move, a pawn can go two squares.",
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
      },
    ],
    completionSummary: ['Pawns move forward, and capture diagonally.', 'On their first move, they can go two squares.'],
  },
  {
    slug: 'rooks',
    name: 'How Rooks Move',
    description: 'The rook moves straight — up, down, left, or right — as far as the path is clear.',
    summary: 'Learn how rooks move, block, and capture.',
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
    summary: 'Learn how bishops move, block, and capture.',
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
    summary: 'Learn how knights move and jump.',
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
    summary: 'Learn how the queen moves, blocks, and captures.',
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
    summary: 'Learn how the king moves and stays safe.',
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
        correctText: 'Good — you found a square where your king is safe.',
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
    ],
    completionSummary: ['The king moves one square in any direction.', 'It always avoids squares where it could be captured.'],
  },
  {
    slug: 'check',
    name: 'Check',
    description: 'A move that attacks the king is called check.',
    summary: 'Learn what check means and how to give it.',
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
    summary: 'Learn the three ways to get your king out of check.',
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
        text: ['Move, block, or capture — three ways to get out of check.'],
      },
    ],
    completionSummary: ['There are three ways to get out of check.', 'Move your king, block the attack, or capture the attacking piece.'],
  },
  {
    slug: 'checkmate',
    name: 'Checkmate',
    description: 'Checkmate ends the game — the king is in check with no way to escape.',
    summary: 'Learn how to find checkmate.',
    steps: [
      {
        kind: 'demo',
        stageLabel: 'WHAT IS CHECKMATE?',
        fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
        pieceColor: 'w',
        text: [
          'Checkmate ends the game.',
          'The king is in check, and there is no move, block, or capture that saves it.',
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
    slug: 'mini-game',
    name: 'Your First Mini Game',
    description: 'Use everything you learned in a small game against Nivenxa.',
    summary: 'Play a real, small game — your first time putting it all together.',
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
