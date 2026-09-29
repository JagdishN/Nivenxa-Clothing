// Lesson-completion tracking for Chess Basics — localStorage only, same
// "no real auth" posture as the rest of chess (see analysisOwner.ts). Purely
// a per-browser convenience for the "Completed / In Progress / Start" card
// badges on the Basics list — never read server-side, never synced.

const STORAGE_KEY = 'nivenxa-chess-basics-progress'

export type LessonStatus = 'not-started' | 'in-progress' | 'completed'

interface ProgressEntry {
  status: 'started' | 'completed'
  /** 1-indexed current step within the lesson, and how many steps it has — only meaningful while status is 'started', so the catalogue can show "Step 3 of 8" instead of a bare "In Progress". */
  step?: number
  total?: number
}

type ProgressMap = Record<string, ProgressEntry>

// Legacy shape (pre step-tracking) stored a plain 'started' | 'completed'
// string per slug — normalized here so an existing visitor's saved progress
// keeps working rather than silently resetting to "not started".
type StoredProgressMap = Record<string, ProgressEntry | 'started' | 'completed'>

function load(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredProgressMap
    const normalized: ProgressMap = {}
    for (const [slug, value] of Object.entries(parsed)) {
      normalized[slug] = typeof value === 'string' ? { status: value } : value
    }
    return normalized
  } catch {
    return {}
  }
}

function save(map: ProgressMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Private browsing / storage disabled — progress just won't persist.
  }
}

/** Called once when a lesson's detail page mounts. Never downgrades a completed lesson back to "started". */
export function markLessonStarted(slug: string): void {
  const map = load()
  if (map[slug]?.status) return
  map[slug] = { status: 'started' }
  save(map)
}

/** Called the moment a lesson's own completion state (allDone/gameOver/etc.) is reached. */
export function markLessonCompleted(slug: string): void {
  const map = load()
  map[slug] = { status: 'completed' }
  save(map)
}

/** Called on every step change while a lesson is in progress — feeds the catalogue's "Step N of M" card copy. A no-op once the lesson is already completed, so a "Practice again" replay doesn't downgrade a completed badge back to in-progress. */
export function updateLessonStep(slug: string, step: number, total: number): void {
  const map = load()
  if (map[slug]?.status === 'completed') return
  map[slug] = { status: 'started', step, total }
  save(map)
}

export function getLessonStatus(slug: string, map: ProgressMap): LessonStatus {
  const entry = map[slug]
  if (entry?.status === 'completed') return 'completed'
  if (entry?.status === 'started') return 'in-progress'
  return 'not-started'
}

/** The last-seen step position for an in-progress lesson, or null when there isn't one yet (just started, or completed/not-started). */
export function getLessonStepProgress(slug: string, map: ProgressMap): { step: number; total: number } | null {
  const entry = map[slug]
  if (entry?.status === 'started' && entry.step && entry.total) return { step: entry.step, total: entry.total }
  return null
}

export function getAllProgress(): ProgressMap {
  return load()
}
