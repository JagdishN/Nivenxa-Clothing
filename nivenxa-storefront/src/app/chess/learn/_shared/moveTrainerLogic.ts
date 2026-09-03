import { Chess, type Square } from 'chess.js'
import type { Key } from 'chessground/types'

export type MoveFilterMode = 'legal' | 'captures' | 'checks' | 'checkmates'

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
