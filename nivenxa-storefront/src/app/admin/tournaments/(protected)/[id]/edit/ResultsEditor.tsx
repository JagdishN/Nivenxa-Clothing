'use client'

import { useState } from 'react'
import type { TournamentCategoryResult } from '@/lib/chess/types'
import styles from '../../../AdminTournaments.module.scss'

interface Row {
  name: string
  points: string
}
interface Cat {
  category: string
  totalRounds: string
  rows: Row[]
}

const toState = (initial: TournamentCategoryResult[]): Cat[] =>
  initial.map((c) => ({
    category: c.category,
    totalRounds: String(c.totalRounds),
    rows: [...c.standings].sort((a, b) => a.rank - b.rank).map((s) => ({ name: s.name, points: String(s.points) })),
  }))

/** One block per category: rows are listed in finishing order (row 1 = rank 1). The whole thing is saved as one JSON value. */
export default function ResultsEditor({ initial }: { initial: TournamentCategoryResult[] }) {
  const [cats, setCats] = useState<Cat[]>(() => toState(initial))
  const patch = (i: number, fn: (c: Cat) => Cat) => setCats((prev) => prev.map((c, n) => (n === i ? fn(c) : c)))

  const json = JSON.stringify(
    cats.map((c) => ({
      category: c.category.trim(),
      totalRounds: Number(c.totalRounds),
      standings: c.rows.map((r, idx) => ({ rank: idx + 1, name: r.name.trim(), points: Number(r.points) })),
    }))
  )

  return (
    <div className={styles.resultsEditor}>
      <input type="hidden" name="results_json" value={json} />
      {cats.length === 0 && <p className={styles.mutedNote}>No results entered yet. Add a category to start.</p>}
      {cats.map((c, i) => (
        <fieldset key={i} className={styles.resultCategory}>
          <legend>Category {i + 1}</legend>
          <div className={styles.resultHead}>
            <label className={styles.field}>
              Category name
              <input type="text" value={c.category} placeholder="U-14 Open" onChange={(e) => patch(i, (x) => ({ ...x, category: e.target.value }))} className={styles.input} />
            </label>
            <label className={styles.field}>
              Total rounds
              <input type="number" min={1} value={c.totalRounds} onChange={(e) => patch(i, (x) => ({ ...x, totalRounds: e.target.value }))} className={styles.input} />
            </label>
          </div>
          <table className={styles.resultTable}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player name</th>
                <th>Points</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r, n) => (
                <tr key={n}>
                  <td>{n + 1}</td>
                  <td>
                    <input
                      type="text"
                      aria-label={`Rank ${n + 1} player name`}
                      value={r.name}
                      onChange={(e) => patch(i, (x) => ({ ...x, rows: x.rows.map((row, k) => (k === n ? { ...row, name: e.target.value } : row)) }))}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      aria-label={`Rank ${n + 1} points`}
                      value={r.points}
                      onChange={(e) => patch(i, (x) => ({ ...x, rows: x.rows.map((row, k) => (k === n ? { ...row, points: e.target.value } : row)) }))}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <button type="button" className={styles.secondaryBtn} onClick={() => patch(i, (x) => ({ ...x, rows: x.rows.filter((_, k) => k !== n) }))} aria-label={`Remove rank ${n + 1}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.resultActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => patch(i, (x) => ({ ...x, rows: [...x.rows, { name: '', points: '' }] }))}>
              + Add player
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={() => setCats((prev) => prev.filter((_, n) => n !== i))}>
              Remove this category
            </button>
          </div>
        </fieldset>
      ))}
      <button type="button" className={styles.secondaryBtn} onClick={() => setCats((prev) => [...prev, { category: '', totalRounds: '', rows: [{ name: '', points: '' }] }])}>
        + Add category
      </button>
    </div>
  )
}
