import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'

export interface MoveSquares {
  from: Key
  to: Key
  piece: string
  /** The captured piece's type, if this move was a capture. */
  captured?: string
}

/** Replays `moves` (SAN) once from `fen` (or the standard start position) and
 * returns each move's from/to squares and piece type, aligned by index. */
export function computeMoveSquares(moves: string[], fen?: string): MoveSquares[] {
  const chess = fen ? new Chess(fen) : new Chess()
  return moves.map((san) => {
    const move = chess.move(san)
    return { from: move.from as Key, to: move.to as Key, piece: move.piece, captured: move.captured }
  })
}

/** The FEN after replaying the first `count` moves (SAN) from `fen` (or the standard start position). `count` of 0 returns the starting position unchanged. */
export function fenAfter(moves: string[], count: number, fen?: string): string {
  const chess = fen ? new Chess(fen) : new Chess()
  for (const san of moves.slice(0, count)) chess.move(san)
  return chess.fen()
}

export const PIECE_NAME: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

/** The square of `color`'s king in `fen`, or `undefined` if (somehow) there isn't one. */
export function findKingSquare(fen: string, color: 'w' | 'b'): string | undefined {
  const chess = new Chess(fen)
  for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      const square = `${file}${rank}`
      const piece = chess.get(square as Parameters<Chess['get']>[0])
      if (piece?.type === 'k' && piece.color === color) return square
    }
  }
  return undefined
}

/**
 * What a piece on `square` would attack if it were still its own side's
 * move — `fen` reflects the position right after that piece moved there, so
 * the turn field has already flipped to the opponent; flipping it back
 * (geometry doesn't care about the rest of the position) is what lets
 * chess.js answer "what does this piece threaten" directly, rather than
 * hand-rolling attack rules per piece type. King captures are filtered out
 * by every caller that cares (a plain attack on the king is just check
 * under another name).
 */
export function attackedPiecesFrom(fen: string, square: string): { square: string; type: string }[] {
  const parts = fen.split(' ')
  parts[1] = parts[1] === 'w' ? 'b' : 'w'
  const chess = new Chess(parts.join(' '))
  return chess
    .moves({ square: square as Parameters<Chess['get']>[0], verbose: true })
    .filter((m) => m.captured)
    .map((m) => ({ square: m.to, type: m.captured! }))
}

/**
 * The first occupied square beyond `throughSquare`, continuing in a
 * straight line away from `attackerSquare` — e.g. what a skewer actually
 * exposes. The piece directly behind a blocker is never itself "attacked"
 * while the blocker is still there (a sliding piece's own vision stops at
 * it), so this is answered with board geometry, not an attack query.
 * `undefined` when the three squares aren't on one rank/file/diagonal, or
 * nothing is behind the blocker within the board.
 */
export function pieceBehindAlongLine(
  fen: string,
  attackerSquare: string,
  throughSquare: string
): { square: string; type: string; color: 'w' | 'b' } | undefined {
  const aFile = attackerSquare.charCodeAt(0)
  const aRank = parseInt(attackerSquare[1], 10)
  const tFile = throughSquare.charCodeAt(0)
  const tRank = parseInt(throughSquare[1], 10)
  const dFile = Math.sign(tFile - aFile)
  const dRank = Math.sign(tRank - aRank)
  // Must be a real rank/file/diagonal line (not the same square, and not an
  // L-shape or anything else a sliding piece couldn't have reached).
  if (dFile === 0 && dRank === 0) return undefined
  if (dFile !== 0 && dRank !== 0 && Math.abs(tFile - aFile) !== Math.abs(tRank - aRank)) return undefined
  const chess = new Chess(fen)
  let file = tFile + dFile
  let rank = tRank + dRank
  while (file >= 97 && file <= 104 && rank >= 1 && rank <= 8) {
    const square = `${String.fromCharCode(file)}${rank}`
    const piece = chess.get(square as Parameters<Chess['get']>[0])
    if (piece) return { square, type: piece.type, color: piece.color }
    file += dFile
    rank += dRank
  }
  return undefined
}

// Spells out the file letter phonetically ("e4" -> "ee 4") — speechSynthesis
// otherwise tends to read a bare letter+digit square name inconsistently
// across browsers/voices. The rank digit is left alone; TTS already reads
// a lone digit as a number correctly.
const FILE_PHONETIC: Record<string, string> = {
  a: 'ay',
  b: 'bee',
  c: 'see',
  d: 'dee',
  e: 'ee',
  f: 'eff',
  g: 'gee',
  h: 'aitch',
}

/** `", ee 4"` for `"e4"` — the leading comma is the "small pause before the square name." */
export function spokenSquare(square: string): string {
  const file = square[0]?.toLowerCase()
  const rank = square.slice(1)
  return `, ${FILE_PHONETIC[file] ?? file} ${rank}`
}

/**
 * A natural sentence announcing a move — "White moves the pawn to e4." /
 * "White's knight captures the pawn on d4." — rather than reading chess
 * notation aloud. Purely mechanical (piece, destination, capture, check):
 * never the pedagogical "why", which stays separately authored content.
 */
export function announceMove(move: MoveSquares, mover: 'White' | 'Black', isCheck: boolean): string {
  const pieceName = PIECE_NAME[move.piece] ?? 'piece'
  const squareSpoken = spokenSquare(move.to)
  const sentence = move.captured
    ? `${mover}'s ${pieceName} captures the ${PIECE_NAME[move.captured] ?? 'piece'} on${squareSpoken}.`
    : `${mover} moves the ${pieceName} to${squareSpoken}.`
  return isCheck ? `${sentence} Check!` : sentence
}
