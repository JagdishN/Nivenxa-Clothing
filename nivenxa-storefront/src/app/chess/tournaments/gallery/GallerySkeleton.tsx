'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from '../Tournaments.module.scss'

/**
 * Shown while the gallery loads. Opened from a tournament (?from=), it keeps that event's context: a "Back to
 * tournament" link to the same event (and results category) and a neutral title bar, never the generic
 * "Moments from our tournaments" heading, which only belongs to the all-events gallery.
 */
export default function GallerySkeleton() {
  const params = useSearchParams()
  const from = params.get('from')
  const back = new URLSearchParams()
  for (const key of ['age', 'div']) {
    const value = params.get(key)
    if (value) back.set(key, value)
  }
  const backHref = from ? `/chess/tournaments/${from}${back.toString() ? `?${back.toString()}` : ''}` : '/chess/tournaments'

  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.backBar}>
        <Link href={backHref} className={styles.backLink}>
          {from ? '← Back to tournament' : '← Back to Tournaments'}
        </Link>
      </div>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS GALLERY</p>
        {from ? (
          <>
            <span className={`${styles.skelLine} ${styles.skel}`} aria-hidden="true" style={{ width: '55%', height: '2.4rem' }} />
            <span className={`${styles.skelLine} ${styles.skel}`} aria-hidden="true" style={{ width: '30%' }} />
          </>
        ) : (
          <h1 className={styles.heading}>Moments from our tournaments.</h1>
        )}
      </section>
      <div className={styles.groups} role="status" aria-live="polite">
        <span className={styles.srOnly}>Loading photos…</span>
        <span className={`${styles.skelCard} ${styles.skel}`} aria-hidden="true" />
      </div>
    </main>
  )
}
