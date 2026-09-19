'use client'
import { useEffect, useState } from 'react'
import type { ExplanationTone, GameLesson, GameLessonsRequestBody, GameLessonsResponseBody, QualityMoveEntry } from '@/lib/chess/types'
import styles from './Play.module.scss'

// Below this, a single lesson from a very short/resigned game would be thin
// — mirrors (slightly raised from) GameSummary.tsx's own zero-entries guard.
const MIN_ENTRIES = 4

/**
 * "Nivenxa noticed something" — a single post-game callout that teases
 * Analysis's own full 3-lesson breakdown (GameSummary.tsx) rather than
 * duplicating it here. Reuses the same /api/chess/game-lessons route and
 * request shape, just keeping lessons[0]. Deliberately keeps Play's own
 * post-game screen light — "Play = decide, Analysis = understand".
 */
export default function NivenxaNoticed({
  entries,
  tone,
  onAnalyze,
}: {
  entries: QualityMoveEntry[]
  tone: ExplanationTone
  onAnalyze: () => void
}) {
  const [lesson, setLesson] = useState<GameLesson | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  useEffect(() => {
    if (entries.length < MIN_ENTRIES) return
    let cancelled = false

    // The loading-state update lives inside this nested async function
    // (a "callback... when external state changes", per the lint rule's own
    // guidance) rather than as a direct statement in the effect body.
    ;(async () => {
      setStatus('loading')
      const body: GameLessonsRequestBody = {
        moves: entries.map((e) => ({ ply: e.ply, san: e.san, classification: e.classification, cpLoss: e.cpLoss })),
        forColor: entries[0].color,
        tone,
      }
      try {
        const res = await fetch('/api/chess/game-lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Request failed')
        const data: GameLessonsResponseBody = await res.json()
        if (cancelled) return
        setLesson(data.lessons[0] ?? null)
        setStatus(data.lessons[0] ? 'loaded' : 'error')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
    // Re-fetch only when the underlying set of moves changes, not on every
    // entries re-render (entry objects get new identity as they're graded).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, tone])

  if (entries.length < MIN_ENTRIES || status !== 'loaded' || !lesson) return null

  return (
    <div className={styles.noticedCard}>
      <p className={styles.noticedHeading}>Nivenxa noticed something</p>
      <p className={styles.noticedHeadline}>{lesson.headline}</p>
      <p className={styles.noticedBody}>{lesson.body}</p>
      <button type="button" className={styles.linkBtn} onClick={onAnalyze}>
        Analyze This →
      </button>
    </div>
  )
}
