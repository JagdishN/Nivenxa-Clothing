// ─────────────────────────────────────────────────────────────────────────
// DRAFT CONTENT — first pass, not yet reviewed.
//
// Every trainer/step position (fen + pieceSquare) has been checked for
// legality via chess.js, but the prose is a first draft and has NOT been
// checked by a chess-knowledgeable human. Same word rule as
// Openings/Tactics — see those files' header comments.
//
// BASICS is authored in the exact curriculum order the child moves through
// it: The Board -> Meet the Pieces -> Pawns -> Rooks -> Bishops -> Knights
// -> Queen -> King -> Capturing -> Check -> Checkmate.
//
// - "The Board" is plain intro reading (no board interaction).
// - "Meet the Pieces" is the interactive `MeetThePieces` component (tap a
//   piece type, see it highlighted on the starting position) — flagged via
//   `interactive: 'meet-pieces'`, no `steps`/`trainer` needed.
// - The six piece lessons (Pawns..King) use `steps`: a `PieceLesson`
//   sequence of SEE IT MOVE -> YOUR TURN -> WHAT STOPS IT -> CAPTURE ->
//   SHOW WHAT YOU LEARNED, per the Chess Basics -> Pieces redesign. Every
//   correctness check (blocking, no-jumping, king safety, captures) is real
//   chess.js legal-move generation — nothing is hardcoded — so the "wrong"
//   decoy squares (e.g. dragging a rook past a blocking pawn) are genuinely
//   illegal moves, not a scripted fake.
// - Capturing/Check/Checkmate still use the older single-step `trainer`
//   (`MoveTrainer`) — they're not per-piece movement lessons, so they're
//   out of scope for this pass.
// ─────────────────────────────────────────────────────────────────────────

import type { MoveFilterMode } from '@/app/chess/learn/_shared/moveTrainerLogic'
import type { PieceLessonStep } from '@/app/chess/learn/_shared/PieceLesson'

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
  /** "The Board" (plain intro) has neither — just startText. */
  trainer?: BasicsTrainerConfig
  /** The six piece lessons — a multi-step SEE IT MOVE -> ... -> SHOW WHAT YOU LEARNED sequence. */
  steps?: PieceLessonStep[]
  /** "Meet the Pieces" only — renders the tap-to-reveal `MeetThePieces` component instead of `trainer`/`steps`. */
  interactive?: 'meet-pieces'
  startText?: string[]
  completionSummary?: string[]
}

export const BASICS: BasicsLesson[] = [
  {
    slug: 'the-board',
    name: 'The Board',
    description: 'Chess is played on a checkered board of 64 squares.',
    summary: 'Learn what the chess board looks like.',
    startText: [
      'The board has 8 rows and 8 columns.',
      'That makes 64 squares in total.',
      'Every square has its own name, like e4 or a1.',
    ],
    completionSummary: ['You know what the chess board looks like.'],
  },
  {
    slug: 'meet-the-pieces',
    name: 'Meet the Pieces',
    description: 'Each player starts the game with 16 pieces.',
    summary: 'Tap each piece to meet it.',
    interactive: 'meet-pieces',
    completionSummary: ['You met all six kinds of pieces.'],
  },
  {
    slug: 'pawns',
    name: 'Pawns',
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
    name: 'Rooks',
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
        wrongText: 'Not quite. Look for the enemy piece on the rook\'s path.',
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
    name: 'Bishops',
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
        fen: '7k/5P2/8/3B4/8/8/8/6K1 w - - 0 1',
        pieceColor: 'w',
        text: ['Now there is a pawn on your bishop\'s path.', 'Can the bishop move through it?'],
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
        wrongText: 'Not quite. Look for the enemy piece on the bishop\'s diagonal.',
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
    name: 'Knights',
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
        correctText: 'That\'s an L shape — two squares one way, one square to the side.',
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
    name: 'Queen',
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
        wrongText: 'Not quite. Look for the enemy piece on one of the queen\'s lines.',
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
        wrongText: 'Not quite. Remember, the queen can\'t jump over your pawn — try a different line.',
        hintText: 'Try the diagonal toward a2.',
        revealSquaresFrom: 'hint',
        correctText: 'Straight or diagonal, blocked by pieces, capturing by landing on them — that\'s the queen.',
      },
    ],
    completionSummary: [
      'The queen moves like a rook and a bishop combined — straight or diagonal.',
      'She cannot jump over pieces, and captures by landing on them.',
    ],
  },
  {
    slug: 'king',
    name: 'King',
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
        hintText: 'Try a square the rook doesn\'t attack, like d6 or e5.',
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
        correctText: 'The king captures just like it moves — one square, and only if it\'s safe.',
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
    slug: 'capturing',
    name: 'Capturing',
    description: 'Moving a piece onto an enemy piece captures it.',
    summary: 'Learn how to capture a piece.',
    trainer: {
      fen: 'k7/3p4/8/3R4/8/8/8/7K w - - 0 1',
      pieceSquare: 'd5',
      pieceColor: 'w',
      filterMode: 'captures',
      moveExplanation: 'You can capture an enemy piece by moving onto its square.',
      promptLabel: 'Find the piece you can capture.',
      hintText: 'Look for an enemy piece in the rook\'s path.',
      revealSquaresFrom: 'hint',
    },
    completionSummary: ['You learned how to capture a piece.'],
  },
  {
    slug: 'check',
    name: 'Check',
    description: 'A move that attacks the king is called check.',
    summary: 'Learn how to give check.',
    trainer: {
      fen: '4k3/8/8/3R4/8/8/8/7K w - - 0 1',
      pieceSquare: 'd5',
      pieceColor: 'w',
      filterMode: 'checks',
      moveExplanation: 'A move that attacks the king is called check.',
      promptLabel: 'Find a move that gives check.',
      hintText: 'Look for a square where the rook attacks the king.',
      revealSquaresFrom: 'hint',
    },
    completionSummary: ['You learned how to give check.'],
  },
  {
    slug: 'checkmate',
    name: 'Checkmate',
    description: 'Checkmate ends the game — the king is in check with no way to escape.',
    summary: 'Learn how to find checkmate.',
    trainer: {
      fen: '6k1/5ppp/8/8/8/8/6K1/R7 w - - 0 1',
      pieceSquare: 'a1',
      pieceColor: 'w',
      filterMode: 'checkmates',
      moveExplanation: 'Checkmate ends the game.\nThe king is in check, and it has no way to escape.',
      promptLabel: 'Find the checkmate move.',
      hintText: 'Look at the open file in front of the king.',
      revealSquaresFrom: 'hint',
    },
    completionSummary: ['You learned how to find checkmate.'],
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
