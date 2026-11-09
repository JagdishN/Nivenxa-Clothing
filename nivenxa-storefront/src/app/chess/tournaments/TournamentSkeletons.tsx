import Link from 'next/link'
import styles from './Tournaments.module.scss'

// Shown the instant a Tournaments link is clicked (Next's loading.tsx), while the page's data is fetched. Each one
// carries the DESTINATION's own heading and back link, so the screen never shows the previous route's content under
// the new URL; sizes mirror the real page so nothing jumps when content lands.

function Blocks({ label, count }: { label: string; count: number }) {
  return (
    <div className={styles.groups} role="status" aria-live="polite">
      <span className={styles.srOnly}>{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`${styles.skelCard} ${styles.skel}`} aria-hidden="true" />
      ))}
    </div>
  )
}

export function ListingSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.backBar}>
        <Link href="/chess" className={styles.backLink}>← Back to Chess</Link>
      </div>
      <section className={styles.hero}>
        <h1 className={styles.heading}>NIVENXA Chess Tournaments</h1>
        <p className={styles.subtext}>Upcoming tournaments, prizes and registration details.</p>
      </section>
      <Blocks label="Loading tournaments…" count={1} />
    </main>
  )
}

export function ArchiveSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
      </div>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS ARCHIVE</p>
        <h1 className={styles.heading}>Past tournaments</h1>
      </section>
      <Blocks label="Loading past tournaments…" count={2} />
    </main>
  )
}

export function DetailSkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
      </div>
      <section className={styles.detailWrap} role="status" aria-live="polite">
        <span className={styles.srOnly}>Loading tournament details…</span>
        <span className={`${styles.skelLine} ${styles.skel}`} aria-hidden="true" style={{ width: '60%', height: '2.2rem' }} />
        <div className={styles.keyInfo} aria-hidden="true">
          <span className={`${styles.skelPanel} ${styles.skel}`} />
          <span className={`${styles.skelPanel} ${styles.skel}`} />
        </div>
        <span className={`${styles.skelLine} ${styles.skel}`} aria-hidden="true" style={{ width: '40%' }} />
      </section>
    </main>
  )
}

export function GallerySkeleton() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>← Back to Tournaments</Link>
      </div>
      <section className={styles.hero}>
        <h1 className={styles.heading}>Moments from our tournaments.</h1>
      </section>
      <Blocks label="Loading photos…" count={1} />
    </main>
  )
}
