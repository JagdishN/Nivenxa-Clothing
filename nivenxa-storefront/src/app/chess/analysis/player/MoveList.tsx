import type { NormalizedMove } from '@/lib/chess/analysisTypes'
import type { QualityMoveEntry } from '@/lib/chess/types'
import styles from './Player.module.scss'

// Standard PGN annotation suffixes — only for moves worth flagging, per the
// spec's own "Bxh7+ ?!" example. Best/excellent/good stay unmarked so the
// list isn't cluttered with a symbol on every line.
const SUFFIX: Partial<Record<QualityMoveEntry['classification'], string>> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

export default function MoveList({
  moves,
  entries,
  currentPly,
  onJump,
}: {
  moves: NormalizedMove[]
  entries: QualityMoveEntry[]
  currentPly: number
  onJump: (ply: number) => void
}) {
  const entryByPly = new Map(entries.map((e) => [e.ply, e]))

  const rows: { num: number; white?: NormalizedMove; black?: NormalizedMove }[] = []
  moves.forEach((m) => {
    const num = Math.floor(m.ply / 2) + 1
    let row = rows[rows.length - 1]
    if (!row || row.num !== num) {
      row = { num }
      rows.push(row)
    }
    if (m.color === 'w') row.white = m
    else row.black = m
  })

  return (
    <div className={styles.moveList}>
      <p className={styles.moveListLabel}>Moves</p>
      <div className={styles.moveListBody}>
        {rows.map((row) => (
          <div key={row.num} className={styles.moveRow}>
            <span className={styles.moveNum}>{row.num}</span>
            {(['white', 'black'] as const).map((side) => {
              const m = row[side]
              if (!m) return <span key={side} className={styles.moveCell} />
              const entry = entryByPly.get(m.ply)
              const suffix = entry ? SUFFIX[entry.classification] : undefined
              const selected = currentPly === m.ply + 1
              return (
                <button
                  key={side}
                  type="button"
                  className={`${styles.moveCell} ${selected ? styles.moveCellSelected : ''}`}
                  onClick={() => onJump(m.ply + 1)}
                >
                  {m.san}
                  {suffix && <span className={styles.moveSuffix}> {suffix}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
