import { getOpening } from '@/lib/chess/openings/data'
import { getBasicsLesson } from '@/lib/chess/basics/data'
import { getTactic } from '@/lib/chess/tactics/data'
import type { FeedbackApp } from './types'

const SEPARATOR = ' → ' // "→"

function titleCase(segment: string): string {
  return segment
    .split('-')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

// Resolves a dynamic [slug] segment to its real content name, where a known
// content lookup exists (an opening, a Basics lesson, a tactic) — falls back
// to a prettified version of the slug itself (`italian-game` -> `Italian
// Game`) everywhere else, so every route gets *some* readable label with no
// per-page wiring required.
function resolveChessSlug(parent: string, slug: string): string {
  if (parent === 'openings') return getOpening(slug)?.name ?? titleCase(slug)
  if (parent === 'basics') return getBasicsLesson(slug)?.name ?? titleCase(slug)
  if (parent === 'tactics') return getTactic(slug)?.name ?? titleCase(slug)
  return titleCase(slug)
}

/**
 * Turns a raw pathname into a human-readable "Learn -> Openings -> Italian
 * Game"-style label — no per-page opt-in required, so every screen in both
 * apps gets automatic context today. A future pass can let a specific page
 * override this with something richer (exact move, game id) without
 * changing this fallback's contract.
 */
export function deriveScreenLabel(app: FeedbackApp, pathname: string): { label: string; route: string } {
  const route = pathname || '/'
  const segments = route.split('/').filter(Boolean)

  // Drop the leading app segment ('chess' / 'living') and any Next.js route
  // group segments (e.g. '(dashboard)') — neither carries reader-facing meaning.
  const meaningful = segments.filter((s) => s !== app && !(s.startsWith('(') && s.endsWith(')')))

  if (meaningful.length === 0) {
    return { label: app === 'chess' ? 'Chess Home' : 'Living Home', route }
  }

  const parts: string[] = []
  for (let i = 0; i < meaningful.length; i++) {
    const segment = meaningful[i]
    const parent = meaningful[i - 1]
    const looksLikeSlug = /-/.test(segment) || (parent && ['openings', 'basics', 'tactics'].includes(parent))
    if (app === 'chess' && parent && looksLikeSlug) {
      parts.push(resolveChessSlug(parent, segment))
    } else {
      parts.push(titleCase(segment))
    }
  }

  return { label: parts.join(SEPARATOR), route }
}
