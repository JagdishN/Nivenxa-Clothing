import type { MoveAnalysisEntry } from '@/lib/chess/types'
import styles from './ExplanationBody.module.scss'

/**
 * Renders a StructuredExplanation-shaped MoveAnalysisEntry: headline, body
 * paragraph, then either bullets (why a solid move works) or a suggestion
 * (what to consider instead of a weak one), an optional watch-out line, and
 * an optional standing "Remember" tip. At 'plain' depth (no headline — e.g.
 * Master, or Expert live) there's no headline, just the original paragraph.
 *
 * Shared by Play's live/review feed and the Analysis Player's explanation
 * panel — extracted from play/page.tsx so both render identically.
 */
export default function ExplanationBody({ entry }: { entry: MoveAnalysisEntry }) {
  if (!entry.headline) {
    return entry.explanation ? <p className={styles.calloutText}>{entry.explanation}</p> : null
  }

  return (
    <>
      <p className={styles.calloutHeadline}>{entry.headline}</p>
      {entry.explanation && <p className={styles.calloutText}>{entry.explanation}</p>}
      {entry.bullets && entry.bullets.length > 0 && (
        <div className={styles.calloutSection}>
          <span className={styles.calloutSectionLabel}>{entry.kind === 'quality' ? 'Why it works' : 'Why it helps'}</span>
          <ul className={styles.calloutBullets}>
            {entry.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {entry.suggestion && (
        <div className={styles.calloutSection}>
          <span className={styles.calloutSectionLabel}>Better idea</span>
          <p className={styles.calloutText}>{entry.suggestion}</p>
        </div>
      )}
      {entry.notice && (
        <p className={styles.calloutWatch}>
          <strong>Watch:</strong> {entry.notice}
        </p>
      )}
      {entry.remember && (
        <div className={styles.calloutSection}>
          <span className={styles.calloutSectionLabel}>Remember</span>
          <p className={styles.calloutText}>{entry.remember}</p>
        </div>
      )}
    </>
  )
}
