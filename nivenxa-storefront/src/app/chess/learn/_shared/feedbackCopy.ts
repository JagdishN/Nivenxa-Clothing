import { isLegalDestination } from './moveTrainerLogic'

/**
 * Shared by BoardLesson.tsx and PieceLesson.tsx so every lesson's hint
 * escalation and wrong-attempt framing sounds the same, rather than each
 * engine inventing its own copy independently. Also the one place a future
 * voice pass would read from for TTS (it would just speak whatever text
 * this module already produces for the visible panel) — built as one clean
 * source now specifically so that later pass doesn't need to duplicate or
 * re-derive this logic.
 */

/** 4 tiers: 0 = the question itself, 1 = a nudge, 2 = reveal the target, 3 = a full demonstration. */
export const HINT_TIER_COUNT = 4

export function hintTierFor(wrongAttempts: number): number {
  return Math.min(wrongAttempts, HINT_TIER_COUNT - 1)
}

export type WrongKind = 'illegal' | 'legalWrongGoal'

/**
 * Only meaningful where "wrong" means "an actual chess move was attempted"
 * (PieceLesson's `try`/`judgment` steps) — BoardLesson's squareQuiz is
 * "find a square," which has no legal/illegal-move axis at all, so it never
 * calls this.
 */
export function classifyWrongAttempt(fen: string, pieceSquare: string, attemptedSquare: string): WrongKind {
  return isLegalDestination(fen, pieceSquare, attemptedSquare) ? 'legalWrongGoal' : 'illegal'
}

/**
 * A short clause prefixed onto the step's own authored `wrongText`, so
 * every existing step's copy is reused as-is (no per-step rewrite needed)
 * while still telling the two kinds of "wrong" apart, per the user's own
 * example table ("Not quite. The rook moves straight..." vs. "That move is
 * allowed, this time try to capture the highlighted piece...").
 */
export function wrongKindPrefix(kind: WrongKind): string {
  return kind === 'illegal' ? 'Not quite.' : 'That move is legal! This time, though —'
}

/** Tier-1 nudge line — shown before any reveal, once but not twice. */
export function nudgeLine(wrongText: string): string {
  return wrongText
}

/** Tier-3 framing — the "let's look together" opening before a full demonstration. */
export const DEMONSTRATION_INTRO = "Let's look together. I'll show you now."

/** Generic tier-3 fallback for a try step with no authored demonstration copy of its own. */
export function demonstrationFallbackText(pieceSquare: string, correctSquare: string): string {
  return `Here's how it's done: move from ${pieceSquare} to ${correctSquare}.`
}
