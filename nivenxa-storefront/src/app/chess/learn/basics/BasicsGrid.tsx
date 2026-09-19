'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllProgress, getLessonStatus, type LessonStatus } from '@/lib/chess/basicsProgress'
import type { BasicsLesson } from '@/lib/chess/basics/data'
import styles from './BasicsList.module.scss'

const BADGE_LABEL: Record<LessonStatus, string> = {
  completed: '✓ Completed',
  'in-progress': 'In Progress',
  'not-started': 'Start',
}

const BADGE_CLASS: Record<LessonStatus, string> = {
  completed: styles.badgeCompleted,
  'in-progress': styles.badgeInProgress,
  'not-started': styles.badgeStart,
}

/**
 * Client component purely for the progress badges (localStorage can't be
 * read server-side) — the lesson list itself (BASICS) is still static data
 * passed down from the server-rendered page.
 */
export default function BasicsGrid({ lessons }: { lessons: BasicsLesson[] }) {
  const [statuses, setStatuses] = useState<Record<string, LessonStatus> | null>(null)

  useEffect(() => {
    // Deferred to an effect (not useMemo) so the first client render still
    // matches the server's markup (no localStorage there) — reading it
    // straight into render would cause a hydration mismatch.
    ;(() => {
      const progress = getAllProgress()
      setStatuses(Object.fromEntries(lessons.map((l) => [l.slug, getLessonStatus(l.slug, progress)])))
    })()
  }, [lessons])

  return (
    <div className={styles.grid}>
      {lessons.map((lesson, i) => {
        const status = statuses?.[lesson.slug] ?? 'not-started'
        return (
          <Link key={lesson.slug} href={`/chess/learn/basics/${lesson.slug}`} className={styles.card}>
            <span className={styles.cardTop}>
              <span className={styles.cardNumber}>{i + 1}</span>
              {/* Only rendered once localStorage has been read — avoids a
                  server/client "Start" vs "Completed" hydration flash. */}
              {statuses && (
                <span className={`${styles.cardBadge} ${BADGE_CLASS[status]}`}>{BADGE_LABEL[status]}</span>
              )}
            </span>
            <h2 className={styles.cardTitle}>{lesson.name}</h2>
            <p className={styles.cardDesc}>{lesson.summary}</p>
          </Link>
        )
      })}
    </div>
  )
}
