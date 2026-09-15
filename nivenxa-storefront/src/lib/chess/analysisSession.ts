import type { NormalizedGame } from './analysisTypes'

// Handoff between Analysis's routes, all client-side — nothing here is
// persisted to Supabase (that's analysisActions.ts, for the deliberate "Save
// this game" action). sessionStorage rather than localStorage: this is a
// short-lived, single-flow handoff, not something that should survive
// between unrelated visits or leak across tabs analyzing different games.
const PENDING_KEY = 'nivenxa-analysis-pending-game'
const ACTIVE_KEY = 'nivenxa-analysis-active-game'

export type PlayerStartMode = 'watch' | 'analyze'

interface ActiveGamePayload {
  game: NormalizedGame
  mode: PlayerStartMode
}

/** Written by every reconstruction producer (Paste/PGN/Manual/OCR) before routing to Verify. */
export function setPendingGame(game: NormalizedGame): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(game))
}

/** Read by Verify Game on mount. Not cleared here — Verify clears it itself once resolved. */
export function getPendingGame(): NormalizedGame | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as NormalizedGame) : null
  } catch {
    return null
  }
}

export function clearPendingGame(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_KEY)
}

/**
 * Written once a game is confirmed (Verify Game's exits, or Play's "Analyze
 * My Game" which skips Verify entirely since a live chess.js game can never
 * produce an uncertain move). `mode` tells the Player whether to open in
 * Watch-Full-Game or Start-Analysis autoplay state.
 */
export function setActiveGame(game: NormalizedGame, mode: PlayerStartMode): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ game, mode } satisfies ActiveGamePayload))
  clearPendingGame()
}

/** Read by the Player on mount when no `?gameId=` (My Games reopen) is present. */
export function getActiveGame(): ActiveGamePayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ACTIVE_KEY)
    return raw ? (JSON.parse(raw) as ActiveGamePayload) : null
  } catch {
    return null
  }
}

export function clearActiveGame(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ACTIVE_KEY)
}
