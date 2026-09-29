'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import MoveTrainer from '../../_shared/MoveTrainer'
import PieceLesson from '../../_shared/PieceLesson'
import BoardLesson from '../../_shared/BoardLesson'
import MiniGameLesson from '../../_shared/MiniGameLesson'
import { getNextBasicsLesson, type BasicsLesson } from '@/lib/chess/basics/data'
import { markLessonStarted } from '@/lib/chess/basicsProgress'
import styles from './BasicsDetail.module.scss'

// Matches $bp-lg in styles/_variables.scss — below this the workspace stacks
// and scrolls normally (see BasicsWorkspace.module.scss's max-lg rules), so
// there's nothing to measure.
const DESKTOP_BREAKPOINT = 1024
const BOTTOM_GUTTER = 20
const MIN_WORKSPACE_HEIGHT = 380

export default function BasicsDetail({ lesson }: { lesson: BasicsLesson }) {
  const next = getNextBasicsLesson(lesson.slug)
  const nextCta = next ? { href: `/chess/learn/basics/${next.slug}`, label: `Next: ${next.name} →` } : undefined

  // A visit to the lesson page is "started" — a plain localStorage write,
  // not a setState call, so this is safe directly in the effect body.
  useEffect(() => {
    markLessonStarted(lesson.slug)
  }, [lesson.slug])

  // The "whole lesson fits without page scroll" requirement, measured rather
  // than guessed: nav + hero heights vary (real content, responsive type),
  // so instead of a hardcoded calc() this reads how much vertical space is
  // actually left below the workspace's own top edge and writes it as a CSS
  // custom property BasicsWorkspace.module.scss's boardCol/panelCol both
  // read from (see $workspace-size there). Below the desktop breakpoint the
  // var is cleared entirely — the CSS falls back to its own stacked,
  // scrollable layout there, which is the right behavior on a phone/tablet.
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [workspaceHeight, setWorkspaceHeight] = useState<number | null>(null)

  useEffect(() => {
    function measure() {
      if (!workspaceRef.current || window.innerWidth < DESKTOP_BREAKPOINT) {
        setWorkspaceHeight(null)
        return
      }
      const top = workspaceRef.current.getBoundingClientRect().top
      setWorkspaceHeight(Math.max(MIN_WORKSPACE_HEIGHT, window.innerHeight - top - BOTTOM_GUTTER))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [lesson.slug])

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/basics" className={styles.breadcrumb}>
          ← Chess Basics
        </Link>
        <h1 className={styles.heading}>{lesson.name}</h1>
      </section>

      <div
        ref={workspaceRef}
        className={styles.workspace}
        style={workspaceHeight ? ({ '--basics-workspace-h': `${workspaceHeight}px` } as CSSProperties) : undefined}
      >
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
              completionHeadline: lesson.completionHeadline,
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
              completionHeadline: lesson.completionHeadline ?? `You learned ${lesson.name}!`,
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
