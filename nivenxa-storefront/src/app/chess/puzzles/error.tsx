'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './Puzzles.module.scss'

// Covers /chess/puzzles and every topic beneath it. A failed load is shown
// as a failure with a retry — never as "No puzzles are available" — and the
// raw error message is deliberately not shown to the player.
export default function PuzzlesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    console.error('Puzzles failed to load —', error.message, error.digest ?? '')
  }, [error])

  function retry() {
    setRetried(true)
    // refresh() re-fetches the route's server data; reset() then re-renders the boundary.
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS</p>
        <h1 className={styles.heading}>Puzzles</h1>
        <div className={styles.errorState} role="alert">
          <p>We couldn&rsquo;t load the puzzles{retried ? ' again' : ''}. Your progress is safe.</p>
          <div className={styles.errorActions}>
            <button type="button" className={styles.difficultyBtnActive + ' ' + styles.difficultyBtn} onClick={retry} disabled={pending}>
              {pending ? 'Retrying…' : 'Try again'}
            </button>
            <Link href="/chess" className={styles.difficultyBtn}>
              Back to Chess home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
