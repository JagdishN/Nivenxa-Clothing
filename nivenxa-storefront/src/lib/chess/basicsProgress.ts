// Lesson-completion tracking for Chess Basics — localStorage only, same
// "no real auth" posture as the rest of chess (see analysisOwner.ts). Purely
// a per-browser convenience for the "Completed / In Progress / Start" card
// badges on the Basics list — never read server-side, never synced.

const STORAGE_KEY = 'nivenxa-chess-basics-progress'

export type LessonStatus = 'not-started' | 'in-progress' | 'completed'

type ProgressMap = Record<string, 'started' | 'completed'>

function load(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
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
  if (map[slug]) return
  map[slug] = 'started'
  save(map)
}

/** Called the moment a lesson's own completion state (allDone/gameOver/etc.) is reached. */
export function markLessonCompleted(slug: string): void {
  const map = load()
  map[slug] = 'completed'
  save(map)
}

export function getLessonStatus(slug: string, map: ProgressMap): LessonStatus {
  const entry = map[slug]
  if (entry === 'completed') return 'completed'
  if (entry === 'started') return 'in-progress'
  return 'not-started'
}

export function getAllProgress(): ProgressMap {
  return load()
}
