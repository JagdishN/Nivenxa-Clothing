import styles from './Loading.module.scss'

/**
 * Automatic Suspense fallback for every route under (dashboard) — Next.js
 * shows this the instant a nav Link is clicked, in place of the outgoing
 * page's own async Server Component render. AppNav/SessionTimeout stay
 * mounted (they live in layout.tsx, above this boundary); only the page
 * content area shows this skeleton.
 */
export default function DashboardLoading() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={`${styles.bar} ${styles.title}`} />
      <div className={styles.row}>
        <div className={`${styles.bar} ${styles.card}`} />
        <div className={`${styles.bar} ${styles.card}`} />
        <div className={`${styles.bar} ${styles.card}`} />
        <div className={`${styles.bar} ${styles.card}`} />
      </div>
      <div className={`${styles.bar} ${styles.line}`} />
      <div className={`${styles.bar} ${styles.line}`} />
      <div className={`${styles.bar} ${styles.line}`} />
    </div>
  )
}
