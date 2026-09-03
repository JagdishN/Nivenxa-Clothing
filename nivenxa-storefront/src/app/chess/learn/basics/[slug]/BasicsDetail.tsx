'use client'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import MoveTrainer from '../../_shared/MoveTrainer'
import PieceLesson from '../../_shared/PieceLesson'
import MeetThePieces from '../../_shared/MeetThePieces'
import { getNextBasicsLesson, type BasicsLesson } from '@/lib/chess/basics/data'
import styles from './BasicsDetail.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
function noop() {}

export default function BasicsDetail({ lesson }: { lesson: BasicsLesson }) {
  const next = getNextBasicsLesson(lesson.slug)
  const nextCta = next ? { href: `/chess/learn/basics/${next.slug}`, label: `Learn ${next.name} next →` } : undefined

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
        {lesson.interactive === 'meet-pieces' ? (
          <MeetThePieces nextCta={nextCta} />
        ) : lesson.steps ? (
          <PieceLesson
            example={{
              steps: lesson.steps,
              pieceName: lesson.name,
              completionSummary: lesson.completionSummary,
            }}
            nextCta={nextCta}
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
        ) : (
          <>
            <div className={styles.boardCol}>
              <div className={styles.boardWrap}>
                <Board fen={START_FEN} turnColor="white" dests={EMPTY_DESTS} viewOnly onMove={noop} />
              </div>
            </div>
            <div className={styles.panelCol}>
              <div className={styles.explanation}>
                {(lesson.startText ?? []).map((line, i) => (
                  <p key={i} className={styles.explanationText}>
                    {line}
                  </p>
                ))}
              </div>
              <div className={styles.actions}>
                {nextCta && (
                  <Link href={nextCta.href} className={styles.actionBtn}>
                    {nextCta.label}
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
