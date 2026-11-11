'use client'
import { useSyncExternalStore } from 'react'

/**
 * One shared note that the player's sign-in no longer works (our account routes answered 401 while the page believed it was signed
 * in). It is raised ONCE per signed-in account and cleared when an account request succeeds again or the account changes, so the
 * message never repeats and a stale account's data is never presented as current. It never touches the game.
 */
interface State {
  expired: boolean
  userId: string | null
  dismissed: boolean
}
let state: State = { expired: false, userId: null, dismissed: false }
const listeners = new Set<() => void>()
const set = (next: State) => {
  state = next
  listeners.forEach((l) => l())
}

export function markAccountExpired(userId: string | null) {
  if (state.expired && state.userId === userId) return // already raised for this account: no repeat
  set({ expired: true, userId, dismissed: false })
}
export function clearAccountExpired() {
  if (state.expired || state.dismissed) set({ expired: false, userId: null, dismissed: false })
}
export function dismissAccountExpired() {
  set({ ...state, dismissed: true })
}
export const useAccountExpiry = (): State => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state, () => state)
