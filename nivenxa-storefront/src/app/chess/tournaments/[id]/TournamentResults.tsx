'use client'

import { useMemo, useState } from 'react'
import type { TournamentCategoryResult } from '@/lib/chess/types'
import { ordinal, parseCategoryLabel } from '@/lib/chess/tournamentFormat'
import styles from '../Tournaments.module.scss'

// Roughly a table row's rendered height — used only to reserve enough
// vertical space for the longest category's standings (see maxStandings
// below), so switching to a shorter list (e.g. a 1-entry Girls category)
// doesn't visibly shrink the page and shift whatever sits below it.
const ROW_HEIGHT_REM = 2.6

/**
 * A tournament can carry several age groups, each with an Open and/or Girls
 * subdivision — flattening all of them into one row of pills wrapped
 * awkwardly once there were seven. This splits the control into two levels:
 * pick the age group first, then the subdivision available within it.
 */
export default function TournamentResults({ results }: { results: TournamentCategoryResult[] }) {
  const ageGroups = useMemo(() => {
    const seen = new Set<string>()
    const groups: string[] = []
    for (const result of results) {
      const { ageGroup } = parseCategoryLabel(result.category)
      if (!seen.has(ageGroup)) {
        seen.add(ageGroup)
        groups.push(ageGroup)
      }
    }
    return groups
  }, [results])

  const [selectedAge, setSelectedAge] = useState(ageGroups[0])

  const subdivisionsForAge = useMemo(
    () => results.filter((r) => parseCategoryLabel(r.category).ageGroup === selectedAge).map((r) => parseCategoryLabel(r.category).subdivision),
    [results, selectedAge]
  )
  const [selectedSubdivision, setSelectedSubdivision] = useState(subdivisionsForAge[0])

  function handleSelectAge(age: string) {
    setSelectedAge(age)
    const available = results.filter((r) => parseCategoryLabel(r.category).ageGroup === age).map((r) => parseCategoryLabel(r.category).subdivision)
    // Prefer staying on the same subdivision (Open -> Open) when the new age
    // group has it; otherwise fall back to Open, then whatever it does have.
    if (available.includes(selectedSubdivision)) return
    setSelectedSubdivision(available.includes('Open') ? 'Open' : available[0])
  }

  const active = results.find((r) => {
    const parsed = parseCategoryLabel(r.category)
    return parsed.ageGroup === selectedAge && parsed.subdivision === selectedSubdivision
  })

  // Reserves space for the longest list across every category (not just the
  // one currently shown) so the page's height stays constant as the admin
  // flips between a 5-entry Open category and a 1-entry Girls one.
  const maxStandings = Math.max(...results.map((r) => r.standings.length))

  if (!active) return null

  return (
    <div className={styles.detailSection}>
      <h2 className={styles.detailSectionTitle}>Results</h2>

      <div className={styles.resultsTabs} role="tablist" aria-label="Age group">
        {ageGroups.map((age) => (
          <button
            key={age}
            type="button"
            role="tab"
            aria-selected={age === selectedAge}
            className={`${styles.resultsTab} ${age === selectedAge ? styles.resultsTabActive : ''}`}
            onClick={() => handleSelectAge(age)}
          >
            {age}
          </button>
        ))}
      </div>

      {subdivisionsForAge.length > 1 && (
        <div className={`${styles.resultsTabs} ${styles.resultsSubTabs}`} role="tablist" aria-label="Division">
          {subdivisionsForAge.map((subdivision) => (
            <button
              key={subdivision}
              type="button"
              role="tab"
              aria-selected={subdivision === selectedSubdivision}
              className={`${styles.resultsSubTab} ${subdivision === selectedSubdivision ? styles.resultsSubTabActive : ''}`}
              onClick={() => setSelectedSubdivision(subdivision)}
            >
              {subdivision}
            </button>
          ))}
        </div>
      )}

      {/* "Prize winners," not "Final standings" — these lists (especially
          the shorter Girls ones) are the top finishers who placed, not every
          participant who played. Round count is stated here per-category
          (not just taken from the tournament-wide format string) since one
          category can genuinely run a different number of rounds than the
          rest — e.g. U14 Open at 4 rounds while everything else ran 5. */}
      <p className={styles.resultsHeading}>
        {active.category} — Prize Winners / {active.totalRounds} round{active.totalRounds === 1 ? '' : 's'}
      </p>

      <div className={styles.resultsTableWrap} style={{ minHeight: `${maxStandings * ROW_HEIGHT_REM + ROW_HEIGHT_REM}rem` }}>
        <table className={styles.resultsTable}>
          <thead>
            <tr>
              <th className={styles.resultsTableHeadCell}>Rank</th>
              <th className={styles.resultsTableHeadCell}>Player</th>
              <th className={`${styles.resultsTableHeadCell} ${styles.resultsTableHeadCellRight}`}>Points</th>
            </tr>
          </thead>
          <tbody>
            {active.standings.map((standing) => (
              <tr key={standing.rank} className={styles.resultsTableRow}>
                <td className={`${styles.resultsTableCell} ${standing.rank <= 3 ? styles.resultsRankTop3 : ''}`}>{ordinal(standing.rank)}</td>
                <td className={styles.resultsTableCell}>{standing.name}</td>
                <td className={`${styles.resultsTableCell} ${styles.resultsTableCellRight}`}>
                  {standing.points} / {active.totalRounds}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
