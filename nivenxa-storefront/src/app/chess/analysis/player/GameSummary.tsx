'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { accuracyFromEntries } from '@/lib/chess/moveClassification'
import type { ExplanationTone, GameLesson, GameLessonsRequestBody, GameLessonsResponseBody, QualityMoveEntry } from '@/lib/chess/types'
import styles from './Player.module.scss'

export default function GameSummary({
  entries,
  perspectiveColor,
  tone,
  onSave,
  saveStatus,
  onJumpToPly,
}: {
  entries: QualityMoveEntry[]
  perspectiveColor: 'w' | 'b'
  tone: ExplanationTone
  onSave: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onJumpToPly: (ply: number) => void
}) {
  const [lessons, setLessons] = useState<GameLesson[]>([])
  const [lessonsStatus, setLessonsStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  const accuracy = accuracyFromEntries(entries)
  const bestCount = entries.filter((e) => e.classification === 'best').length
  const mistakeCount = entries.filter((e) => e.classification === 'mistake').length
  const blunderCount = entries.filter((e) => e.classification === 'blunder').length

  useEffect(() => {
    if (entries.length === 0) return
    let cancelled = false
    setLessonsStatus('loading')
    const body: GameLessonsRequestBody = {
      moves: entries.map((e) => ({ ply: e.ply, san: e.san, classification: e.classification, cpLoss: e.cpLoss })),
      forColor: perspectiveColor,
      tone,
    }
    fetch('/api/chess/game-lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((res) => (res.ok ? (res.json() as Promise<GameLessonsResponseBody>) : Promise.reject()))
      .then((data) => {
        if (cancelled) return
        setLessons(data.lessons)
        setLessonsStatus('loaded')
      })
      .catch(() => {
        if (!cancelled) setLessonsStatus('error')
      })
    return () => {
      cancelled = true
    }
    // Re-fetch only when the underlying game/perspective changes, not on every entries re-render (entries objects change identity as explanations get patched in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, perspectiveColor, tone])

  return (
    <div className={styles.summary}>
      <p className={styles.summaryHeading}>Game Summary</p>
      <div className={styles.statGrid}>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{accuracy}%</span>
          <span className={styles.statLabel}>Accuracy</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{bestCount}</span>
          <span className={styles.statLabel}>Best moves</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{mistakeCount}</span>
          <span className={styles.statLabel}>Mistakes</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{blunderCount}</span>
          <span className={styles.statLabel}>Blunders</span>
        </div>
      </div>

      {lessonsStatus === 'loading' && <p className={styles.progressNote}>Working out your lessons from this game…</p>}
      {lessonsStatus === 'loaded' && lessons.length > 0 && (
        <div className={styles.lessons}>
          <p className={styles.lessonsHeading}>Your {lessons.length} Lessons From This Game</p>
          {lessons.map((lesson, i) => (
            <div key={i} className={styles.lessonCard}>
              <p className={styles.lessonHeadline}>
                {i + 1}. {lesson.headline.toUpperCase()}
              </p>
              <p className={styles.lessonBody}>{lesson.body}</p>
              <button type="button" className={styles.linkBtn} onClick={() => onJumpToPly(lesson.ply + 1)}>
                Practice Position
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.summaryActions}>
        <button type="button" className={styles.linkBtn} onClick={onSave} disabled={saveStatus === 'saving'}>
          {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'saving' ? 'Saving…' : 'Save this game'}
        </button>
        {saveStatus === 'error' && <span className={styles.error}>Couldn&apos;t save — try again.</span>}
        <Link href="/chess/analysis" className={styles.linkBtn}>
          Analyze Another Game
        </Link>
      </div>
    </div>
  )
}
