'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { computeMoveSquares, PIECE_NAME } from './moveSquares'
import styles from './PracticePanel.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
// Beat before the opponent's reply auto-plays, and before a wrong attempt snaps back —
// long enough to read as "held", short enough not to feel laggy.
const AUTO_PLAY_DELAY = 650
const REVERT_DELAY = 700
// How long the on-board celebration plays before the completion modal appears.
const CELEBRATE_DURATION = 1300

export interface PracticeExample {
  openingName: string
  /** The name with whatever article reads naturally in front of it ("the Italian Game" vs "Petrov's Defence") — used wherever the name appears mid-sentence. */
  openingWithArticle: string
  moves: string[]
  /** Which side the learner plays — the opponent's moves auto-play. */
  learnerColor: 'w' | 'b'
  /** A short "this is the X!" aside per move, aligned by index with `moves` — reused here to reinforce the defining move the moment the learner plays it correctly. */
  stepReveal?: (string | undefined)[]
  /** Shown in the completion modal — one idea per line, like the Learn tab's completion card. */
  completionSummary?: string[]
  /** The next opening on the learning path, if any — offered as the modal's primary action. */
  nextOpening?: { slug: string; name: string }
}

type AttemptState = 'idle' | 'correct' | 'reverting'

export default function PracticePanel({
  example,
  onBackToLearn,
}: {
  example: PracticeExample
  onBackToLearn: () => void
}) {
  const { openingName, openingWithArticle, moves, learnerColor, stepReveal, completionSummary, nextOpening } = example
  const moveSquares = useMemo(() => computeMoveSquares(moves), [moves])

  const { fen, turn, history, dests: liveDests, makeMove, undo, reset } = useChessGame()
  const moveIndex = history.length
  const complete = moveIndex >= moves.length
  const isLearnerTurn = !complete && turn === learnerColor

  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
    }
  }, [])

  // A brief on-board celebration plays first; the modal follows once it's done.
  useEffect(() => {
    if (!complete) {
      setShowModal(false)
      return
    }
    const timer = setTimeout(() => setShowModal(true), CELEBRATE_DURATION)
    return () => clearTimeout(timer)
  }, [complete])

  // Auto-play the opponent's reply a beat after the learner's correct move.
  useEffect(() => {
    // Guarding on isLearnerTurn alone isn't enough: a *wrong* learner move also
    // flips the real chess.js turn (it's a legal move, just not the scripted
    // one), which would otherwise make this effect mistake "awaiting revert"
    // for "genuinely the opponent's turn" and auto-play on top of it.
    if (complete || isLearnerTurn || attemptState === 'reverting') return
    const next = moveSquares[moveIndex]
    if (!next) return
    autoPlayTimer.current = setTimeout(() => {
      makeMove(next.from, next.to)
      setLastMove([next.from, next.to])
      setAttemptState('idle')
    }, AUTO_PLAY_DELAY)
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
    }
  }, [complete, isLearnerTurn, attemptState, moveIndex, moveSquares, makeMove])

  function handleMove(from: Key, to: Key) {
    if (!isLearnerTurn || attemptState === 'reverting') return
    const result = makeMove(from, to)
    if (!result) return
    setLastMove([from, to])
    if (result.san === moves[moveIndex]) {
      setAttemptState('correct')
      setWrongAttempts(0)
      return
    }
    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    const priorIndex = moveIndex
    revertTimer.current = setTimeout(() => {
      undo()
      setAttemptState('idle')
      setLastMove(priorIndex > 0 ? [moveSquares[priorIndex - 1].from, moveSquares[priorIndex - 1].to] : undefined)
    }, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    reset()
    setWrongAttempts(0)
    setAttemptState('idle')
    setLastMove(undefined)
    setShowModal(false)
  }

  const learnerLabel = learnerColor === 'w' ? 'White' : 'Black'
  const opponentLabel = learnerColor === 'w' ? 'Black' : 'White'
  const expected = !complete ? moveSquares[moveIndex] : undefined
  // Caps at 3 — the "let's find it together" hint stays showing for any further miss.
  const hintTier = Math.min(wrongAttempts, 3)

  const interactive = isLearnerTurn && attemptState !== 'reverting'
  const boardDests = interactive ? liveDests : EMPTY_DESTS

  // A wrong attempt also flips the real turn (see the auto-play effect above),
  // so "awaiting learner input" is (isLearnerTurn || reverting) — not
  // isLearnerTurn alone — and takes priority over the opponent-replying copy.
  const awaitingLearner = isLearnerTurn || attemptState === 'reverting'

  let promptLines: string[]
  if (complete) {
    promptLines = [`You played ${openingWithArticle} yourself!`, 'Well done.']
  } else if (attemptState === 'correct') {
    const justPlayedReveal = stepReveal?.[moveIndex - 1]
    // "This is the X!" (an opening's identity moment) folds into one punchy line;
    // any other reveal (e.g. teaching a term — "This is called a pin.") just
    // follows the normal confirmation on its own line instead of being mangled.
    const identityMatch = justPlayedReveal?.match(/^This is (the .+)!$/)
    promptLines = identityMatch ? [`✓ That's ${identityMatch[1]}!`] : justPlayedReveal ? ["✓ That's it!", justPlayedReveal] : ["That's it!"]
  } else if (!awaitingLearner) {
    promptLines = [`${opponentLabel} is replying...`]
  } else if (hintTier === 0) {
    promptLines =
      moveIndex === 0 ? [`${learnerLabel} to move.`, `What should ${learnerLabel} play?`] : [`What should ${learnerLabel} play next?`]
  } else if (hintTier === 1) {
    promptLines = ['Not quite. Try again!', 'Think about the opening you just learned.']
  } else if (hintTier === 2) {
    promptLines = ['Need a hint?', `Try moving your ${expected ? PIECE_NAME[expected.piece] : 'piece'}.`]
  } else {
    promptLines = ["Let's find it together."]
  }

  const highlightSquares = hintTier === 2 && expected ? [expected.from] : undefined
  const hintArrow = hintTier >= 3 && expected ? [expected.from, expected.to] : undefined
  const celebrating = complete && !showModal

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={fen}
            turnColor={turn === 'w' ? 'white' : 'black'}
            dests={boardDests}
            orientation={learnerColor === 'b' ? 'black' : 'white'}
            viewOnly={!interactive}
            lastMove={lastMove}
            highlightSquares={highlightSquares}
            hintArrow={hintArrow}
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
        <p className={styles.heading}>Can you play {openingWithArticle}?</p>

        <div
          className={`${styles.promptCard} ${complete ? styles.promptCardDone : ''} ${
            attemptState === 'correct' ? styles.promptCardCorrect : ''
          }`}
        >
          {promptLines.map((line, i) => (
            <p key={i} className={styles.promptText}>
              {line}
            </p>
          ))}
        </div>

        <div className={styles.actions}>
          {complete && (
            <button type="button" className={styles.actionBtn} onClick={handlePracticeAgain}>
              Practice again
            </button>
          )}
          <button type="button" className={styles.actionBtnGhost} onClick={onBackToLearn}>
            ← Back to learning
          </button>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTag}>✓ {openingName} completed</p>
            <p className={styles.modalHeading}>🎉 You learned {openingWithArticle}!</p>
            {(completionSummary ?? ['You played every move yourself.']).map((line, i) => (
              <p key={i} className={styles.modalBody}>
                {line}
              </p>
            ))}
            <div className={styles.modalActions}>
              {nextOpening && (
                <Link href={`/chess/learn/openings/${nextOpening.slug}`} className={styles.modalPrimary}>
                  Learn {nextOpening.name} next →
                </Link>
              )}
              <Link href="/chess/learn/openings" className={styles.modalSecondary}>
                Back to Openings
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
