import { INTRO_GAMES } from './botRoster'

/**
 * Beginner coach introduction: three COMPLETED games with the coach. Wins are not required. A game is identified by its local id,
 * so counting it twice (a retry, a double save, a guest game merged after sign-in) never adds a second count.
 */

/** Resignation or an agreed draw only counts after this many of the player's own moves, so ending at once is no shortcut. */
export const MIN_PLAYER_MOVES_TO_END_EARLY = 10

export type EndKind = 'checkmate' | 'stalemate' | 'draw-rule' | 'resigned' | 'draw-agreed'

export function countsAsIntroGame(g: { endKind: EndKind; playerMoves: number }): boolean {
  if (g.endKind === 'checkmate' || g.endKind === 'stalemate' || g.endKind === 'draw-rule') return true
  return g.playerMoves >= MIN_PLAYER_MOVES_TO_END_EARLY
}

const ID = /^[0-9a-f-]{16,64}$/i
const MAX_IDS = 50

export const cleanIds = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) if (typeof x === 'string' && ID.test(x) && !out.includes(x)) out.push(x)
  return out.slice(0, MAX_IDS)
}

/** Union without duplicates: merging can only ever raise the count. */
export const mergeIds = (a: readonly string[], b: readonly string[]): string[] => cleanIds([...a, ...b])

export const introCount = (ids: readonly string[]): number => Math.min(ids.length, INTRO_GAMES)

export const GUEST_INTRO_KEY = 'nivenxa.chess.coachIntro.v1'

export function loadGuestIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return cleanIds(JSON.parse(localStorage.getItem(GUEST_INTRO_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function saveGuestIds(ids: readonly string[]) {
  try {
    if (ids.length === 0) localStorage.removeItem(GUEST_INTRO_KEY)
    else localStorage.setItem(GUEST_INTRO_KEY, JSON.stringify(cleanIds(ids)))
  } catch {
    // storage unavailable: progress then lasts for this visit only
  }
}
