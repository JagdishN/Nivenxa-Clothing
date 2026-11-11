'use client'
import styles from './Activity.module.scss'

// A thrown error while loading a tab: a failure, never presented as "no history".
export default function ActivityError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={`${styles.state} ${styles.stateError}`} role="alert">
      <h2>We couldn’t load this</h2>
      <p>This is a loading problem, not an empty history. Please try again.</p>
      <button type="button" className={styles.actionPrimary} onClick={reset}>
        Retry
      </button>
    </div>
  )
}
