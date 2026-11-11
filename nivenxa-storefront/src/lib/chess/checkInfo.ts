import { Chess } from 'chess.js'
import type { Color, Move, PieceSymbol, Square } from 'chess.js'

/**
 * Check facts read straight from the position (never from asynchronous commentary): who is in check, which piece(s) give it,
 * along which line, and the legal ways out. Everything here comes from chess.js move generation, so nothing is guessed.
 */

export type CheckLine = 'file' | 'rank' | 'diagonal' | 'knight' | 'pawn' | 'adjacent'

export interface Checker {
  piece: PieceSymbol
  square: Square
  line: CheckLine
  /** Squares strictly between the checker and the king (empty for knights, pawns and adjacent pieces). */
  path: Square[]
}

export interface CheckReplies {
  king: string[] // SAN of king moves
  capture: string[] // SAN of captures of the checking piece by another piece
  block: string[] // SAN of interpositions
}

export interface CheckInfo {
  inCheck: true
  /** The side whose king is attacked. */
  side: Color
  kingSquare: Square
  checkers: Checker[]
  replies: CheckReplies
  checkmate: boolean
}

const NAMES: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const fileOf = (s: string) => s.charCodeAt(0) - 97
const rankOf = (s: string) => Number(s[1]) - 1
const sq = (f: number, r: number) => `${String.fromCharCode(97 + f)}${r + 1}` as Square

function lineBetween(piece: PieceSymbol, from: Square, king: Square): { line: CheckLine; path: Square[] } {
  const df = fileOf(king) - fileOf(from)
  const dr = rankOf(king) - rankOf(from)
  if (piece === 'n') return { line: 'knight', path: [] }
  if (piece === 'p') return { line: 'pawn', path: [] }
  const steps = Math.max(Math.abs(df), Math.abs(dr))
  const line: CheckLine = df === 0 ? 'file' : dr === 0 ? 'rank' : 'diagonal'
  const path: Square[] = []
  for (let i = 1; i < steps; i++) path.push(sq(fileOf(from) + Math.sign(df) * i, rankOf(from) + Math.sign(dr) * i))
  return { line: steps === 1 ? 'adjacent' : line, path }
}

/** The check facts of a position, or null when the side to move is not in check (or the FEN is unusable). */
export function checkInfoFor(fen: string): CheckInfo | null {
  try {
    const game = new Chess(fen)
    if (!game.inCheck()) return null
    const side = game.turn()
    let kingSquare: Square | null = null
    for (const row of game.board()) for (const p of row) if (p && p.type === 'k' && p.color === side) kingSquare = p.square
    if (!kingSquare) return null
    const attackerColor: Color = side === 'w' ? 'b' : 'w'
    const checkers: Checker[] = game
      .attackers(kingSquare, attackerColor)
      .map((square) => {
        const piece = game.get(square)!.type
        return { piece, square, ...lineBetween(piece, square, kingSquare!) }
      })
    const legal: Move[] = game.moves({ verbose: true })
    const replies: CheckReplies = { king: [], capture: [], block: [] }
    for (const m of legal) {
      if (m.piece === 'k') replies.king.push(m.san)
      else if (checkers.some((c) => c.square === m.to)) replies.capture.push(m.san)
      else replies.block.push(m.san)
    }
    return { inCheck: true, side, kingSquare, checkers, replies, checkmate: legal.length === 0 }
  } catch {
    return null
  }
}

const lineWords: Record<CheckLine, string> = {
  file: 'along the file',
  rank: 'along the rank',
  diagonal: 'along the diagonal',
  knight: 'with a knight jump',
  pawn: 'diagonally',
  adjacent: 'from the next square',
}

/** One verified sentence: which piece gives check, to which king, along which line. `youInCheck` picks the wording. */
export function describeCheck(info: CheckInfo, youInCheck: boolean, opponentName: string): string {
  const owner = youInCheck ? `${opponentName}'s` : 'Your'
  const target = youInCheck ? 'your king' : `${opponentName}'s king`
  const parts = info.checkers.map((c) => `${NAMES[c.piece]} on ${c.square}`)
  if (info.checkers.length > 1) {
    return `Double check: ${owner} ${parts.join(' and ')} both attack ${target} on ${info.kingSquare}.`
  }
  const c = info.checkers[0]
  const way = c.line === 'adjacent' ? lineWords.adjacent : lineWords[c.line]
  return `${owner} ${parts[0]} gives check to ${target} on ${info.kingSquare}, ${way}.`
}

const list = (xs: string[], max = 4) => (xs.length > max ? `${xs.slice(0, max).join(', ')} …` : xs.join(', '))

/** The legal ways to answer the check, from the generated legal moves. Only for the side that has to move (the player). */
export function describeReplies(info: CheckInfo): string {
  if (info.checkmate) return 'There is no legal way out of this check.'
  const bits: string[] = []
  if (info.replies.king.length) bits.push(`move the king (${list(info.replies.king)})`)
  if (info.replies.capture.length) bits.push(`capture the checking piece (${list(info.replies.capture)})`)
  if (info.replies.block.length) bits.push(`block the line (${list(info.replies.block)})`)
  return `Ways out: ${bits.join('; ')}.`
}

export interface ReplyOption {
  kind: 'king' | 'capture' | 'block'
  label: string
  moves: string[]
}

/**
 * The legal answers to the check, grouped by kind, for the "How can I respond?" help. Built only from legal-move generation, so
 * pinned pieces, double check and occupied or attacked squares are already accounted for; a group with no legal move is omitted.
 */
export function replyOptions(info: CheckInfo): ReplyOption[] {
  const out: ReplyOption[] = []
  if (info.replies.king.length) out.push({ kind: 'king', label: 'Move the king', moves: info.replies.king })
  if (info.replies.capture.length) out.push({ kind: 'capture', label: 'Capture the checking piece', moves: info.replies.capture })
  if (info.replies.block.length) out.push({ kind: 'block', label: 'Block the line', moves: info.replies.block })
  return out
}
