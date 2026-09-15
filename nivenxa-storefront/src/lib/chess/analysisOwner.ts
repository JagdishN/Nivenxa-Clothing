// Chess has no login anywhere (puzzle_attempts.user_id is nullable for the
// same reason — see supabase/schema.sql). "My Games" needs *some* way to
// know which saved games are "yours" without a real account system, so we
// generate a random id once per browser and stash it in localStorage,
// mirroring the same pattern play/page.tsx already uses for its own setup
// preferences (SETUP_STORAGE_KEY). Games are private to this id/browser —
// clearing site data starts a fresh, empty "My Games".
const OWNER_STORAGE_KEY = 'nivenxa-chess-analysis-owner'

function generateOwnerId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for older browsers without crypto.randomUUID — collision odds
  // are irrelevant here, this only needs to be stable per-browser, not
  // globally unique against an adversary.
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getOrCreateAnalysisOwnerId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = localStorage.getItem(OWNER_STORAGE_KEY)
    if (existing) return existing
    const id = generateOwnerId()
    localStorage.setItem(OWNER_STORAGE_KEY, id)
    return id
  } catch {
    // Storage disabled/private browsing — fall back to a per-call id. My
    // Games simply won't persist across reloads in that case.
    return generateOwnerId()
  }
}
