'use client'
import { useState } from 'react'
import theme from '../../LivingTheme.module.scss'

export interface ReadingRowData {
  flatId: string
  flatNo: string
  previous: number | null
  current: number | null
  flagged: boolean
  flaggedNote: string | null
}

/**
 * Previous/Current are controlled here (not defaultValue) purely so
 * Consumption can update on every keystroke instead of only after a
 * save-and-reload round trip — the save itself still goes through the same
 * server action as a plain form submit, nothing about persistence changes.
 */
export default function ReadingsTable({ rows, save }: { rows: ReadingRowData[]; save: (formData: FormData) => void }) {
  const [values, setValues] = useState(() => new Map(rows.map((r) => [r.flatId, { previous: r.previous, current: r.current }])))

  function setField(flatId: string, field: 'previous' | 'current', raw: string) {
    setValues((prev) => {
      const next = new Map(prev)
      next.set(flatId, { ...next.get(flatId)!, [field]: raw === '' ? null : Number(raw) })
      return next
    })
  }

  return (
    <form action={save}>
      <div className={theme.card}>
        <div className={theme.tableScroll}>
          <table className={theme.table}>
            <thead>
              <tr>
                <th>Flat</th>
                <th className={theme.num}>Previous</th>
                <th className={theme.num}>Current</th>
                <th className={theme.num}>Consumption</th>
                <th>Meter broken</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const v = values.get(row.flatId)!
                const consumption = v.current !== null && v.previous !== null ? v.current - v.previous : null
                return (
                  <tr key={row.flatId}>
                    <td>{row.flatNo}</td>
                    <td>
                      <input
                        name={`previous_${row.flatId}`}
                        className={theme.input}
                        type="number"
                        step="0.01"
                        value={v.previous ?? ''}
                        onChange={(e) => setField(row.flatId, 'previous', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        name={`current_${row.flatId}`}
                        className={theme.input}
                        type="number"
                        step="0.01"
                        value={v.current ?? ''}
                        onChange={(e) => setField(row.flatId, 'current', e.target.value)}
                      />
                    </td>
                    <td className={theme.num}>{consumption !== null ? consumption.toLocaleString('en-IN') : '—'}</td>
                    <td>
                      <input type="checkbox" name={`flagged_${row.flatId}`} defaultChecked={row.flagged} />
                    </td>
                    <td>
                      <input name={`flagged_note_${row.flatId}`} className={theme.input} defaultValue={row.flaggedNote ?? ''} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
          Save
        </button>
      </div>
    </form>
  )
}
