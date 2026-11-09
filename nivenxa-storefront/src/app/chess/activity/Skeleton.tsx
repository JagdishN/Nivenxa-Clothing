import styles from './Activity.module.scss'

/** Shown by each tab's loading.tsx while its data loads: rows the same size as real ones, announced politely. */
export default function ListSkeleton({ what }: { what: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className={styles.srOnly}>Loading your {what}…</span>
      <ul className={styles.list} aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className={styles.skeletonRow} />
        ))}
      </ul>
    </div>
  )
}
