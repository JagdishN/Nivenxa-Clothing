import { Chess } from 'chess.js'
import type { ExplanationMode, SkillTier } from './skillTiers'
import type { MoveAnalysisEntry } from './types'

/**
 * Pure rules for when the opponent avatar may react. The avatar only READS grades the game already produces
 * (useMoveAnalysis `entries`); it never starts analysis of its own. See docs/chess-avatar-reaction-analysis-plan.md.
 */

/** Provisional length of a brief reaction pose (the caption outlives it). */
export const BRIEF_REACTION_MS = 1500

export type AvatarState = 'idle' | 'selected' | 'thinking' | 'encourage' | 'concern' | 'ackwin' | 'ackdraw'
export type GameOutcome = 'player-win' | 'engine-win' | 'draw' | 'player-resigned'

/** evaluationToCp's mate sentinel (±100000). */
export const MATE_RANGE_CP = 100000
/** Still clearly winning after the move / already lost before it: not worth a live reaction. */
export const WINNING_AFTER_CP = 600
export const LOST_BEFORE_CP = -600

/**
 * Live reactions reveal that a move was poor, so they follow the player's coaching setting:
 * Beginner always coaches live; Intermediate only when live coaching is on (not in Rapid, which defers to post-game);
 * Expert and Master never get live reactions (their live dashboards/summary-only modes keep evaluation out of the face).
 */
export function liveReactionsAllowed(tier: SkillTier, mode: ExplanationMode): boolean {
  if (tier === 'beginner') return true
  if (tier === 'intermediate') return mode === 'live'
  return false
}

export type SkipReason = 'not-player-move' | 'not-graded' | 'not-a-mistake' | 'no-best-move' | 'mate-range' | 'forced-move' | 'already-lost' | 'still-winning'
export interface Candidate {
  react: boolean
  severity?: 'mistake' | 'blunder'
  skip?: SkipReason
}

/** Decides from an ALREADY-FINAL graded entry. cpLoss/evals are mover-relative by construction (see useMoveAnalysis.runGradedAnalysis). */
export function reactionCandidate(entry: MoveAnalysisEntry, humanColor: 'w' | 'b'): Candidate {
  if (entry.color !== humanColor) return { react: false, skip: 'not-player-move' }
  if (entry.kind !== 'quality') return { react: false, skip: 'not-graded' }
  if (entry.classification !== 'mistake' && entry.classification !== 'blunder') return { react: false, skip: 'not-a-mistake' }
  if (!entry.bestMoveUci) return { react: false, skip: 'no-best-move' }
  if (Math.abs(entry.evalBeforeCp) >= MATE_RANGE_CP || Math.abs(entry.evalAfterCp) >= MATE_RANGE_CP) return { react: false, skip: 'mate-range' }
  try {
    if (new Chess(entry.fenBefore).moves().length <= 1) return { react: false, skip: 'forced-move' }
  } catch {
    return { react: false, skip: 'not-graded' }
  }
  if (entry.evalBeforeCp <= LOST_BEFORE_CP) return { react: false, skip: 'already-lost' }
  if (entry.evalAfterCp >= WINNING_AFTER_CP) return { react: false, skip: 'still-winning' }
  return { react: true, severity: entry.classification }
}

/** A graded result is only worth showing if it still describes the move the player just made (or the one before). */
export function isFresh(entry: { ply: number; san: string }, history: readonly string[]): boolean {
  const p = entry.ply
  if (p < 0 || p >= history.length) return false // undone / not played in this game
  if (history.length - p > 2) return false // the game has moved on
  return history[p] === entry.san // same move at that ply (not a different move after undo)
}

/** Board, side to move, castling and en passant: the part of a FEN that identifies a position (move counters are ignored). */
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

/**
 * A reaction caption ("That leaves your bishop on d6 unprotected") describes ONE position. It may only be shown while that position
 * is still on the board; once any move is played it is stale and must go (the explanation stays with its move in the history).
 * A caption with no position (the greeting) is valid until the first move.
 */
export function captionStillValid(captionFen: string | null, currentFen: string, plyAtCaption: number, currentPly: number): boolean {
  if (currentPly !== plyAtCaption) return false
  return captionFen === null || positionKey(captionFen) === positionKey(currentFen)
}

export interface ReactionContext {
  humanColor: 'w' | 'b'
  history: readonly string[]
  tier: SkillTier
  mode: ExplanationMode
  complete: boolean
}

/**
 * Remembers which plies were already considered, so one event reacts at most once, results arriving after
 * undo/restart are ignored, and an undone-then-replayed ply is treated as a new event.
 */
export function createReactionTracker() {
  let handled = new Set<number>()
  let lastLen = 0
  return {
    startGame() {
      handled = new Set()
      lastLen = 0
    },
    /** Call whenever the move list length changes. Returns true if the game went backwards (undo). */
    onHistory(len: number): boolean {
      const shrank = len < lastLen
      if (shrank) for (const p of [...handled]) if (p >= len) handled.delete(p)
      lastLen = len
      return shrank
    },
    /** Returns what to react to (severity + the graded entry), or null. Marks every graded player entry it sees as handled (reacted or not). */
    consider(entries: readonly MoveAnalysisEntry[], ctx: ReactionContext): { severity: 'mistake' | 'blunder'; entry: MoveAnalysisEntry } | null {
      let result: { severity: 'mistake' | 'blunder'; entry: MoveAnalysisEntry } | null = null
      for (const e of entries) {
        if (e.color !== ctx.humanColor || handled.has(e.ply)) continue
        // A stale result (undone, restarted, game moved on) is ignored WITHOUT consuming the ply, so a later replay is a new event.
        if (!isFresh(e, ctx.history)) continue
        handled.add(e.ply)
        if (ctx.complete || !liveReactionsAllowed(ctx.tier, ctx.mode)) continue
        const c = reactionCandidate(e, ctx.humanColor)
        if (c.react && c.severity) result = { severity: c.severity, entry: e }
      }
      return result
    },
    handledCount: () => handled.size,
  }
}

/** True when the latest move in a standard-start move list was made by the human (so feedback about the previous move is now out of date). */
export function playerJustMoved(historyLength: number, humanColor: 'w' | 'b'): boolean {
  if (historyLength <= 0) return false
  const mover: 'w' | 'b' = (historyLength - 1) % 2 === 0 ? 'w' : 'b'
  return mover === humanColor
}

export function resultState(outcome: GameOutcome): AvatarState {
  if (outcome === 'player-win') return 'ackwin'
  if (outcome === 'draw') return 'ackdraw'
  return 'encourage' // you lost or resigned: warm encouragement, never a victory pose
}

export const AVATAR_NAME = 'TIVVI' // working name, not final
export const AVATAR_ROLE = 'Friendly partner'

/** What the avatar shows. Priority: game result > a feedback reaction > real engine activity > idle. The greeting never hides real thinking. */
export function resolveAvatarState(input: { resultPose: AvatarState | null; reaction: AvatarState | null; engineThinking: boolean }): AvatarState {
  const live = input.reaction === 'selected' && input.engineThinking ? null : input.reaction
  return input.resultPose ?? live ?? (input.engineThinking ? 'thinking' : 'idle')
}

/** "Guided play" = live explanations; the other two say honestly what the player does NOT get during the game. */
export function assistanceLabel(mode: ExplanationMode): string {
  if (mode === 'live') return 'Guided play'
  if (mode === 'post-game') return 'Review after the game'
  return 'No assistance'
}

/** Neutral wording used when no specific reason can be verified. Never mocks, never celebrates. */
export const NEUTRAL_CONCERN = `${AVATAR_NAME}: let's take another look at that move.`

/** Caption for a reaction state. `name` is the selected character (default: Tivvi). */
export function captionFor(state: AvatarState, reason?: string | null, name: string = AVATAR_NAME): string {
  const AVATAR_NAME = name
  switch (state) {
    case 'selected':
      return `${AVATAR_NAME} says hello.`
    case 'thinking':
      return `${AVATAR_NAME} is thinking…`
    case 'concern':
      return reason ? `${AVATAR_NAME}: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : `${AVATAR_NAME}: let's take another look at that move.`
    case 'ackwin':
      return `${AVATAR_NAME}: well played!`
    case 'ackdraw':
      return `${AVATAR_NAME}: a fair game.`
    case 'encourage':
      return `${AVATAR_NAME}: good effort. Want to review it together?`
    default:
      return ''
  }
}
