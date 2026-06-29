// ─── Contextual back-navigation source ────────────────────────────────────────
// Tracks the page a user navigated FROM, so product pages can show a
// "← {label}" back link pointing at it. Resets when the tab closes —
// a returning visitor in a new session has no prior navigation context.

const NAV_SOURCE_KEY = 'nivenxa_nav_source'

// Archived products stay reachable by direct URL but must never appear as a
// back-link destination. Update this list whenever another product is archived.
const ARCHIVED_PATH_FRAGMENTS = ['women-lounge-sets', 'co-ord-set']

export interface NavSource {
  label: string
  path: string
}

export function writeNavSource(label: string, path: string): void {
  try {
    sessionStorage.setItem(NAV_SOURCE_KEY, JSON.stringify({ label, path }))
  } catch {
    // sessionStorage unavailable — back link simply won't show
  }
}

export function readNavSource(): NavSource | null {
  try {
    const raw = sessionStorage.getItem(NAV_SOURCE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' || parsed === null ||
      typeof (parsed as NavSource).label !== 'string' ||
      typeof (parsed as NavSource).path !== 'string'
    ) {
      return null
    }
    const source = parsed as NavSource
    if (ARCHIVED_PATH_FRAGMENTS.some(fragment => source.path.includes(fragment))) {
      return null
    }
    return source
  } catch {
    return null
  }
}
