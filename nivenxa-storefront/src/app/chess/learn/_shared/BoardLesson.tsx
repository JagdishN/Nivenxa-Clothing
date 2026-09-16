'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { markLessonCompleted } from '@/lib/chess/basicsProgress'
import styles from './BoardLesson.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
const REVERT_DELAY = 700
const ADVANCE_DELAY = 900
const CELEBRATE_DURATION = 1300

export interface BoardDemoStep {
  kind: 'demo'
  stageLabel: string
  /** Overrides the lesson-level `fen` for just this step — e.g. a lesson mostly about the empty board can still show one step on the starting position. */
  fen?: string
  highlightSquares?: string[]
  text: string[]
  ctaLabel?: string
  /** Boosts the board's rank/file coordinate labels for steps actively teaching them — see Board.tsx's emphasizeCoordinates. */
  emphasizeCoordinates?: boolean
}

export interface BoardSquareQuizStep {
  kind: 'squareQuiz'
  stageLabel: string
  /** Overrides the lesson-level `fen` for just this step. */
  fen?: string
  /** 'any' — the step completes the instant any one of `correctSquares` is clicked (e.g. "click a light square", many valid answers). 'all' — every square in `correctSquares` must be found, any order (e.g. "find all four knights"). */
  mode: 'any' | 'all'
  correctSquares: string[]
  prompt: string
  wrongText: string
  hintText: string
  revealSquaresFrom: 'start' | 'hint'
  correctText: string
  emphasizeCoordinates?: boolean
}

export interface BoardYesNoStep {
  kind: 'yesNo'
  stageLabel: string
  /** Whether THIS presentation (rendered via a plain, deliberately correct-or-flipped checkerboard, not the real board — see SimpleCheckerboard below) is actually the correctly-oriented board. */
  boardIsCorrect: boolean
  prompt: string
  correctText: string
  wrongText: string
}

export type BoardLessonStep = BoardDemoStep | BoardSquareQuizStep | BoardYesNoStep

export interface BoardLessonExample {
  steps: BoardLessonStep[]
  /** Default position for the lesson — nothing here ever moves a piece, only clicks/observes it. A step can override this with its own `fen`. */
  fen: string
  lessonName: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'wrong'

// `answered` highlights the bottom-right square once the player has picked
// Yes/No — the concrete visual referent for "light on the right"/"dark on
// the right" prompts, instead of leaving the reasoning to the text alone.
function SimpleCheckerboard({ correct, answered }: { correct: boolean; answered: boolean }) {
  const cells = []
  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      let isLight = (fileIdx + rank) % 2 === 0
      if (!correct) isLight = !isLight
      const isBottomRight = rank === 1 && fileIdx === 7
      const cellClass = isLight ? styles.cellLight : styles.cellDark
      cells.push(
        <span
          key={`${fileIdx}-${rank}`}
          className={`${cellClass} ${answered && isBottomRight ? styles.cellAnswer : ''}`}
        />
      )
    }
  }
  return <div className={styles.simpleBoard}>{cells}</div>
}

export default function BoardLesson({
  example,
  nextCta,
  slug,
}: {
  example: BoardLessonExample
  nextCta?: { href: string; label: string }
  slug: string
}) {
  const { steps, fen, lessonName, completionSummary } = example
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [foundSquares, setFoundSquares] = useState<Set<string>>(new Set())
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setAttemptState('idle')
    setWrongAttempts(0)
    setFoundSquares(new Set())
  }, [stepIndex])

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!allDone) {
      setShowModal(false)
      return
    }
    const t = setTimeout(() => setShowModal(true), CELEBRATE_DURATION)
    return () => clearTimeout(t)
  }, [allDone])

  function advanceStep() {
    if (isLast) {
      setAllDone(true)
      markLessonCompleted(slug)
    } else setStepIndex((i) => i + 1)
  }

  function handleSquareClick(key: Key) {
    // Only 'correct' blocks further input (the step is already advancing).
    // A 'wrong' flash must NOT block the next click — nothing on this board
    // shows an in-flight wrong move to explain why a click did nothing, so a
    // quick correction (miss, then immediately click the right square) has
    // to register right away rather than silently eating that click for the
    // rest of the revert window.
    if (step.kind !== 'squareQuiz' || attemptState === 'correct') return
    const isCorrect = step.correctSquares.includes(key)
    if (flashTimer.current) clearTimeout(flashTimer.current)

    if (!isCorrect) {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      flashTimer.current = setTimeout(() => setAttemptState('idle'), REVERT_DELAY)
      return
    }

    if (step.mode === 'any') {
      setAttemptState('correct')
      advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
      return
    }

    setFoundSquares((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      if (next.size === step.correctSquares.length) {
        setAttemptState('correct')
        advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
      }
      return next
    })
  }

  function handleYesNo(answer: boolean) {
    if (step.kind !== 'yesNo' || attemptState !== 'idle') return
    if (answer === step.boardIsCorrect) {
      setAttemptState('correct')
      advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
    } else {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      flashTimer.current = setTimeout(() => setAttemptState('idle'), REVERT_DELAY)
    }
  }

  function handlePracticeAgain() {
    setStepIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  const hintTier = step.kind === 'squareQuiz' ? Math.min(wrongAttempts, 2) : 0
  const showHintSquares = step.kind === 'squareQuiz' && (step.revealSquaresFrom === 'start' || hintTier >= 2)

  let promptLines: string[]
  let stageLabel: string
  if (allDone) {
    promptLines = [`You learned ${lessonName}!`]
    stageLabel = 'COMPLETE'
  } else if (step.kind === 'demo') {
    promptLines = step.text
    stageLabel = step.stageLabel
  } else if (step.kind === 'yesNo') {
    stageLabel = step.stageLabel
    if (attemptState === 'correct') promptLines = [`✓ That's it! ${step.correctText}`]
    else if (attemptState === 'wrong') promptLines = [step.wrongText]
    else promptLines = [step.prompt]
  } else {
    stageLabel = step.stageLabel
    if (attemptState === 'correct') {
      promptLines = [`✓ That's it! ${step.correctText}`]
    } else if (step.mode === 'all' && foundSquares.size > 0) {
      promptLines = [step.prompt, `Found ${foundSquares.size} of ${step.correctSquares.length}.`]
    } else if (hintTier === 0) {
      promptLines = [step.prompt]
    } else if (hintTier === 1) {
      promptLines = [step.wrongText]
    } else {
      promptLines = ['Need a hint?', step.hintText]
    }
  }

  const highlightSquares =
    step.kind === 'demo'
      ? (step.highlightSquares as Key[] | undefined)
      : step.kind === 'squareQuiz'
        ? ([...foundSquares, ...(showHintSquares ? step.correctSquares : [])] as Key[])
        : undefined
  const celebrating = allDone && !showModal
  const displayFen = step.kind !== 'yesNo' && step.fen ? step.fen : fen

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          {step.kind === 'yesNo' ? (
            <SimpleCheckerboard correct={step.boardIsCorrect} answered={attemptState !== 'idle'} />
          ) : (
            <Board
              fen={displayFen}
              turnColor="white"
              dests={EMPTY_DESTS}
              // Only 'correct' locks the board (already advancing) — 'wrong'
              // must stay clickable, or chessground drops the very
              // corrective click a player makes right after a miss (it
              // won't bind mousedown at all while viewOnly, live per-click,
              // not just at mount — see the mount-effect comment above).
              viewOnly={step.kind === 'demo' || attemptState === 'correct' || allDone}
              highlightSquares={allDone ? undefined : highlightSquares}
              highlightColor="green"
              emphasizeCoordinates={step.emphasizeCoordinates}
              pulseHighlights={step.kind === 'squareQuiz' && attemptState === 'correct'}
              onSquareClick={step.kind === 'squareQuiz' ? handleSquareClick : undefined}
            />
          )}
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
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.round(((allDone ? steps.length : stepIndex + 1) / steps.length) * 100)}%` }}
          />
        </div>

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
          {!allDone && step.kind === 'yesNo' && attemptState === 'idle' && (
            <>
              <button type="button" className={styles.actionBtn} onClick={() => handleYesNo(true)}>
                Yes
              </button>
              <button type="button" className={styles.actionBtnGhost} onClick={() => handleYesNo(false)}>
                No
              </button>
            </>
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
            <p className={styles.modalTag}>✓ {lessonName} completed</p>
            <p className={styles.modalHeading}>🎉 You learned {lessonName}!</p>
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
