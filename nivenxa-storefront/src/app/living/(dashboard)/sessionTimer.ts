// Marks when the current browser session started, in localStorage (survives
// page navigation and refresh within the same browser, cleared on sign-out
// so the next login starts a fresh 30 minutes) — read/written by
// SessionTimeout.tsx and AppNav.tsx's manual sign-out form.
const SESSION_STORAGE_KEY = 'living_session_started_at'
export const SESSION_DURATION_MS = 30 * 60 * 1000

export function getSessionStart(): number {
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (stored) return Number(stored)
    const now = Date.now()
    window.localStorage.setItem(SESSION_STORAGE_KEY, String(now))
    return now
  } catch {
    // Private browsing / storage disabled — fall back to "just started now",
    // which just means this one tab gets a fresh 30 minutes rather than
    // sharing the clock with other tabs.
    return Date.now()
  }
}

export function clearSessionStart(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Nothing to clear if storage was never writable.
  }
}
