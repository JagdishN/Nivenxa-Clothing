// Pure puzzle rules — no React, no database — so every claim the solver makes
// to a learner (this move is correct, that one fails because…, here is why it
// is mate) is computed from the actual position with chess.js and can be unit
// tested. Nothing here invents an explanation: when a reliable statement
// can't be derived from the position, the helpers return a constrained,
// honest one instead.
import { Chess, type Move, type Square } from 'chess.js'

export interface UciMove {
  from: string
  to: string
  promotion?: string
}

export function parseUci(uci: string): UciMove {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const COLOR_NAME = { w: 'White', b: 'Black' } as const

export const pieceName = (type: string) => PIECE_NAME[type] ?? 'piece'
export const colorName = (c: 'w' | 'b') => COLOR_NAME[c]

/** N for a `mateInN` theme (1–5), or null for a puzzle that isn't labelled as a forced mate. */
export function mateLength(themes: string[]): number | null {
  for (let n = 1; n <= 5; n++) if (themes.includes(`mateIn${n}`)) return n
  return null
}

function tryMove(game: Chess, m: UciMove): Move | null {
  try {
    return game.move({ from: m.from, to: m.to, promotion: m.promotion ?? 'q' })
  } catch {
    return null
  }
}

/**
 * True when, from this position with the DEFENDER to move, the other side
 * forces checkmate within `n` of its own moves against every defence.
 * Exhaustive search; callers keep n small (≤1 at a decision point).
 */
export function forcedMate(fen: string, n: number): boolean {
  const g = new Chess(fen)
  if (g.isCheckmate()) return true
  if (n <= 0) return false
  const replies = g.moves({ verbose: true })
  if (replies.length === 0) return false // stalemate — not mate
  for (const reply of replies) {
    const g2 = new Chess(fen)
    g2.move(reply)
    let found = false
    for (const mv of g2.moves({ verbose: true })) {
      const g3 = new Chess(g2.fen())
      g3.move(mv)
      if (g3.isCheckmate() || (n > 1 && forcedMate(g3.fen(), n - 1))) {
        found = true
        break
      }
    }
    if (!found) return false
  }
  return true
}

export type MoveVerdict =
  | { kind: 'correct' }
  /** Not the stored move, but it satisfies the puzzle's stated objective (a different forced mate). */
  | { kind: 'alternative'; san: string }
  | { kind: 'wrong' }
  | { kind: 'illegal' }

/**
 * Judge one attempted move. The stored solution move is always accepted. For a
 * puzzle labelled as a forced mate, any other move that also delivers a forced
 * mate in the remaining number of moves is accepted too — a mate-in-one with
 * two mating moves must not call the second one wrong. Searching alternatives
 * is bounded: with more than one mating move still to come after this one we
 * only accept the stored move (exhaustive search there is too slow), and the
 * limitation is documented in docs/chess-puzzle-audit.md.
 *
 * `mateMovesLeft` = how many of the solver's own moves remain, including this one (null if not a mate puzzle).
 */
export function judgeMove(fen: string, expected: UciMove, attempt: UciMove, mateMovesLeft: number | null): MoveVerdict {
  const game = new Chess(fen)
  const played = tryMove(game, attempt)
  if (!played) return { kind: 'illegal' }
  if (expected.from === attempt.from && expected.to === attempt.to) return { kind: 'correct' }
  if (mateMovesLeft !== null && mateMovesLeft <= 2 && forcedMate(game.fen(), mateMovesLeft - 1)) {
    return { kind: 'alternative', san: played.san }
  }
  return { kind: 'wrong' }
}

/** Plain-language reason a legal-but-unsuccessful move fails, built only from facts verified on the board. */
export function explainWrongMove(fen: string, attempt: UciMove, mating: boolean): string {
  const game = new Chess(fen)
  const mover = game.turn()
  const played = tryMove(game, attempt)
  if (!played) return "That move isn't legal in this position."
  const replies = game.moves({ verbose: true })
  const who = colorName(game.turn())
  if (mating) {
    if (game.isCheckmate()) return 'That is checkmate.' // callers should have judged this correct; kept honest if reached
    if (game.isStalemate()) return 'That leaves the king with no legal move but not in check — it is stalemate, not mate.'
    if (game.isCheck()) {
      const answer = pickDefence(replies)
      return answer
        ? `That is check, but it is not mate: ${who} can reply ${answer.san}.`
        : 'That is check, but it is not mate.'
    }
    return `That does not give check, so ${who} is not forced to respond to a threat to the king.`
  }
  // A tactical puzzle: the one verifiable punishment is losing the moved piece for nothing.
  const recapture = replies.find((r) => r.to === played.to && r.captured)
  if (recapture) {
    return `Not that one — your ${pieceName(played.piece)} can simply be captured: ${who} replies ${recapture.san}.`
  }
  void mover
  return 'That move is legal, but it is not the tactic this puzzle is about.'
}

function pickDefence(replies: Move[]): Move | undefined {
  return replies.find((r) => r.piece === 'k') ?? replies.find((r) => r.captured) ?? replies[0]
}

export interface HintSet {
  /** Tier 1 — the idea, with no piece named. */
  idea: string
  /** Tier 2 — which piece to look at. */
  piece: string
  /** Tier 3 — the move itself, in words. */
  move: string
  /** Square of the piece to highlight at tier 2+. */
  from: string
  /** Destination square, highlighted at tier 3. */
  to: string
}

/**
 * Three escalating hints derived from the stored solution move in THIS
 * position. The idea tier uses only things the board proves (is the key move
 * a check, a capture, a promotion, quiet) plus the puzzle's mate length; a
 * generic theme sentence is added only as supplementary context.
 */
export function buildHints(fen: string, expected: UciMove, themes: string[], themeIdea?: string): HintSet | null {
  const game = new Chess(fen)
  const move = tryMove(game, expected)
  if (!move) return null
  const n = mateLength(themes)
  const name = pieceName(move.piece)
  const isCheck = move.san.includes('+') || move.san.includes('#')
  const isMate = move.san.includes('#')

  let idea: string
  if (n === 1) idea = 'There is a checkmate in one move. Look for a check the king cannot get out of.'
  else if (n !== null) idea = `This is a mate in ${n}. Start by looking for a forcing move — usually a check — that keeps the king under pressure.`
  else if (move.promotion) idea = 'The key move is a pawn promotion.'
  else if (move.captured) idea = 'The key move is a capture. Ask which enemy piece is loose or poorly defended.'
  else if (isCheck) idea = 'The key move gives check.'
  else idea = 'The key move is a quiet one — it does not capture or give check. Think about what it sets up for the next move.'
  if (themeIdea && n === null) idea += ` ${themeIdea}`
  void isMate

  return {
    idea,
    piece: `Look at your ${name} on ${move.from}.`,
    move: `Play the ${name} from ${move.from} to ${move.to} (${move.san}).`,
    from: move.from,
    to: move.to,
  }
}

export interface SolutionExplanation {
  /** Short paragraphs, in reading order. */
  lines: string[]
  /** For a mate-in-two: every defence after the first move and the mating reply (verified), capped. */
  defences: { reply: string; mate: string }[]
  /** SAN of the full line, e.g. "1. Qh5+ Kg8 2. Qxh7#". */
  line: string
}

/** The material the solver wins/loses along the solution line, from real captures. */
function materialAlongLine(startFen: string, moves: UciMove[], solver: 'w' | 'b'): number {
  const g = new Chess(startFen)
  let balance = 0
  for (const m of moves) {
    const mv = tryMove(g, m)
    if (!mv) break
    if (mv.captured) balance += (mv.color === solver ? 1 : -1) * PIECE_VALUE[mv.captured]
    if (mv.promotion) balance += (mv.color === solver ? 1 : -1) * (PIECE_VALUE[mv.promotion] - 1)
  }
  return balance
}

const NEIGHBOUR_OFFSETS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
]

/** Why the king in a checkmated position has nowhere to go, from the actual board. */
export function mateAnatomy(matedFen: string): string[] {
  const g = new Chess(matedFen)
  if (!g.isCheckmate()) return []
  const defender = g.turn()
  const attacker = defender === 'w' ? 'b' : 'w'
  const board = g.board()
  let kingSq: Square | null = null
  for (const row of board) for (const sq of row) if (sq && sq.type === 'k' && sq.color === defender) kingSq = sq.square
  if (!kingSq) return []

  const checkers = g.attackers(kingSq, attacker)
  const lines: string[] = []
  const checkerDesc = checkers.map((s) => `${pieceName(g.get(s)?.type ?? '')} on ${s}`)
  lines.push(
    checkers.length > 1
      ? `It is a double check (${checkerDesc.join(' and ')}), so the only way out would be a king move.`
      : `The ${checkerDesc[0]} gives check.`
  )

  const file = kingSq.charCodeAt(0) - 97
  const rank = Number(kingSq[1])
  const blocked: string[] = []
  const covered: string[] = []
  const online: string[] = []
  for (const [df, dr] of NEIGHBOUR_OFFSETS) {
    const f = file + df
    const r = rank + dr
    if (f < 0 || f > 7 || r < 1 || r > 8) continue
    const sq = (String.fromCharCode(97 + f) + r) as Square
    const occupant = g.get(sq)
    if (occupant && occupant.color === defender) {
      blocked.push(`${sq} (its own ${pieceName(occupant.type)})`)
    } else if (g.isAttacked(sq, attacker)) {
      covered.push(occupant ? `${sq} (the ${pieceName(occupant.type)} there is protected)` : sq)
    } else {
      online.push(sq)
    }
  }
  if (blocked.length) lines.push(`The king cannot step to ${blocked.join(', ')} — its own pieces are in the way.`)
  if (covered.length) lines.push(`The king cannot go to ${covered.join(', ')}: ${covered.length === 1 ? 'that square is' : 'those squares are'} attacked.`)
  if (online.length) lines.push(`${online.join(', ')} ${online.length === 1 ? 'is' : 'are'} still on the line of the check, so the king cannot slide away along it.`)
  lines.push(checkers.length > 1 ? 'No move can answer both checks.' : 'No piece can capture the checking piece or block the check.')
  return lines
}

/** Enemy pieces (most valuable first) that the piece on `square` attacks right now — read from the board, regardless of whose turn it is. */
function enemyPiecesAttackedFrom(fen: string, square: string, solver: 'w' | 'b'): { type: string; square: string }[] {
  const g = new Chess(fen)
  const found: { type: string; square: string }[] = []
  for (const row of g.board()) {
    for (const sq of row) {
      if (!sq || sq.color === solver) continue
      if (g.attackers(sq.square, solver).includes(square as Square)) found.push({ type: sq.type, square: sq.square })
    }
  }
  const value = (t: string) => (t === 'k' ? 100 : PIECE_VALUE[t] ?? 0)
  return found.sort((a, b) => value(b.type) - value(a.type))
}

/**
 * The explanation shown after a solve or after Show solution. `startFen` is
 * the position the solver faces; `solution` the stored line from there (the
 * solver's move first, then alternating).
 */
export function explainSolution(startFen: string, solution: UciMove[], themes: string[], themeLabel: string): SolutionExplanation {
  const g = new Chess(startFen)
  const solver = g.turn()
  const sans: string[] = []
  let moveNo = 1
  let line = ''
  for (let i = 0; i < solution.length; i++) {
    const mv = tryMove(g, solution[i])
    if (!mv) break
    sans.push(mv.san)
    if (mv.color === 'w') line += `${moveNo}. ${mv.san} `
    else line += `${i === 0 ? `${moveNo}... ` : ''}${mv.san} `
    if (mv.color === 'b') moveNo++
  }
  line = line.trim()

  const lines: string[] = []
  const defences: { reply: string; mate: string }[] = []
  const n = mateLength(themes)

  if (g.isCheckmate()) {
    lines.push(sans.length === 1 ? `${sans[0]} is checkmate.` : `The line ends with ${sans[sans.length - 1]}, checkmate.`)
    lines.push(...mateAnatomy(g.fen()))
    if (n === 2 && solution.length >= 3) {
      const first = new Chess(startFen)
      tryMove(first, solution[0])
      const after = first.fen()
      if (forcedMate(after, 1)) {
        lines.push(`${sans[0]} is the key: every reply by ${colorName(first.turn())} still allows mate on the next move.`)
        for (const reply of first.moves({ verbose: true }).slice(0, 8)) {
          const t = new Chess(after)
          t.move(reply)
          const mate = t.moves({ verbose: true }).find((m) => {
            const u = new Chess(t.fen())
            u.move(m)
            return u.isCheckmate()
          })
          if (mate) defences.push({ reply: reply.san, mate: `${mate.san}#` })
        }
      }
    }
  } else {
    lines.push(`The winning line is ${line}.`)
    if (themes.includes('fork')) {
      const first = new Chess(startFen)
      const forkMove = tryMove(first, solution[0])
      if (forkMove) {
        const targets = enemyPiecesAttackedFrom(first.fen(), forkMove.to, solver)
        if (targets.length >= 2) {
          const [a, b] = targets
          lines.push(`Your ${pieceName(forkMove.piece)} on ${forkMove.to} attacks the ${pieceName(a.type)} on ${a.square} and the ${pieceName(b.type)} on ${b.square} at the same time.`)
        }
      }
    }
    const gain = materialAlongLine(startFen, solution, solver)
    if (gain > 0) lines.push(`Along this line ${colorName(solver)} comes out ahead by ${gain} point${gain === 1 ? '' : 's'} of material.`)
    else if (gain === 0) lines.push(`Material stays level along this line — the gain here is positional (${themeLabel.toLowerCase()}), not a capture.`)
  }
  return { lines, defences, line }
}

/** FENs after each ply of `solution` from `startFen` — frame 0 is the start; used for step-through replay. */
export function solutionFrames(startFen: string, solution: UciMove[]): { fen: string; from: string; to: string }[] {
  const g = new Chess(startFen)
  const frames: { fen: string; from: string; to: string }[] = []
  for (const m of solution) {
    const mv = tryMove(g, m)
    if (!mv) break
    frames.push({ fen: g.fen(), from: mv.from, to: mv.to })
  }
  return frames
}

/** "White to move — checkmate in one move." — specific wherever the puzzle's labels allow, theme-based otherwise. */
export function objectiveText(themes: string[], theme: string, side: 'w' | 'b', fallback: string): string {
  const n = mateLength(themes)
  const who = colorName(side)
  if (n === 1) return `${who} to move — checkmate in one move.`
  if (n !== null) return `${who} to move — checkmate in ${n} moves.`
  return `${who} to move — ${fallback.charAt(0).toLowerCase()}${fallback.slice(1)}`
}

/**
 * A puzzle can carry several tags. When the objective is a mate (from its mateInN tag) but it is listed under a different
 * topic, say so plainly instead of leaving "checkmate" under a "Hanging Pieces" heading unexplained. Null when the topic
 * itself is the mate, or the puzzle has no mate tag (the topic's own objective applies).
 */
export function topicRelation(themes: string[], theme: string, themeLabel: string): string | null {
  const n = mateLength(themes)
  if (n === null || theme === `mateIn${n}` || /^mateIn\d$/.test(theme) || !themes.includes(theme)) return null
  return `Tagged ${themeLabel} and Mate in ${n}. The goal is the checkmate; ${themeLabel} is the other idea in this position.`
}

// ─── Attempt outcome ──────────────────────────────────────────────────────

export type PuzzleOutcome = 'solved' | 'solved_with_hint' | 'solution_viewed' | 'skipped'

export interface AttemptFacts {
  solved: boolean
  hintsUsed: number
  solutionViewed: boolean
  skipped: boolean
}

/**
 * One result per attempt. Seeing the solution always wins over a later
 * solve (a revealed puzzle is never an independent solve); a hinted solve is
 * a solve but kept distinct from an unaided one.
 */
export function classifyOutcome(f: AttemptFacts): PuzzleOutcome | null {
  if (f.solutionViewed) return 'solution_viewed'
  if (f.solved) return f.hintsUsed > 0 ? 'solved_with_hint' : 'solved'
  if (f.skipped) return 'skipped'
  return null
}

/** The legacy boolean column: true for any genuine solve by the player; never for a revealed solution. */
export const outcomeCountsAsSolved = (o: PuzzleOutcome) => o === 'solved' || o === 'solved_with_hint'
