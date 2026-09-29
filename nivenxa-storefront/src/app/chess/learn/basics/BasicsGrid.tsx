'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllProgress, getLessonStatus, getLessonStepProgress, type LessonStatus } from '@/lib/chess/basicsProgress'
import type { BasicsLesson } from '@/lib/chess/basics/data'
import BasicsIcon, { type BasicsIconSlug } from './BasicsIcon'
import styles from './BasicsList.module.scss'

type StepProgress = { step: number; total: number } | null

/**
 * Client component for the progress summary + per-card badges (localStorage
 * can't be read server-side) — the lesson list itself (BASICS) is still
 * static data passed down from the server-rendered page. Renders the compact
 * progress line and the card grid together (not split across the server
 * page) so both can share one read of localStorage.
 */
export default function BasicsGrid({ lessons }: { lessons: BasicsLesson[] }) {
  const [statuses, setStatuses] = useState<Record<string, LessonStatus> | null>(null)
  const [stepProgress, setStepProgress] = useState<Record<string, StepProgress>>({})

  useEffect(() => {
    // Deferred to an effect (not useMemo) so the first client render still
    // matches the server's markup (no localStorage there) — reading it
    // straight into render would cause a hydration mismatch.
    ;(() => {
      const progress = getAllProgress()
      setStatuses(Object.fromEntries(lessons.map((l) => [l.slug, getLessonStatus(l.slug, progress)])))
      setStepProgress(Object.fromEntries(lessons.map((l) => [l.slug, getLessonStepProgress(l.slug, progress)])))
    })()
  }, [lessons])

  const completedCount = statuses ? Object.values(statuses).filter((s) => s === 'completed').length : 0
  const percent = Math.round((completedCount / lessons.length) * 100)
  // The first not-yet-completed lesson in curriculum order — nudged with
  // the same subtle purple accent as an actually-in-progress card (not a
  // new visual state, not a label), so there's a gentle suggested path
  // through the grid without locking anything or drawing connecting lines.
  const nextRecommendedSlug = statuses ? lessons.find((l) => statuses[l.slug] !== 'completed')?.slug : undefined

  return (
    <>
      {/* Only rendered once localStorage has been read — an initial "0 of 13"
          flash before the real count loads would read as a regression, not
          progress, so it's better left out entirely for that first frame.
          One line + one bar, folded directly under the hero subtext, not a
          separate floating block with its own heading. */}
      {statuses && (
        <div className={styles.progressBlock}>
          <p className={styles.progressLabel}>
            <span>{completedCount >= lessons.length ? 'Chess Basics complete ✓' : `${completedCount} of ${lessons.length} lessons completed`}</span>
            {completedCount < lessons.length && <span className={styles.progressPercent}>{percent}%</span>}
          </p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {lessons.map((lesson, i) => {
          const status = statuses?.[lesson.slug] ?? 'not-started'
          const step = stepProgress[lesson.slug]
          const isRecommended = status === 'in-progress' || (status === 'not-started' && lesson.slug === nextRecommendedSlug)
          const stateClass = status === 'completed' ? styles.cardCompleted : isRecommended ? styles.cardInProgress : ''
          return (
            <Link key={lesson.slug} href={`/chess/learn/basics/${lesson.slug}`} className={`${styles.card} ${stateClass}`}>
              <span className={styles.cardTop}>
                <BasicsIcon slug={lesson.slug as BasicsIconSlug} />
                <span className={styles.cardNumber}>{String(i + 1).padStart(2, '0')}</span>
              </span>
              {/* Title never changes with status — only the footer below does. */}
              <h2 className={styles.cardTitle}>{lesson.name}</h2>
              <p className={styles.cardDesc}>{lesson.summary}</p>

              {statuses && (
                <span className={styles.cardFooter}>
                  {status === 'completed' && (
                    <span className={styles.cardFooterRow}>
                      <span className={styles.badgeCompleted}>✓ Completed</span>
                      <span className={styles.cardCta}>Review →</span>
                    </span>
                  )}
                  {status === 'in-progress' && (
                    <>
                      <span className={styles.cardStepLine}>{step ? `${step.step} of ${step.total} steps` : 'In progress'}</span>
                      <span className={styles.cardFooterRow}>
                        {step && (
                          <span className={styles.cardMiniTrack}>
                            <span className={styles.cardMiniFill} style={{ width: `${Math.round((step.step / step.total) * 100)}%` }} />
                          </span>
                        )}
                        <span className={styles.cardCta}>Continue →</span>
                      </span>
                    </>
                  )}
                  {status === 'not-started' && (
                    <span className={styles.cardFooterRow}>
                      <span className={styles.cardCta}>Start →</span>
                    </span>
                  )}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </>
  )
}
