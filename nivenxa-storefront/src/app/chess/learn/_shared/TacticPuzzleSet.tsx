'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { PIECE_NAME } from './moveSquares'
import styles from './TacticPuzzleSet.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
// Beat before a wrong attempt snaps back, and before a correct one advances
// to the next puzzle — matches PracticePanel's own timing.
const REVERT_DELAY = 700
const ADVANCE_DELAY = 1100
const CELEBRATE_DURATION = 1300

export interface TacticPuzzleConfig {
  fen: string
  correctFrom: string
  correctTo: string
}

export interface TacticPuzzleSetExample {
  /** Exactly 3, in order. */
  puzzles: TacticPuzzleConfig[]
  /** Shown at rest, e.g. "Can you find the fork?" — same across all 3 puzzles. */
  prompt: string
  /** Tier-1 wrong-attempt text, e.g. "Not quite. Look for a move that attacks two pieces." */
  wrongText: string
  /** What the correct move demonstrated, e.g. "Your knight attacks two pieces." (no "That's it!" prefix — added by the component). */
  correctText: string
  tacticName: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting'

export default function TacticPuzzleSet({
  example,
  nextCta,
}: {
  example: TacticPuzzleSetExample
  nextCta?: { href: string; label: string }
}) {
  const { puzzles, prompt, wrongText, correctText, tacticName, completionSummary } = example
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const puzzle = puzzles[puzzleIndex]

  const [displayFen, setDisplayFen] = useState(puzzle.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `puzzle` is derived from puzzleIndex; re-running on puzzle identity would be redundant.
  useEffect(() => {
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
  }, [puzzleIndex])

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

  const pieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(puzzle.correctFrom as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, puzzle.correctFrom])

  const dests = useMemo(() => {
    if (attemptState !== 'idle') return EMPTY_DESTS
    const chess = new Chess(puzzle.fen)
    const map = new Map<Key, Key[]>()
    for (const move of chess.moves({ verbose: true })) {
      const arr = map.get(move.from as Key) ?? []
      arr.push(move.to as Key)
      map.set(move.from as Key, arr)
    }
    return map
  }, [puzzle.fen, attemptState])

  function handleMove(from: Key, to: Key) {
    if (attemptState !== 'idle') return
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from, to, promotion: 'q' })
    if (!result) return
    setLastMove([from, to])
    setDisplayFen(chess.fen())

    if (from === puzzle.correctFrom && to === puzzle.correctTo) {
      setAttemptState('correct')
      advanceTimer.current = setTimeout(() => {
        if (puzzleIndex === puzzles.length - 1) setAllDone(true)
        else setPuzzleIndex((i) => i + 1)
      }, ADVANCE_DELAY)
      return
    }

    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(() => {
      setDisplayFen(puzzle.fen)
      setAttemptState('idle')
      setLastMove(undefined)
    }, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    setPuzzleIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  // 1st wrong: text only. 2nd: the piece-name hint. 3rd+: hint plus the piece highlighted.
  const hintTier = Math.min(wrongAttempts, 3)

  let promptLines: string[]
  if (allDone) {
    promptLines = [`You learned ${tacticName}!`]
  } else if (attemptState === 'correct') {
    promptLines = [`✓ That's it! ${correctText}`]
  } else if (hintTier === 0) {
    promptLines = [prompt]
  } else if (hintTier === 1) {
    promptLines = [wrongText]
  } else {
    promptLines = ['Need a hint?', `Try using your ${pieceName}.`]
  }

  const highlightSquares = hintTier >= 3 && attemptState === 'idle' ? [puzzle.correctFrom as Key] : undefined
  const celebrating = allDone && !showModal

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={displayFen}
            turnColor={puzzle.fen.split(' ')[1] === 'b' ? 'black' : 'white'}
            dests={dests}
            viewOnly={attemptState !== 'idle' || allDone}
            lastMove={lastMove}
            highlightSquares={highlightSquares}
            highlightColor="green"
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
        <p className={styles.puzzleIndicator}>{allDone ? 'Complete' : `Puzzle ${puzzleIndex + 1} of ${puzzles.length}`}</p>

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

        {allDone && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtnGhost} onClick={handlePracticeAgain}>
              Practice again
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTag}>✓ {tacticName} completed</p>
            <p className={styles.modalHeading}>🎉 You learned {tacticName}!</p>
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
              <Link href="/chess/learn/tactics" className={styles.modalSecondary}>
                Back to Tactics
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
