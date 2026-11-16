import type { TournamentCategoryResult } from '@/lib/chess/types'

/** Parses and validates the results block from the editor; returns an error message or the cleaned list. */
export function parseResults(raw: string): { error: string } | { results: TournamentCategoryResult[] } {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { error: 'The results could not be read. Reload the page and try again.' }
  }
  if (!Array.isArray(data)) return { error: 'The results could not be read.' }
  const results: TournamentCategoryResult[] = []
  for (const [i, c] of (data as Record<string, unknown>[]).entries()) {
    const label = `Category ${i + 1}`
    const category = String(c.category ?? '').trim()
    const totalRounds = Number(c.totalRounds)
    if (!category) return { error: `${label}: enter a category name.` }
    if (!Number.isInteger(totalRounds) || totalRounds < 1) return { error: `${label} (${category}): total rounds must be a whole number of 1 or more.` }
    const rows = Array.isArray(c.standings) ? (c.standings as Record<string, unknown>[]) : []
    if (rows.length === 0) return { error: `${label} (${category}): add at least one player, or remove the category.` }
    const standings = []
    for (const [n, r] of rows.entries()) {
      const name = String(r.name ?? '').trim()
      const points = Number(r.points)
      if (!name) return { error: `${label} (${category}): rank ${n + 1} has no player name.` }
      if (!Number.isFinite(points) || points < 0 || String(r.points) === '') return { error: `${label} (${category}): rank ${n + 1} needs a points value (0 or more).` }
      standings.push({ rank: n + 1, name, points })
    }
    results.push({ category, totalRounds, standings })
  }
  return { results }
}
