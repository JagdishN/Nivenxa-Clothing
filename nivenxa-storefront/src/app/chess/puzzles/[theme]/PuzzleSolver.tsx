'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { applyRawMove } from '../../learn/_shared/moveTrainerLogic'
import type { PuzzleRow } from '@/lib/chess/puzzles'
import { logPuzzleAttempt } from '@/lib/chess/puzzleActions'
import styles from './PuzzleSolver.module.scss'

const REVERT_DELAY = 700
const CORRECT_DELAY = 500
const OPPONENT_REPLY_DELAY = 650
// Wrong-attempt thresholds: show a plain-language hint first, then (one more
// wrong try later) actually point at the piece to move — never earlier, so
// solving without help still counts for something.
const HINT_TEXT_AFTER_ATTEMPTS = 2
const HINT_HIGHLIGHT_AFTER_ATTEMPTS = 3

interface ParsedMove {
  from: string
  to: string
  promotion?: string
}

function parseUci(uci: string): ParsedMove {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4, 5) : undefined }
}

/**
 * Plain-language, beginner-first hints — deliberately avoid chess jargon
 * ("material", "forcing") in favor of describing what to look for on the
 * board. Keyed by the puzzle's own theme slug (see PUZZLE_THEMES in
 * lib/chess/puzzles.ts); the fallback covers any future theme added there
 * before a matching hint is written here.
 */
const THEME_HINTS: Record<string, string> = {
  fork: 'Look for one of your pieces that can attack two enemy pieces at the same time.',
  pin: "Look for an enemy piece that can't safely move because a more valuable piece is right behind it.",
  skewer: 'Look for a check or attack that forces a valuable enemy piece to move out of the way, exposing a less valuable one behind it.',
  discoveredAttack: 'Try moving one of your pieces out of the way so a piece behind it can attack.',
  hangingPiece: "One of your opponent's pieces isn't protected — look for a way to capture it for free.",
  backRankMate: "Your opponent's king is stuck on the back row with no escape squares — look for a check it can't get away from.",
  endgame: 'Look for a way to push a pawn forward or bring your king closer to the action.',
}
const DEFAULT_HINT = 'Look at each of your pieces and see what they can attack or defend.'

/**
 * Constrained-move puzzle solving: the board itself is NOT restricted to only
 * the correct square (that would spoil which piece to move before the player
 * even tries) — `dests` stays the full set of chess.js-legal moves, exactly
 * like `PieceLesson`'s "your turn" steps. What's constrained is which of
 * those legal moves counts as correct: a match against the puzzle's solution
 * commits and advances; anything else is shown briefly (via the same
 * `applyRawMove` non-committing-preview trick PieceLesson/BoardLesson use)
 * and then reverted — never actually applied to the real chess.js position.
 */
export default function PuzzleSolver({ puzzles, themeLabel, theme }: { puzzles: PuzzleRow[]; themeLabel: string; theme: string }) {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const puzzle = puzzles[puzzleIndex]

  const parsedMoves = useMemo(() => puzzle.moves.trim().split(/\s+/).map(parseUci), [puzzle])
  const setupMove = parsedMoves[0]
  const solutionMoves = useMemo(() => parsedMoves.slice(1), [parsedMoves])
  // The FEN's own side-to-move plays the setup move; the solver is the other side.
  const playerColor: 'w' | 'b' = puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w'

  const { fen, turn, dests, isCheck, isCheckmate, makeMove, reset } = useChessGame(puzzle.fen)

  const [solutionIndex, setSolutionIndex] = useState(0)
  const [attemptState, setAttemptState] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [wrongFlashFen, setWrongFlashFen] = useState<string | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [solved, setSolved] = useState(false)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const startedAtRef = useRef(Date.now())
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on puzzleIndex only; reset/makeMove/setupMove all change together with it
  useEffect(() => {
    reset()
    if (setupMove) makeMove(setupMove.from, setupMove.to, setupMove.promotion ?? 'q')
    setSolutionIndex(0)
    setAttemptState('idle')
    setWrongFlashFen(null)
    setWrongAttempts(0)
    setSolved(false)
    setLastMove(undefined)
    startedAtRef.current = Date.now()
  }, [puzzleIndex])

  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    []
  )

  function playOpponentReply(index: number) {
    const mv = solutionMoves[index]
    if (!mv) return
    advanceTimer.current = setTimeout(() => {
      const result = makeMove(mv.from, mv.to, mv.promotion ?? 'q')
      if (result) setLastMove([mv.from as Key, mv.to as Key])
      setSolutionIndex(index + 1)
    }, OPPONENT_REPLY_DELAY)
  }

  function handleMove(from: Key, to: Key) {
    if (attemptState !== 'idle' || solved || turn !== playerColor) return
    const expected = solutionMoves[solutionIndex]
    if (!expected) return

    if (expected.from === from && expected.to === to) {
      const result = makeMove(from, to, expected.promotion ?? 'q')
      if (!result) return
      setLastMove([from, to])
      setAttemptState('correct')
      advanceTimer.current = setTimeout(() => {
        setAttemptState('idle')
        const next = solutionIndex + 1
        if (next >= solutionMoves.length) {
          setSolved(true)
          const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          logPuzzleAttempt({ puzzleId: puzzle.id, solved: true, timeTakenSeconds: elapsed })
        } else {
          setSolutionIndex(next)
          playOpponentReply(next)
        }
      }, CORRECT_DELAY)
      return
    }

    setWrongFlashFen(applyRawMove(fen, from, to))
    setAttemptState('wrong')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(() => {
      setWrongFlashFen(null)
      setAttemptState('idle')
    }, REVERT_DELAY)
  }

  function handleNextPuzzle() {
    setPuzzleIndex((i) => Math.min(i + 1, puzzles.length - 1))
  }

  function handlePrevPuzzle() {
    setPuzzleIndex((i) => Math.max(i - 1, 0))
  }

  const isFirstPuzzle = puzzleIndex === 0
  const isLastPuzzle = puzzleIndex === puzzles.length - 1
  const isPlayerTurn = turn === playerColor
  const boardFen = wrongFlashFen ?? fen
  const boardDests = attemptState === 'idle' && isPlayerTurn && !solved ? dests : new Map<Key, Key[]>()
  const viewOnly = attemptState !== 'idle' || !isPlayerTurn || solved

  // Only meaningful while it's genuinely the player's move to make — never
  // during the correct/wrong flash or the opponent's own reply.
  const canShowHint = attemptState === 'idle' && isPlayerTurn && !solved
  const expectedMove = solutionMoves[solutionIndex]
  const showHintText = canShowHint && wrongAttempts >= HINT_TEXT_AFTER_ATTEMPTS
  const showHintHighlight = canShowHint && wrongAttempts >= HINT_HIGHLIGHT_AFTER_ATTEMPTS && !!expectedMove

  const playerColorLabel = playerColor === 'w' ? 'White' : 'Black'

  let statusText: string
  if (solved) statusText = 'Solved!'
  else if (attemptState === 'correct') statusText = 'Correct!'
  else if (attemptState === 'wrong') statusText = 'Not quite — try again.'
  else if (!isPlayerTurn) statusText = 'Nivenxa is replying…'
  else statusText = `Find the best move for ${playerColorLabel}.`

  return (
    <div className={styles.layout}>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={boardFen}
            turnColor={turn === 'w' ? 'white' : 'black'}
            dests={boardDests}
            orientation={playerColor === 'w' ? 'white' : 'black'}
            viewOnly={viewOnly}
            check={isCheck ? (turn === 'w' ? 'white' : 'black') : false}
            lastMove={lastMove}
            highlightSquares={showHintHighlight ? [expectedMove.from as Key] : undefined}
            highlightColor="yellow"
            onMove={handleMove}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <p className={styles.stageIndicator}>
          Puzzle {puzzleIndex + 1} of {puzzles.length} · {themeLabel} · Rating {puzzle.rating}
        </p>
        <p className={styles.colorIndicator}>
          You&rsquo;re playing <strong>{playerColorLabel}</strong> — the board is set up from your side.
        </p>

        <div className={`${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''}`}>
          <p className={styles.promptText}>{statusText}</p>
          {showHintText && (
            <p className={styles.hintText}>
              Hint: {THEME_HINTS[theme] ?? DEFAULT_HINT}
              {showHintHighlight && " The highlighted square shows the piece to move."}
            </p>
          )}
        </div>

        {solved && isLastPuzzle && <p className={styles.doneText}>You&rsquo;ve completed this set!</p>}

        {isCheckmate && !solved && <p className={styles.hintText}>Checkmate — that&rsquo;s the winning line.</p>}

        {/* Always available, not just once solved — stuck on a puzzle, skip
            ahead; want another look at an earlier one, go back. Revisiting a
            puzzle this way restarts it fresh (no memory of a prior solve). */}
        <div className={styles.actions}>
          <button type="button" className={styles.actionBtnGhost} onClick={handlePrevPuzzle} disabled={isFirstPuzzle}>
            ← Previous
          </button>
          {isLastPuzzle && solved ? (
            <Link href="/chess/puzzles" className={styles.actionBtn}>
              Back to Puzzles
            </Link>
          ) : (
            <button type="button" className={styles.actionBtn} onClick={handleNextPuzzle} disabled={isLastPuzzle}>
              {solved ? 'Next puzzle →' : 'Skip →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
