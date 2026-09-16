'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import MoveTrainer from '../../_shared/MoveTrainer'
import PieceLesson from '../../_shared/PieceLesson'
import BoardLesson from '../../_shared/BoardLesson'
import MiniGameLesson from '../../_shared/MiniGameLesson'
import { getNextBasicsLesson, type BasicsLesson } from '@/lib/chess/basics/data'
import { markLessonStarted } from '@/lib/chess/basicsProgress'
import styles from './BasicsDetail.module.scss'

export default function BasicsDetail({ lesson }: { lesson: BasicsLesson }) {
  const next = getNextBasicsLesson(lesson.slug)
  const nextCta = next ? { href: `/chess/learn/basics/${next.slug}`, label: `Learn ${next.name} next →` } : undefined

  // A visit to the lesson page is "started" — a plain localStorage write,
  // not a setState call, so this is safe directly in the effect body.
  useEffect(() => {
    markLessonStarted(lesson.slug)
  }, [lesson.slug])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/basics" className={styles.breadcrumb}>
          ← Chess Basics
        </Link>
        <h1 className={styles.heading}>{lesson.name}</h1>
        <p className={styles.subtext}>{lesson.description}</p>
      </section>

      <div className={styles.layout}>
        {lesson.miniGame && lesson.miniGameFen ? (
          <MiniGameLesson
            example={{ fen: lesson.miniGameFen, completionSummary: lesson.completionSummary }}
            slug={lesson.slug}
          />
        ) : lesson.boardSteps && lesson.boardFen ? (
          <BoardLesson
            example={{
              steps: lesson.boardSteps,
              fen: lesson.boardFen,
              lessonName: lesson.name,
              completionSummary: lesson.completionSummary,
            }}
            nextCta={nextCta}
            slug={lesson.slug}
          />
        ) : lesson.steps ? (
          <PieceLesson
            example={{
              steps: lesson.steps,
              pieceName: lesson.name,
              completionSummary: lesson.completionSummary,
            }}
            nextCta={nextCta}
            slug={lesson.slug}
          />
        ) : lesson.trainer ? (
          <MoveTrainer
            example={{
              fen: lesson.trainer.fen,
              pieceSquare: lesson.trainer.pieceSquare,
              pieceColor: lesson.trainer.pieceColor,
              filterMode: lesson.trainer.filterMode,
              moveExplanation: lesson.trainer.moveExplanation,
              promptLabel: lesson.trainer.promptLabel,
              hintText: lesson.trainer.hintText,
              revealSquaresFrom: lesson.trainer.revealSquaresFrom,
              lessonLabel: lesson.completionSummary?.[0]?.replace(/^You learned /i, '').replace(/\.$/, '') ?? lesson.name,
            }}
            nextCta={nextCta}
          />
        ) : null}
      </div>
    </main>
  )
}
