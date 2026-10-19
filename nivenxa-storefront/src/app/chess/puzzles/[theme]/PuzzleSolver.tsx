'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { applyRawMove } from '../../learn/_shared/moveTrainerLogic'
import { PIECE_NAME, attackedPiecesFrom } from '../../learn/_shared/moveSquares'
import type { PuzzleRow } from '@/lib/chess/puzzles'
import { logPuzzleAttempt } from '@/lib/chess/puzzleActions'
import styles from './PuzzleSolver.module.scss'

const REVERT_DELAY = 700
const CORRECT_DELAY = 500
const OPPONENT_REPLY_DELAY = 650
// How long a Show Solution demonstration plays before resetting back to let
// the learner try it themselves — same idea as TacticPuzzleSet.tsx's own
// DEMO_DELAY.
const DEMO_DELAY = 1200
// Wrong-attempt thresholds: show a plain-language hint first, then (one more
// wrong try later) actually point at the piece to move — never earlier, so
// solving without help still counts for something. Also the ceiling a
// manual Hint request can reach on its own (Show Solution is the step past
// this, not a 4th hint tier).
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

// The short, named objective shown before any attempt — "Find the best
// move" alone doesn't say what to look for; this does, per theme.
const THEME_OBJECTIVES: Record<string, string> = {
  fork: 'Find a move that attacks two pieces at once.',
  pin: "Find a move that stops an enemy piece from safely moving away.",
  skewer: "Find a check or attack that forces a valuable piece to move, uncovering a weaker one behind it.",
  discoveredAttack: 'Find a move that uncovers an attack from another piece.',
  hangingPiece: "Find the enemy piece that isn't protected.",
  backRankMate: "Find the check the king can't escape.",
  endgame: 'Find the move that helps your pawn or king the most.',
}
const DEFAULT_OBJECTIVE = 'Find the best move.'

// Singular, speakable name for "Look for {this}. Find the first move." —
// THEME_LABELS is plural ("Forks"), which doesn't fit that sentence shape.
const THEME_SINGULAR: Record<string, string> = {
  fork: 'a fork',
  pin: 'a pin',
  skewer: 'a skewer',
  discoveredAttack: 'a discovered attack',
  hangingPiece: 'a hanging piece',
  backRankMate: 'a back-rank mate',
  endgame: 'an endgame technique',
  mateIn1: 'a mate in one',
  mateIn2: 'a mate in two',
  doubleCheck: 'a double check',
  deflection: 'a deflection',
  sacrifice: 'a sacrifice',
  capturingDefender: 'a way to remove the defender',
  intermezzo: 'an in-between move',
  clearance: 'a clearance move',
  attraction: 'a decoy',
  interference: 'an interference',
  trappedPiece: 'a trapped piece',
}

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

  const { fen, turn, dests, isCheck, isCheckmate, makeMove, reset, undo } = useChessGame(puzzle.fen)

  const [solutionIndex, setSolutionIndex] = useState(0)
  const [attemptState, setAttemptState] = useState<'idle' | 'correct' | 'wrong' | 'demonstrating'>('idle')
  const [wrongFlashFen, setWrongFlashFen] = useState<string | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [solved, setSolved] = useState(false)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  // Set by a manual Hint request — kept separate from the automatic
  // wrongAttempts-driven tier (never regresses it, see `hintTier` below) so
  // asking for a hint doesn't erase progress a wrong attempt already made
  // toward one.
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  const startedAtRef = useRef(Date.now())
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Shared by the puzzleIndex-change effect and the manual "Try again"
  // button — one body, so the two can never drift apart.
  function resetPuzzleAttempt() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    reset()
    if (setupMove) makeMove(setupMove.from, setupMove.to, setupMove.promotion ?? 'q')
    setSolutionIndex(0)
    setAttemptState('idle')
    setWrongFlashFen(null)
    setWrongAttempts(0)
    setSolved(false)
    setLastMove(undefined)
    setForcedHintTier(null)
    startedAtRef.current = Date.now()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on puzzleIndex only; resetPuzzleAttempt/reset/makeMove/setupMove all change together with it
  useEffect(() => {
    resetPuzzleAttempt()
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
  // during the correct/wrong flash, a demonstration, or the opponent's reply.
  const canShowHint = attemptState === 'idle' && isPlayerTurn && !solved
  const expectedMove = solutionMoves[solutionIndex]
  // 1: the objective text (same as the automatic behavior always had). 2:
  // names the piece — new, manual-only (never triggered by wrong attempts
  // alone, since naming the piece outright is a bigger assist than the
  // plain-language hint was). 3: today's destination highlight. Math.max,
  // not a replacement — a manual Hint request never regresses the
  // automatic wrongAttempts-driven tier.
  const automaticTier = wrongAttempts >= HINT_HIGHLIGHT_AFTER_ATTEMPTS ? 3 : wrongAttempts >= HINT_TEXT_AFTER_ATTEMPTS ? 1 : 0
  const hintTier = Math.max(forcedHintTier ?? 0, automaticTier)
  const showHintText = canShowHint && hintTier >= 1
  const showPieceHint = canShowHint && hintTier >= 2 && !!expectedMove
  const showHintHighlight = canShowHint && hintTier >= 3 && !!expectedMove
  const hintPieceName = expectedMove ? PIECE_NAME[new Chess(fen).get(expectedMove.from as Parameters<Chess['get']>[0])?.type ?? ''] : undefined

  function requestHint() {
    if (!canShowHint) return
    setForcedHintTier((t) => Math.min((t ?? automaticTier) + 1, 3))
  }

  // Plays the expected move for real (so the board shows it exactly as it
  // would happen), holds it for a beat, then undoes it — never marks the
  // puzzle solved, and the correct-square highlight (from forcedHintTier)
  // is still showing once it reverts, so the learner's own retry has that
  // aid in place. Same pattern as TacticPuzzleSet.tsx's Show Me.
  function requestShowMe() {
    if (!canShowHint || !expectedMove) return
    setForcedHintTier(3)
    setAttemptState('demonstrating')
    const result = makeMove(expectedMove.from, expectedMove.to, expectedMove.promotion ?? 'q')
    if (result) setLastMove([expectedMove.from as Key, expectedMove.to as Key])
    if (revertTimer.current) clearTimeout(revertTimer.current)
    revertTimer.current = setTimeout(() => {
      undo()
      setAttemptState('idle')
      setLastMove(undefined)
    }, DEMO_DELAY)
  }

  // A full, on-demand restart of this puzzle — not just the automatic
  // revert a single wrong move already gets.
  function requestTryAgain() {
    resetPuzzleAttempt()
  }

  const playerColorLabel = playerColor === 'w' ? 'White' : 'Black'
  const opponentColorLabel = playerColorLabel === 'White' ? 'Black' : 'White'
  const isMultiMove = solutionMoves.length > 1
  const correctButContinues = attemptState === 'correct' && solutionIndex + 1 < solutionMoves.length

  // Generated from the actual solution, not a canned sentence — for a fork,
  // names the attacking piece and both real targets (and, when one of them
  // is the king, spells out why the other is now winnable). Every other
  // theme keeps a plain acknowledgement for now; giving them the same
  // generated treatment is future work, not silently dropped.
  const solvedExplanation = useMemo(() => {
    if (!solved || !lastMove) return 'Solved!'
    if (theme !== 'fork') return `You found it! That's ${THEME_SINGULAR[theme] ?? 'the idea'}.`
    const attacker = new Chess(fen).get(lastMove[1] as Parameters<Chess['get']>[0])
    const targets = attackedPiecesFrom(fen, lastMove[1])
    if (!attacker || targets.length < 2) return 'You found the fork!'
    const attackerName = PIECE_NAME[attacker.type] ?? 'piece'
    const [t1, t2] = targets
    const base = `Your ${attackerName} attacks the ${PIECE_NAME[t1.type] ?? 'piece'} and ${PIECE_NAME[t2.type] ?? 'piece'}.`
    const kingTarget = targets.find((t) => t.type === 'k')
    const otherTarget = targets.find((t) => t.type !== 'k')
    return kingTarget && otherTarget
      ? `${base} The king must escape, so you can win the ${PIECE_NAME[otherTarget.type] ?? 'piece'}.`
      : base
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on solved/lastMove/theme only; fen is read fresh via closure at the moment solved flips, which is when this needs to run.
  }, [solved, lastMove, theme])

  const solvedHighlightSquares = useMemo((): Key[] | undefined => {
    if (!solved || !lastMove || theme !== 'fork') return undefined
    const targets = attackedPiecesFrom(fen, lastMove[1])
    if (targets.length < 2) return undefined
    return [lastMove[1], ...targets.map((t) => t.square)] as Key[]
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same reasoning as solvedExplanation above.
  }, [solved, lastMove, theme])

  let statusText: string
  if (solved) statusText = solvedExplanation
  else if (attemptState === 'demonstrating') statusText = 'Watch the solution…'
  else if (attemptState === 'correct') statusText = correctButContinues ? `Good move! Now watch ${opponentColorLabel}'s reply.` : 'Got it!'
  else if (attemptState === 'wrong') statusText = THEME_OBJECTIVES[theme] ? `Not quite. ${THEME_OBJECTIVES[theme]}` : 'Not quite — try again.'
  else if (!isPlayerTurn) statusText = 'Nivenxa is replying…'
  else if (isMultiMove && solutionIndex === 0) statusText = `Look for ${THEME_SINGULAR[theme] ?? 'the idea'}. Find the first move.`
  else if (isMultiMove && solutionIndex > 0) statusText = 'Your turn again. Finish the tactic.'
  else statusText = THEME_OBJECTIVES[theme] ?? DEFAULT_OBJECTIVE

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
            highlightSquares={solved ? solvedHighlightSquares : showHintHighlight ? [expectedMove.from as Key] : undefined}
            highlightColor="yellow"
            onMove={handleMove}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <Link href="/chess/puzzles" className={styles.backLink}>
          ← All puzzles
        </Link>

        <p className={styles.stageIndicator}>
          Puzzle {puzzleIndex + 1} of {puzzles.length} · {themeLabel} · Rating {puzzle.rating}
        </p>
        <p className={styles.turnLabel}>{playerColorLabel} to move</p>
        {/* The fuller explanation only on the first puzzle of the set — it
            doesn't need repeating once the learner already knows which side
            they're playing and why. */}
        {isFirstPuzzle && (
          <p className={styles.colorIndicator}>
            You&rsquo;re playing <strong>{playerColorLabel}</strong> — the board is set up from your side.
          </p>
        )}

        <div className={`${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''}`}>
          <p className={styles.promptText}>{statusText}</p>
          {showHintText && (
            <p className={styles.hintText}>
              Hint: {showPieceHint ? `Try using your ${hintPieceName ?? 'piece'}.` : THEME_HINTS[theme] ?? DEFAULT_HINT}
              {showHintHighlight && " The highlighted square shows the piece to move."}
            </p>
          )}
        </div>

        {solved && isLastPuzzle && <p className={styles.doneText}>You&rsquo;ve completed this set!</p>}

        {isCheckmate && !solved && <p className={styles.hintText}>Checkmate — that&rsquo;s the winning line.</p>}

        {/* Hint / Show solution / Try again — the primary help cluster now,
            not Skip (which used to be the strongest action on an unsolved
            puzzle). All three stay available throughout; Hint and Show
            solution are no-ops once the puzzle's solved or mid-reply. */}
        {!solved && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} onClick={requestHint} disabled={!canShowHint || hintTier >= 3}>
              💡 Hint
            </button>
            <button type="button" className={styles.actionBtn} onClick={requestShowMe} disabled={!canShowHint}>
              👀 Show solution
            </button>
            <button type="button" className={styles.actionBtn} onClick={requestTryAgain}>
              ↺ Try again
            </button>
          </div>
        )}

        {/* Always available, not just once solved — stuck on a puzzle, skip
            ahead; want another look at an earlier one, go back. Revisiting a
            puzzle this way restarts it fresh (no memory of a prior solve).
            Skip reads as secondary now — Hint/Show solution/Try again above
            are the stronger, encouraged actions on an unsolved puzzle. */}
        <div className={styles.actions}>
          <button type="button" className={styles.actionBtnGhost} onClick={handlePrevPuzzle} disabled={isFirstPuzzle}>
            ← Previous
          </button>
          {isLastPuzzle && solved ? (
            <Link href="/chess/puzzles" className={styles.actionBtn}>
              Back to Puzzles
            </Link>
          ) : (
            <button
              type="button"
              className={solved ? styles.actionBtn : styles.actionBtnGhost}
              onClick={handleNextPuzzle}
              disabled={isLastPuzzle}
            >
              {solved ? 'Next puzzle →' : 'Skip →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
