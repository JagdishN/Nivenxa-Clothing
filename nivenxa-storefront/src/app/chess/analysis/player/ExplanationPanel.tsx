import ExplanationBody from '@/components/chess/ExplanationBody'
import type { QualityMoveEntry } from '@/lib/chess/types'
import styles from './Player.module.scss'

const CLASSIFICATION_LABEL: Record<QualityMoveEntry['classification'], string> = {
  best: 'Best Move',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

const CLASSIFICATION_STYLE: Record<QualityMoveEntry['classification'], string> = {
  best: 'pillBest',
  excellent: 'pillGood',
  good: 'pillNeutral',
  inaccuracy: 'pillWarn',
  mistake: 'pillBad',
  blunder: 'pillBad',
}

const WEAK = new Set<QualityMoveEntry['classification']>(['inaccuracy', 'mistake', 'blunder'])

export default function ExplanationPanel({
  entry,
  atStart,
  onTryYourself,
}: {
  entry: QualityMoveEntry | undefined
  atStart: boolean
  onTryYourself?: () => void
}) {
  if (atStart) {
    return (
      <div className={styles.panel}>
        <p className={styles.panelPlaceholder}>Press Play to begin — Nivenxa will walk through the game move by move.</p>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className={styles.panel}>
        <p className={styles.panelPlaceholder}>Analyzing this move…</p>
      </div>
    )
  }

  const moveNumber = Math.floor(entry.ply / 2) + 1

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelMoveNum}>
          Move {moveNumber}
          {entry.color === 'b' ? ' (Black)' : ''}
        </span>
        {WEAK.has(entry.classification) && <span className={styles.panelFlag}>⚠ Important Moment</span>}
      </div>

      <p className={styles.panelPlayed}>
        You played <strong>{entry.san}</strong>
        <span className={`${styles.pill} ${styles[CLASSIFICATION_STYLE[entry.classification]]}`}>
          {CLASSIFICATION_LABEL[entry.classification]}
        </span>
      </p>

      {entry.explanationStatus === 'loading' && <p className={styles.panelPlaceholder}>Nivenxa is thinking this through…</p>}
      {entry.explanationStatus === 'error' && <p className={styles.panelError}>Couldn&apos;t load an explanation for this move.</p>}
      {entry.explanationStatus === 'loaded' && (
        <>
          {WEAK.has(entry.classification) && entry.bestMoveSan && (
            <div className={styles.betterIdea}>
              <span className={styles.betterIdeaLabel}>Better idea</span>
              <span className={styles.betterIdeaMove}>{entry.bestMoveSan}</span>
            </div>
          )}
          <ExplanationBody entry={entry} />
          {WEAK.has(entry.classification) && onTryYourself && (
            <div className={styles.panelActions}>
              <p className={styles.panelPrompt}>You had a stronger move here. Can you find it?</p>
              <button type="button" className={styles.transportBtnPrimary} onClick={onTryYourself}>
                Try It Yourself
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
