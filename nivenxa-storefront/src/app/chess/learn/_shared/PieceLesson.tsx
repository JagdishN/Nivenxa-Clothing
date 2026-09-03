'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { correctSquaresFor, wrongSquarePool, applyRawMove, type MoveFilterMode } from './moveTrainerLogic'
import styles from './PieceLesson.module.scss'

const REVERT_DELAY = 700
const ADVANCE_DELAY = 1100
const CELEBRATE_DURATION = 1300

export interface PieceDemoStep {
  kind: 'demo'
  /** e.g. "SEE IT MOVE", "JUMPING OVER" — shown as the step's small progress label. */
  stageLabel: string
  fen: string
  pieceColor: 'w' | 'b'
  /** Squares to circle, illustrating the movement pattern. */
  highlightSquares?: string[]
  /** [from, to] arrow(s) to draw. */
  arrows?: [string, string][]
  /** Explanation lines, shown in order. */
  text: string[]
  ctaLabel?: string
}

export interface PieceTryStep {
  kind: 'try'
  stageLabel: string
  fen: string
  pieceSquare: string
  pieceColor: 'w' | 'b'
  filterMode: MoveFilterMode
  /** Narrow the filterMode-derived legal squares down to a specific subset — e.g. only the one-square-forward pawn move on a position where two squares is also legal. */
  onlyTo?: string[]
  prompt: string
  wrongText: string
  hintText: string
  revealSquaresFrom: 'start' | 'hint'
  /** What the correct move demonstrated, shown after "✓ That's it! " */
  correctText: string
}

export type PieceLessonStep = PieceDemoStep | PieceTryStep

export interface PieceLessonExample {
  steps: PieceLessonStep[]
  pieceName: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting'

export default function PieceLesson({
  example,
  nextCta,
}: {
  example: PieceLessonExample
  nextCta?: { href: string; label: string }
}) {
  const { steps, pieceName, completionSummary } = example
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const [displayFen, setDisplayFen] = useState(step.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `step` is derived from stepIndex; re-running on step identity would be redundant.
  useEffect(() => {
    setDisplayFen(step.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
  }, [stepIndex])

  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!allDone) {
      setShowModal(false)
      return
    }
    const timer = setTimeout(() => setShowModal(true), CELEBRATE_DURATION)
    return () => clearTimeout(timer)
  }, [allDone])

  const correctSquares = useMemo(() => {
    if (step.kind !== 'try') return []
    const all = correctSquaresFor(step.fen, step.pieceSquare, step.filterMode)
    return step.onlyTo ? all.filter((sq) => step.onlyTo!.includes(sq)) : all
  }, [step])

  const wrongPool = useMemo(() => {
    if (step.kind !== 'try') return []
    return wrongSquarePool(step.pieceSquare, correctSquares)
  }, [step, correctSquares])

  const dests = useMemo(() => {
    if (step.kind !== 'try' || attemptState !== 'idle') return new Map<Key, Key[]>()
    const targets = Array.from(new Set([...correctSquares, ...wrongPool]))
    return new Map<Key, Key[]>([[step.pieceSquare as Key, targets]])
  }, [step, attemptState, correctSquares, wrongPool])

  function advanceStep() {
    if (isLast) setAllDone(true)
    else setStepIndex((i) => i + 1)
  }

  function handleMove(from: Key, to: Key) {
    if (step.kind !== 'try') return
    if (attemptState !== 'idle' || from !== step.pieceSquare) return
    setLastMove([from, to])
    setDisplayFen(applyRawMove(step.fen, from, to))

    if ((correctSquares as string[]).includes(to)) {
      setAttemptState('correct')
      advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
      return
    }

    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(() => {
      setDisplayFen(step.fen)
      setAttemptState('idle')
      setLastMove(undefined)
    }, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    setStepIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  const hintTier = step.kind === 'try' ? Math.min(wrongAttempts, 2) : 0
  const showSquares = step.kind === 'try' && (step.revealSquaresFrom === 'start' || hintTier >= 2)

  let promptLines: string[]
  let stageLabel: string
  if (allDone) {
    promptLines = [`You learned the ${pieceName}!`]
    stageLabel = 'COMPLETE'
  } else if (step.kind === 'demo') {
    promptLines = step.text
    stageLabel = step.stageLabel
  } else if (attemptState === 'correct') {
    promptLines = [`✓ That's it! ${step.correctText}`]
    stageLabel = step.stageLabel
  } else if (hintTier === 0) {
    promptLines = [step.prompt]
    stageLabel = step.stageLabel
  } else if (hintTier === 1) {
    promptLines = [step.wrongText]
    stageLabel = step.stageLabel
  } else {
    promptLines = ['Need a hint?', step.hintText]
    stageLabel = step.stageLabel
  }

  const highlightSquares =
    step.kind === 'demo' ? (step.highlightSquares as Key[] | undefined) : showSquares ? (correctSquares as Key[]) : undefined
  const hintArrow = step.kind === 'demo' && step.arrows?.[0] ? (step.arrows[0] as Key[]) : undefined
  const celebrating = allDone && !showModal
  const turnColor = step.pieceColor === 'w' ? 'white' : 'black'

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={displayFen}
            turnColor={turnColor}
            dests={step.kind === 'try' ? dests : new Map<Key, Key[]>()}
            orientation={step.pieceColor === 'b' ? 'black' : 'white'}
            viewOnly={step.kind === 'demo' || attemptState !== 'idle' || allDone}
            lastMove={lastMove}
            highlightSquares={allDone ? undefined : highlightSquares}
            highlightColor="green"
            hintArrow={allDone ? undefined : hintArrow}
            onMove={handleMove}
          />
          {celebrating && (
            <div className={styles.celebrate} aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className={styles.spark} style={{ left: `${12 + i * 14}%`, animationDelay: `${i * 70}ms` }} />
              ))}
              <span className={styles.celebrateCheck}>✓</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelCol}>
        <p className={styles.stageIndicator}>{allDone ? 'Complete' : `Step ${stepIndex + 1} of ${steps.length} · ${stageLabel}`}</p>

        <div
          className={`${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''} ${
            allDone ? styles.promptCardDone : ''
          }`}
        >
          {promptLines.map((line, i) => (
            <p key={i} className={styles.promptText}>
              {line}
            </p>
          ))}
        </div>

        <div className={styles.actions}>
          {!allDone && step.kind === 'demo' && (
            <button type="button" className={styles.actionBtn} onClick={advanceStep}>
              {step.ctaLabel ?? 'Next →'}
            </button>
          )}
          {allDone && (
            <button type="button" className={styles.actionBtnGhost} onClick={handlePracticeAgain}>
              Practice again
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTag}>✓ {pieceName} completed</p>
            <p className={styles.modalHeading}>🎉 You learned the {pieceName}!</p>
            {(completionSummary ?? []).map((line, i) => (
              <p key={i} className={styles.modalBody}>
                {line}
              </p>
            ))}
            <div className={styles.modalActions}>
              {nextCta && (
                <Link href={nextCta.href} className={styles.modalPrimary}>
                  {nextCta.label}
                </Link>
              )}
              <Link href="/chess/learn/basics" className={styles.modalSecondary}>
                Back to Chess Basics
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
