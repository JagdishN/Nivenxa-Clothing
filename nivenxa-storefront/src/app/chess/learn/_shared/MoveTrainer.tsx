'use client'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { correctSquaresFor, wrongSquarePool, applyRawMove, type MoveFilterMode } from './moveTrainerLogic'
import styles from './MoveTrainer.module.scss'

// Beat before a wrong attempt snaps back — long enough to read as "held",
// short enough not to feel laggy. Matches PracticePanel's own timing.
const REVERT_DELAY = 700

export interface MoveTrainerExample {
  fen: string
  pieceSquare: string
  pieceColor: 'w' | 'b'
  /** What counts as "correct" — every legal move, only captures, only checks, or only checkmates. */
  filterMode: MoveFilterMode
  /** Intro sentence(s) shown above the board — how the piece moves. Use "\n" for separate lines. */
  moveExplanation: string
  /** The instruction shown at rest, e.g. "Move the rook to a green square." */
  promptLabel: string
  /** Shown after the 2nd wrong attempt, alongside the legal squares appearing (if not already shown). */
  hintText: string
  /** Whether the legal squares are circled from the start, or only once the hint appears. */
  revealSquaresFrom: 'start' | 'hint'
  /** e.g. "how the rook moves" — used in "You learned {lessonLabel}!" */
  lessonLabel: string
}

type AttemptState = 'idle' | 'correct' | 'reverting'

export default function MoveTrainer({
  example,
  nextCta,
}: {
  example: MoveTrainerExample
  nextCta?: { href: string; label: string }
}) {
  const { fen, pieceSquare, pieceColor, filterMode, moveExplanation, promptLabel, hintText, revealSquaresFrom, lessonLabel } = example

  const correctSquares = useMemo(() => correctSquaresFor(fen, pieceSquare, filterMode), [fen, pieceSquare, filterMode])
  const wrongPool = useMemo(() => wrongSquarePool(pieceSquare, correctSquares), [pieceSquare, correctSquares])

  const [displayFen, setDisplayFen] = useState(fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [complete, setComplete] = useState(false)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dests = useMemo(() => {
    if (complete || attemptState === 'reverting') return new Map<Key, Key[]>()
    const targets = Array.from(new Set([...correctSquares, ...wrongPool]))
    return new Map<Key, Key[]>([[pieceSquare as Key, targets]])
  }, [complete, attemptState, correctSquares, wrongPool, pieceSquare])

  function handleMove(from: Key, to: Key) {
    if (complete || attemptState === 'reverting' || from !== pieceSquare) return
    setLastMove([from, to])
    setDisplayFen(applyRawMove(fen, from, to))
    if ((correctSquares as string[]).includes(to)) {
      setAttemptState('correct')
      setComplete(true)
      return
    }
    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(() => {
      setDisplayFen(fen)
      setAttemptState('idle')
      setLastMove(undefined)
    }, REVERT_DELAY)
  }

  function handleTryAgain() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    setDisplayFen(fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setComplete(false)
    setLastMove(undefined)
  }

  // Caps at 2 — the hint (and, if not already shown, the highlighted
  // squares) stays up for any further miss rather than escalating further.
  const hintTier = Math.min(wrongAttempts, 2)
  const showSquares = !complete && (revealSquaresFrom === 'start' || hintTier >= 2)

  let promptLines: string[]
  if (complete) {
    promptLines = [`You learned ${lessonLabel}!`]
  } else if (hintTier === 0) {
    promptLines = [promptLabel]
  } else if (hintTier === 1) {
    promptLines = ['Not quite. Try another square.']
  } else {
    promptLines = ['Need a hint?', hintText]
  }

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={displayFen}
            turnColor={pieceColor === 'w' ? 'white' : 'black'}
            dests={dests}
            orientation={pieceColor === 'b' ? 'black' : 'white'}
            viewOnly={complete || attemptState === 'reverting'}
            lastMove={lastMove}
            highlightSquares={showSquares ? correctSquares : undefined}
            highlightColor="green"
            onMove={handleMove}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <div className={styles.explanation}>
          {moveExplanation.split('\n').map((line, i) => (
            <p key={i} className={styles.explanationText}>
              {line}
            </p>
          ))}
        </div>

        <div className={`${styles.promptCard} ${complete ? styles.promptCardDone : ''}`}>
          {promptLines.map((line, i) => (
            <p key={i} className={styles.promptText}>
              {line}
            </p>
          ))}
        </div>

        {complete && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtnGhost} onClick={handleTryAgain}>
              Try again
            </button>
            {nextCta && (
              <Link href={nextCta.href} className={styles.actionBtn}>
                {nextCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
