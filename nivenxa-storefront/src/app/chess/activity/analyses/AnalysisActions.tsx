'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteAnalysisGame } from '@/lib/chess/analysisActions'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import styles from '../Activity.module.scss'

/**
 * Open the saved analysis (no recompute: the saved result is shown) and delete it. Delete keeps the app's existing
 * two-step confirmation and says what it affects: the saved analysis is removed; a game played on NIVENXA stays in My Games.
 */
export default function AnalysisActions({ id, analysed }: { id: string; analysed: boolean }) {
  const router = useRouter()
  const busy = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (busy.current) return
    busy.current = true
    setDeleting(true)
    setError(null)
    try {
      const res = await deleteAnalysisGame(getOrCreateAnalysisOwnerId(), id)
      if (res.error) {
        setError('We couldn’t delete it. Please try again.')
        return
      }
      router.refresh()
    } catch {
      setError('We couldn’t delete it. Please try again.')
    } finally {
      busy.current = false
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div>
      <div className={styles.actions}>
        <Link href={`/chess/analysis/player?gameId=${id}`} className={styles.actionPrimary}>
          {analysed ? 'Open analysis' : 'Analyse'}
        </Link>
        {confirming ? (
          <>
            <button type="button" className={styles.actionDanger} onClick={remove} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button type="button" className={styles.action} onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className={styles.action} onClick={() => setConfirming(true)}>
            Delete
          </button>
        )}
      </div>
      {confirming && <p className={styles.note}>Deletes this saved analysis. A game you played on NIVENXA stays in My Games.</p>}
      {error && (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
