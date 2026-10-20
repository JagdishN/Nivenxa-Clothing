import { Chess, type Square } from 'chess.js'
import type { Key } from 'chessground/types'

export type MoveFilterMode = 'legal' | 'captures' | 'checks' | 'checkmates' | 'castling' | 'enPassant'

const ALL_SQUARES: Key[] = (() => {
  const squares: Key[] = []
  for (const file of 'abcdefgh') for (const rank of '12345678') squares.push(`${file}${rank}` as Key)
  return squares
})()

/** The squares a move counts as "correct" for, depending on what this lesson is teaching. */
export function correctSquaresFor(fen: string, square: string, mode: MoveFilterMode): Key[] {
  const chess = new Chess(fen)
  const moves = chess.moves({ square: square as Square, verbose: true })
  if (mode === 'legal') return moves.map((m) => m.to as Key)
  if (mode === 'captures') return moves.filter((m) => m.captured).map((m) => m.to as Key)
  // Castling/en passant are generated from the mover's own square (the king,
  // the capturing pawn) exactly like any other move — no simulation needed,
  // just a flag filter. Confirmed against chess.js's own verbose move shape:
  // castling sets flags 'k'/'q', en passant sets flag 'e' (NOT 'c' — its
  // own .isCapture() is misleadingly false even though .captured is set).
  if (mode === 'castling') return moves.filter((m) => m.isKingsideCastle() || m.isQueensideCastle()).map((m) => m.to as Key)
  if (mode === 'enPassant') return moves.filter((m) => m.isEnPassant()).map((m) => m.to as Key)
  const out: Key[] = []
  for (const m of moves) {
    const clone = new Chess(fen)
    clone.move(m.san)
    if (mode === 'checks' && clone.isCheck()) out.push(m.to as Key)
    if (mode === 'checkmates' && clone.isCheckmate()) out.push(m.to as Key)
  }
  return out
}

/**
 * Every square NOT in `correct`, excluding ranks 1/8 — a pawn placed there
 * via `applyRawMove` produces a FEN chess.js refuses to re-parse ("some
 * pawns are on the edge rows"). Excluding those two ranks universally (not
 * just for pawn lessons) keeps this piece-agnostic and still leaves plenty
 * of genuinely wrong squares to offer.
 */
export function wrongSquarePool(pieceSquare: string, correct: Key[]): Key[] {
  return ALL_SQUARES.filter((sq) => sq !== pieceSquare && sq[1] !== '1' && sq[1] !== '8' && !correct.includes(sq))
}

/**
 * Moves a piece on the board WITHOUT chess-rule validation — used to show a
 * "wrong" attempt (chess.js's real `.move()` would just refuse it) or to
 * render the resolved correct move without re-deriving SAN. Display only:
 * never round-trip the result back through `new Chess(...)`, since a
 * deliberately-wrong destination may not be a legal position.
 */
export function applyRawMove(fen: string, from: string, to: string): string {
  const chess = new Chess(fen)
  const piece = chess.get(from as Square)
  if (!piece) return fen
  chess.remove(from as Square)
  if (chess.get(to as Square)) chess.remove(to as Square)
  chess.put(piece, to as Square)
  return chess.fen()
}

/**
 * Castling's rook jump is a real side effect of the move, not something
 * applyRawMove (which only relocates the one piece it's told about) can
 * show — the rook would otherwise appear stuck on its original square
 * while only the king sprite moves. Unlike promotion, castling needs no
 * extra field to resolve unambiguously, so a real chess.js `.move()` round-
 * trip is both correct and simpler than hand-rolling the rook's jump.
 */
export function applyCastlingMove(fen: string, from: string, to: string): string {
  const chess = new Chess(fen)
  chess.move({ from: from as Square, to: to as Square })
  return chess.fen()
}

/**
 * Same display-only approach as applyRawMove, but swaps in the chosen
 * promotion piece instead of leaving a pawn sitting on the back rank — the
 * Pawn Promotion lesson's own `try` step (see PieceLesson.tsx's
 * `requiresPromotionChoice`) needs the learner's actual Q/R/B/N choice
 * reflected on the board. Deliberately a `put()`, not `chess.move({from,
 * to, promotion})`: chess.js's real `.move()` throws when a promoting move
 * is called without a `promotion` field (confirmed — every one of the
 * pawn's 4 internal candidate moves carries a `promotion`, so an undefined
 * one never matches any of them), and we already know the destination is a
 * legal promotion square by the time this is called (correctSquaresFor
 * already filtered for that) — no need to re-derive it through `.move()`.
 */
export function applyPromotionMove(fen: string, from: string, to: string, promotion: 'q' | 'r' | 'b' | 'n'): string {
  const chess = new Chess(fen)
  const piece = chess.get(from as Square)
  if (!piece) return fen
  chess.remove(from as Square)
  if (chess.get(to as Square)) chess.remove(to as Square)
  chess.put({ type: promotion, color: piece.color }, to as Square)
  return chess.fen()
}

/**
 * Is `attemptedSquare` a real chess.js-legal destination for the piece on
 * `pieceSquare`, even though it wasn't the square this particular step
 * wanted? Lets a wrong attempt be told apart as "illegal move" vs. "legal
 * move, wrong exercise goal" — see feedbackCopy.ts's classifyWrongAttempt,
 * the only caller; kept here rather than there since it's one more small
 * read against the same chess.js instance moveTrainerLogic already owns.
 */
export function isLegalDestination(fen: string, pieceSquare: string, attemptedSquare: string): boolean {
  const chess = new Chess(fen)
  return chess.moves({ square: pieceSquare as Square, verbose: true }).some((m) => m.to === attemptedSquare)
}
