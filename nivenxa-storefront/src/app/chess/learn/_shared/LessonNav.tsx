'use client'
import { useId, type ReactNode } from 'react'
import styles from './LessonNav.module.scss'

/**
 * The Back / Next row shared by the Chess Basics lesson engines. Both buttons are ALWAYS rendered in the same places,
 * so the row never jumps: Back is simply unavailable on the first step, and Next is unavailable (not removed) until a
 * practice step is finished — with a visible sentence saying why. Narration is never a reason for either to change.
 * Unavailable buttons use aria-disabled (not `disabled`) so keyboard and screen-reader users can still reach them and
 * hear the reason.
 */
export default function LessonNav({
  onBack,
  backAvailable,
  onNext,
  nextAvailable,
  nextLabel,
  nextHelp,
  extra,
  inline = false,
}: {
  onBack: () => void
  backAvailable: boolean
  onNext: () => void
  nextAvailable: boolean
  nextLabel: string
  /** Shown (and linked to the Next button) while Next is unavailable. */
  nextHelp?: string
  /** Rendered between Back and Next. */
  extra?: ReactNode
  /** Sits in the normal flow under the content (for a panel that grows with the page) instead of pinning to the bottom of a scrolling panel. */
  inline?: boolean
}) {
  const helpId = useId()
  return (
    <div className={`${styles.nav} ${inline ? styles.navInline : ''}`} data-testid="lesson-nav">
      {!nextAvailable && nextHelp && (
        <p id={helpId} className={styles.help} data-testid="lesson-next-help">
          {nextHelp}
        </p>
      )}
      <div className={styles.row}>
        <button type="button" className={styles.back} onClick={() => backAvailable && onBack()} aria-disabled={!backAvailable} data-testid="lesson-back">
          ← Back
        </button>
        {extra}
        <button
          type="button"
          className={styles.next}
          onClick={() => nextAvailable && onNext()}
          aria-disabled={!nextAvailable}
          aria-describedby={!nextAvailable && nextHelp ? helpId : undefined}
          data-testid="lesson-next"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}
