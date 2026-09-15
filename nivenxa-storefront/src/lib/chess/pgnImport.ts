import { Chess } from 'chess.js'
import { gameNeedsVerification } from './analysisTypes'
import type { GameSource, NormalizedGame, NormalizedGameMetadata, NormalizedMove } from './analysisTypes'

type PgnResult = '1-0' | '0-1' | '1/2-1/2' | '*'

// chess.js always returns these placeholder values for headers a PGN didn't
// actually set — filter them out rather than showing "White: ?" in the UI.
const PLACEHOLDER_HEADER_VALUES = new Set(['?', '????.??.??', '*', ''])

function asResult(value: string | undefined): PgnResult | undefined {
  return value === '1-0' || value === '0-1' || value === '1/2-1/2' || value === '*' ? value : undefined
}

function metadataFromHeaders(headers: Record<string, string | null>): NormalizedGameMetadata {
  const clean = (v: string | null | undefined) => (v && !PLACEHOLDER_HEADER_VALUES.has(v) ? v : undefined)
  return {
    white: clean(headers.White),
    black: clean(headers.Black),
    event: clean(headers.Event),
    playedOn: clean(headers.Date),
    result: asResult(clean(headers.Result)),
  }
}

/** Best-effort header scrape for the fallback path, where chess.js's own parser has already rejected the text. */
function metadataFromRawText(text: string): NormalizedGameMetadata {
  const grab = (tag: string): string | undefined => {
    const match = text.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`))
    return match && !PLACEHOLDER_HEADER_VALUES.has(match[1]) ? match[1] : undefined
  }
  return {
    white: grab('White'),
    black: grab('Black'),
    event: grab('Event'),
    playedOn: grab('Date'),
    result: asResult(grab('Result')),
  }
}

/** Strips PGN header lines, {comments}, $NAGs, move numbers, and result markers, leaving just SAN tokens in order. */
function tokenizeMoveList(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => !/^\s*\[/.test(line))
    .join(' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\$\d+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !/^\d+\.+$/.test(t))
    .filter((t) => !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
}

/**
 * Move-by-move fallback for text chess.js's own `loadPgn` rejects outright
 * (it aborts on the first bad token rather than salvaging anything before
 * it). Replays token-by-token against a live position instead: a token that
 * doesn't parse or isn't legal here becomes a single `needs-review` move
 * (fenAfter === fenBefore, since nothing was actually played) and replay
 * continues from the same position for whatever comes next — one bad token
 * flags one move, not the rest of the game. Verify Game resolves each
 * flagged move from what's actually legal there.
 */
function replayTokens(tokens: string[], source: GameSource, metadata: NormalizedGameMetadata): { game: NormalizedGame; errors: string[] } {
  const chess = new Chess()
  const moves: NormalizedMove[] = []
  const errors: string[] = []

  tokens.forEach((token, ply) => {
    const fenBefore = chess.fen()
    try {
      const move = chess.move(token)
      moves.push({ ply, color: move.color, san: move.san, fenBefore, fenAfter: chess.fen(), resolutionStatus: 'confirmed' })
    } catch {
      const color: 'w' | 'b' = ply % 2 === 0 ? 'w' : 'b'
      moves.push({ ply, color, san: token, fenBefore, fenAfter: fenBefore, resolutionStatus: 'needs-review', rawGuess: token })
      errors.push(`Move ${Math.floor(ply / 2) + 1}${color === 'b' ? ' (Black)' : ''}: couldn't recognize "${token}".`)
    }
  })

  return {
    game: { source, metadata, moves, needsVerification: gameNeedsVerification(moves) },
    errors,
  }
}

/**
 * Parses a pasted move list or full PGN into a NormalizedGame. Used directly
 * by the Paste Moves form, and by PGN file upload (a .pgn file's contents
 * are just PGN text — no separate parser needed there).
 */
export function parsePastedMoves(text: string, source: GameSource = 'paste'): { game: NormalizedGame; errors: string[] } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { game: { source, metadata: {}, moves: [], needsVerification: false }, errors: ['Paste a move list or PGN first.'] }
  }

  try {
    const chess = new Chess()
    chess.loadPgn(trimmed)
    const metadata = metadataFromHeaders(chess.header())
    const moves: NormalizedMove[] = chess.history({ verbose: true }).map((m, ply) => ({
      ply,
      color: m.color,
      san: m.san,
      fenBefore: m.before,
      fenAfter: m.after,
      resolutionStatus: 'confirmed' as const,
    }))
    return { game: { source, metadata, moves, needsVerification: false }, errors: [] }
  } catch {
    return replayTokens(tokenizeMoveList(trimmed), source, metadataFromRawText(trimmed))
  }
}
