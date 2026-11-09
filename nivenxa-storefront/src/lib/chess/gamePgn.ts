import { Chess } from 'chess.js'
import type { NormalizedGame, NormalizedMove } from './analysisTypes'

// Pure helpers for a played game stored compactly as SAN text + metadata (chess_games). No per-move FENs are stored;
// they are rebuilt here, from the starting position, when a game is replayed, analysed or exported.

export interface StoredGame {
  id?: string
  movesSan: string
  startingFen?: string | null
  playerColor: 'w' | 'b'
  opponent: string
  result: '1-0' | '0-1' | '1/2-1/2' | '*' | null
  startedAt?: string | null
  timeControl?: string | null
}

export const sansFromText = (text: string): string[] => text.split(/\s+/).filter(Boolean)
export const textFromSans = (sans: string[]): string => sans.join(' ')

/** Replays the SAN list from the starting position; returns null if any move is illegal (corrupt or tampered data). */
export function replayFens(movesSan: string, startingFen?: string | null): { fens: string[]; moves: NormalizedMove[] } | null {
  const chess = startingFen ? new Chess(startingFen) : new Chess()
  const fens: string[] = [chess.fen()]
  const moves: NormalizedMove[] = []
  const sans = sansFromText(movesSan)
  for (let i = 0; i < sans.length; i++) {
    const fenBefore = chess.fen()
    let made
    try {
      made = chess.move(sans[i])
    } catch {
      return null
    }
    if (!made) return null
    moves.push({ ply: i + 1, color: made.color, san: made.san, fenBefore, fenAfter: chess.fen(), resolutionStatus: 'confirmed' })
    fens.push(chess.fen())
  }
  return { fens, moves }
}

const ymd = (iso?: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, '.') : '????.??.??')

/** A standards-shaped PGN (seven-tag roster + SetUp/FEN when the start isn't standard) rebuilt from the stored data. */
export function buildPgn(g: StoredGame): string | null {
  const replay = replayFens(g.movesSan, g.startingFen)
  if (!replay) return null
  const you = 'You'
  const white = g.playerColor === 'w' ? you : g.opponent
  const black = g.playerColor === 'b' ? you : g.opponent
  const chess = g.startingFen ? new Chess(g.startingFen) : new Chess()
  for (const m of replay.moves) chess.move(m.san)
  chess.setHeader('Event', 'NIVENXA Chess game')
  chess.setHeader('Site', 'nivenxa.com/chess')
  chess.setHeader('Date', ymd(g.startedAt))
  chess.setHeader('Round', '-')
  chess.setHeader('White', white)
  chess.setHeader('Black', black)
  chess.setHeader('Result', g.result ?? '*')
  if (g.timeControl) chess.setHeader('TimeControl', g.timeControl)
  if (g.startingFen) {
    chess.setHeader('SetUp', '1')
    chess.setHeader('FEN', g.startingFen)
  }
  return chess.pgn()
}

/** The shape the Analysis Player takes (same one Play hands over today), rebuilt from the compact record. */
export function normalizedFromStored(g: StoredGame): NormalizedGame | null {
  const replay = replayFens(g.movesSan, g.startingFen)
  if (!replay) return null
  return {
    source: 'nivenxa-play',
    metadata: {
      white: g.playerColor === 'w' ? 'You' : g.opponent,
      black: g.playerColor === 'b' ? 'You' : g.opponent,
      result: g.result ?? undefined,
      playedOn: g.startedAt ? g.startedAt.slice(0, 10) : undefined,
    },
    startingFen: g.startingFen ?? undefined,
    moves: replay.moves,
    needsVerification: false,
  }
}

export type GameOutcome = 'won' | 'lost' | 'draw' | 'unfinished'

export function outcomeOfPlayedGame(result: StoredGame['result'], playerColor: 'w' | 'b'): GameOutcome {
  if (result === '1/2-1/2') return 'draw'
  if (result === '1-0') return playerColor === 'w' ? 'won' : 'lost'
  if (result === '0-1') return playerColor === 'b' ? 'won' : 'lost'
  return 'unfinished'
}
