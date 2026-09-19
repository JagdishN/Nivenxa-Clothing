import type { MoveAnalysisEntry } from '@/lib/chess/types'
import styles from './Play.module.scss'

/**
 * The move-pairs list shared by Beginner/Intermediate's Moves tab, the
 * Expert dashboard's Moves toggle, and Master's always-visible panel — one
 * markup, one set of classes, instead of three copies drifting apart.
 */
export default function MovePairsTable({
  movePairs,
  selectedPly,
  onSelectMove,
}: {
  movePairs: [MoveAnalysisEntry | undefined, MoveAnalysisEntry | undefined][]
  selectedPly: number | null
  onSelectMove: (entry: MoveAnalysisEntry) => void
}) {
  if (movePairs.length === 0) {
    return (
      <div className={styles.feedEmpty}>
        <span className={styles.calloutPlaceholder}>Play a move to see it listed here.</span>
      </div>
    )
  }

  return (
    <div className={styles.movesTable}>
      {movePairs.map(([w, b], i) => (
        <div key={i} className={styles.moveRow}>
          <span className={styles.moveNum}>{i + 1}</span>
          {w ? (
            <button
              type="button"
              className={`${styles.moveCell} ${selectedPly === w.ply ? styles.moveCellSelected : ''}`}
              onClick={() => onSelectMove(w)}
            >
              {w.san}
            </button>
          ) : (
            <span className={styles.moveCell} />
          )}
          {b ? (
            <button
              type="button"
              className={`${styles.moveCell} ${selectedPly === b.ply ? styles.moveCellSelected : ''}`}
              onClick={() => onSelectMove(b)}
            >
              {b.san}
            </button>
          ) : (
            <span className={styles.moveCell} />
          )}
        </div>
      ))}
    </div>
  )
}
