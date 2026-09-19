import type { QualityMoveEntry } from '@/lib/chess/types'
import styles from './Player.module.scss'

const LABEL: Record<QualityMoveEntry['classification'], string> = {
  best: 'Best',
  excellent: 'Strong',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

// Reuses the semantic (not brand) tokens — success/warning/danger — kept
// distinct from the purple/gold identity so "this needs attention" always
// reads at a glance, without turning the whole strip into a rainbow.
const CLASS_STYLE: Record<QualityMoveEntry['classification'], string> = {
  best: 'markerBest',
  excellent: 'markerGood',
  good: 'markerNeutral',
  inaccuracy: 'markerWarn',
  mistake: 'markerBad',
  blunder: 'markerBad',
}

// Only genuinely notable moments get a marker — "good" is the median
// outcome of a well-played game and would make every move a marker,
// defeating the point of a journey overview.
const NOTABLE = new Set<QualityMoveEntry['classification']>(['best', 'inaccuracy', 'mistake', 'blunder'])

export default function GameJourney({
  entries,
  currentPly,
  onJump,
}: {
  entries: QualityMoveEntry[]
  currentPly: number
  onJump: (ply: number) => void
}) {
  const notable = entries.filter((e) => NOTABLE.has(e.classification))
  if (notable.length === 0) return null

  return (
    <div className={styles.journey}>
      <p className={styles.journeyLabel}>Game Journey</p>
      <div className={styles.journeyTrack}>
        {notable.map((e) => (
          <button
            key={e.ply}
            type="button"
            className={`${styles.journeyMarker} ${styles[CLASS_STYLE[e.classification]]} ${currentPly === e.ply + 1 ? styles.journeyMarkerActive : ''}`}
            onClick={() => onJump(e.ply + 1)}
            title={`Move ${Math.floor(e.ply / 2) + 1}: ${e.san} — ${LABEL[e.classification]}`}
          >
            <span className={styles.journeyDot} aria-hidden="true" />
            <span className={styles.journeyText}>{LABEL[e.classification]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
