'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import Toast from '@/components/global/Toast/Toast'
import { useChessGame } from '@/lib/chess/useChessGame'
import { applyRawMove } from '../../learn/_shared/moveTrainerLogic'
import type { DifficultyLevel, PuzzleRow } from '@/lib/chess/puzzles'
import { logPuzzleAttempt } from '@/lib/chess/puzzleActions'
import {
  buildHints,
  classifyOutcome,
  colorName,
  explainSolution,
  explainWrongMove,
  judgeMove,
  mateLength,
  objectiveText,
  topicRelation,
  parseUci,
  type PuzzleOutcome,
  type UciMove,
} from '@/lib/chess/puzzleLogic'
import styles from './PuzzleSolver.module.scss'

const REVERT_DELAY = 900
const CORRECT_DELAY = 500
const OPPONENT_REPLY_DELAY = 650
const PLAYBACK_STEP_DELAY = 800
const NAV_GUARD_MS = 450
// Automatic hints after wrong tries: the idea after this many, the piece one try later — never
// earlier, so solving unaided still counts for something. Show solution is the step past tier 3.
const HINT_IDEA_AFTER_ATTEMPTS = 2
const HINT_PIECE_AFTER_ATTEMPTS = 3

/** Supplementary one-line idea per theme, appended to the position-specific hint only for non-mate puzzles. */
const THEME_HINTS: Record<string, string> = {
  fork: 'Look for one of your pieces that can attack two enemy pieces at the same time.',
  pin: "Look for an enemy piece that can't safely move because a more valuable piece is right behind it.",
  skewer: 'Look for a check or attack that forces a valuable enemy piece to move out of the way, exposing a less valuable one behind it.',
  discoveredAttack: 'Try moving one of your pieces out of the way so a piece behind it can attack.',
  hangingPiece: "One of your opponent's pieces isn't protected — look for a way to capture it for free.",
  backRankMate: "Your opponent's king is stuck on the back row with no escape squares — look for a check it can't get away from.",
  endgame: 'Look for a way to push a pawn forward or bring your king closer to the action.',
}

/** The short, named objective — "Find the best move" alone doesn't say what to look for. */
const THEME_OBJECTIVES: Record<string, string> = {
  fork: 'Find the fork: a move that attacks two pieces at once.',
  pin: 'Find the pin: a move that stops an enemy piece from safely moving away.',
  skewer: 'Find the skewer: a check or attack that forces a valuable piece to move, uncovering a weaker one behind it.',
  discoveredAttack: 'Find a move that uncovers an attack from another piece.',
  hangingPiece: "Find the enemy piece that isn't protected.",
  backRankMate: "Find the check the king can't escape.",
  endgame: 'Find the move that helps your pawn or king the most.',
  doubleCheck: 'Find the double check.',
  deflection: 'Find the move that pulls a defender away from its job.',
  sacrifice: 'Find the sacrifice that wins.',
}
const DEFAULT_OBJECTIVE = 'Find the best move.'

/** The move the solver is looking for now: the stored one while on the stored line, else any mating move from this position. */
function findExpectedMove(offScript: boolean, stored: UciMove | null, fen: string): UciMove | null {
  if (!offScript) return stored
  const g = new Chess(fen)
  for (const mv of g.moves({ verbose: true })) {
    const t = new Chess(fen)
    t.move(mv)
    if (t.isCheckmate()) return { from: mv.from, to: mv.to, promotion: mv.promotion }
  }
  return null
}

type AttemptState = 'idle' | 'correct' | 'wrong' | 'playback'

/** Which route the player is on: the page-level wrapper only owns the puzzle index; every attempt's state lives (and resets) in PuzzleBoard. */
export default function PuzzleSolver({
  puzzles,
  themeLabel,
  theme,
  level,
  startAtLichessId,
}: {
  puzzles: PuzzleRow[]
  themeLabel: string
  theme: string
  level: DifficultyLevel
  /** From My Activity → Retry: open on this puzzle (when it is in this topic/level), otherwise on the first. */
  startAtLichessId?: string
}) {
  const [puzzleIndex, setPuzzleIndex] = useState(() => {
    const at = startAtLichessId ? puzzles.findIndex((p) => p.lichess_puzzle_id === startAtLichessId) : -1
    return at >= 0 ? at : 0
  })
  const puzzle = puzzles[puzzleIndex]
  const puzzlesHref = level === 'all' ? '/chess/puzzles' : `/chess/puzzles?level=${level}`

  // Keyed on the puzzle id: moving to another puzzle unmounts the old board, which clears its timers and
  // discards every piece of attempt state — no reset effect, no state leaking between puzzles.
  return (
    <PuzzleBoard
      key={puzzle.id}
      puzzle={puzzle}
      themeLabel={themeLabel}
      theme={theme}
      puzzlesHref={puzzlesHref}
      index={puzzleIndex}
      total={puzzles.length}
      onPrev={() => setPuzzleIndex((i) => Math.max(i - 1, 0))}
      onNext={() => setPuzzleIndex((i) => Math.min(i + 1, puzzles.length - 1))}
    />
  )
}

function PuzzleBoard({
  puzzle,
  themeLabel,
  theme,
  puzzlesHref,
  index,
  total,
  onPrev,
  onNext,
}: {
  puzzle: PuzzleRow
  themeLabel: string
  theme: string
  puzzlesHref: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const isFirstPuzzle = index === 0
  const isLastPuzzle = index === total - 1

  const parsedMoves = useMemo(() => puzzle.moves.trim().split(/\s+/).map(parseUci), [puzzle])
  const setupMove = parsedMoves[0]
  const solutionMoves = useMemo(() => parsedMoves.slice(1), [parsedMoves])
  // The FEN's own side-to-move plays the setup move; the solver is the other side.
  const playerColor: 'w' | 'b' = puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w'
  const mateN = mateLength(puzzle.themes)

  // The setup move is applied while rendering so the first paint already shows the position the player
  // faces (their move), not the opponent's.
  const startingFen = useMemo(() => {
    if (!setupMove) return puzzle.fen
    const setup = new Chess(puzzle.fen)
    setup.move({ from: setupMove.from, to: setupMove.to, promotion: setupMove.promotion ?? 'q' })
    return setup.fen()
  }, [puzzle, setupMove])

  const { fen, turn, dests, isCheck, makeMove, reset } = useChessGame(startingFen)

  const [solutionIndex, setSolutionIndex] = useState(0)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongFlashFen, setWrongFlashFen] = useState<string | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [wrongNote, setWrongNote] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [revealed, setRevealed] = useState(false)
  // After the result has been recorded (solved / revealed), another go is practice: shown, never saved.
  const [practice, setPractice] = useState(false)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  // True after a mate-in-two was started with a different (also forced-mate) first move than the stored one.
  const [offScript, setOffScript] = useState(false)
  const [playedLine, setPlayedLine] = useState<UciMove[]>([])
  const [altNote, setAltNote] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const startedAtRef = useRef(0)
  useEffect(() => {
    startedAtRef.current = Date.now()
  }, [])
  // A double click on Skip / Next / Previous would otherwise land its second click on the NEXT puzzle's
  // button and skip a puzzle the player never saw. Navigation is ignored for a moment after a puzzle appears.
  const [shownAt] = useState(() => Date.now())
  const navigationReady = () => Date.now() - shownAt > NAV_GUARD_MS
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  // A result is recorded once per puzzle visit: repeated clicks, retries and replays can't write a second one.
  const recordedRef = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])
  useEffect(() => clearTimers, [clearTimers])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const isPlayerTurn = turn === playerColor
  const mateMovesLeft = mateN === null ? null : mateN - Math.floor(solutionIndex / 2)

  // The move the solver is looking for right now: the stored line while on it, else any mating move.
  const expectedMove = findExpectedMove(offScript, solutionMoves[solutionIndex] ?? null, fen)

  const record = useCallback(
    (outcome: PuzzleOutcome, hints: number) => {
      if (recordedRef.current || practice) return
      recordedRef.current = true
      const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      logPuzzleAttempt({ puzzleId: puzzle.id, outcome, hintsUsed: hints, wrongAttempts, timeTakenSeconds: elapsed })
        .then((res) => {
          if (!res.ok) setToast("We couldn't save your result just now. You can keep going.")
        })
        .catch(() => setToast("We couldn't save your result just now. You can keep going."))
    },
    [puzzle.id, practice, wrongAttempts]
  )

  // ── Hints ────────────────────────────────────────────────────────────────
  const canAct = attemptState === 'idle' && isPlayerTurn && !solved && !revealed
  const automaticTier = wrongAttempts >= HINT_PIECE_AFTER_ATTEMPTS ? 2 : wrongAttempts >= HINT_IDEA_AFTER_ATTEMPTS ? 1 : 0
  const hintTier = Math.max(forcedHintTier ?? 0, automaticTier)
  const hints = expectedMove ? buildHints(fen, expectedMove, puzzle.themes, THEME_HINTS[theme]) : null
  const hintText = hints && hintTier >= 1 ? (hintTier >= 3 ? hints.move : hintTier === 2 ? hints.piece : hints.idea) : null
  const highlight: Key[] | undefined = hints && canAct && hintTier >= 2 ? (hintTier >= 3 ? [hints.from as Key, hints.to as Key] : [hints.from as Key]) : undefined

  function requestHint() {
    if (!canAct) return
    setForcedHintTier((t) => Math.min(Math.max(t ?? 0, automaticTier) + 1, 3))
  }

  // ── Moves ────────────────────────────────────────────────────────────────
  function finishSolve(line: UciMove[]) {
    setPlayedLine(line)
    setSolved(true)
    const outcome = classifyOutcome({ solved: true, hintsUsed: hintTier, solutionViewed: false, skipped: false })
    if (outcome) record(outcome, hintTier)
  }

  function handleMove(from: Key, to: Key) {
    if (!canAct) return
    const expected = expectedMove
    if (!expected) return
    const attempt: UciMove = { from, to }
    const verdict = judgeMove(fen, expected, attempt, mateMovesLeft)

    if (verdict.kind === 'correct' || verdict.kind === 'alternative') {
      const played = verdict.kind === 'correct' ? expected : attempt
      const result = makeMove(from, to, played.promotion ?? 'q')
      if (!result) return
      setLastMove([from, to])
      setAttemptState('correct')
      setWrongNote(null)
      const line = [...playedLine, { from, to, promotion: played.promotion }]
      setPlayedLine(line)
      const afterGame = new Chess(result.fenAfter)
      const done = afterGame.isCheckmate() && mateN !== null ? true : !offScript && solutionIndex + 1 >= solutionMoves.length
      if (verdict.kind === 'alternative') {
        setAltNote(`${verdict.san} also forces mate — a different route from the one we had in mind, and just as good.`)
        if (!done) setOffScript(true)
      }
      later(() => {
        setAttemptState('idle')
        if (done) {
          finishSolve(line)
          return
        }
        if (verdict.kind === 'alternative' || offScript) {
          // Off the stored line: any legal reply will do, the mate is forced either way.
          const reply = new Chess(result.fenAfter).moves({ verbose: true })[0]
          if (!reply) return
          later(() => {
            makeMove(reply.from, reply.to, reply.promotion ?? 'q')
            setLastMove([reply.from as Key, reply.to as Key])
            setPlayedLine((l) => [...l, { from: reply.from, to: reply.to, promotion: reply.promotion }])
            setSolutionIndex((i) => i + 2)
          }, OPPONENT_REPLY_DELAY)
          return
        }
        const next = solutionIndex + 1
        const mv = solutionMoves[next]
        setSolutionIndex(next)
        if (mv) {
          later(() => {
            makeMove(mv.from, mv.to, mv.promotion ?? 'q')
            setLastMove([mv.from as Key, mv.to as Key])
            setPlayedLine((l) => [...l, mv])
            setSolutionIndex(next + 1)
          }, OPPONENT_REPLY_DELAY)
        }
      }, CORRECT_DELAY)
      return
    }

    // Legal but not a solution (an illegal move can't be played: the board only offers legal squares).
    setWrongFlashFen(applyRawMove(fen, from, to))
    setAttemptState('wrong')
    setWrongAttempts((n) => n + 1)
    setWrongNote(verdict.kind === 'illegal' ? "That move isn't legal in this position." : explainWrongMove(fen, attempt, mateN !== null))
    later(() => {
      setWrongFlashFen(null)
      setAttemptState('idle')
    }, REVERT_DELAY)
  }

  // ── Typed move (keyboard / screen-reader alternative to dragging or tapping) ──
  const [typedMove, setTypedMove] = useState('')
  const [typedError, setTypedError] = useState<string | null>(null)

  function submitTypedMove(e: FormEvent) {
    e.preventDefault()
    if (!canAct) return
    const text = typedMove.trim()
    if (!text) return
    let move: ReturnType<Chess['move']> | null = null
    try {
      move = new Chess(fen).move(text)
    } catch {
      move = null
    }
    if (!move) {
      setTypedError(`"${text}" isn't a legal move here. Try notation like Nf3, exd5 or O-O.`)
      return
    }
    setTypedError(null)
    setTypedMove('')
    handleMove(move.from as Key, move.to as Key)
  }

  // ── Playback (Show solution / Replay) ────────────────────────────────────
  function runPlayback(moves: UciMove[], onDone: () => void) {
    clearTimers()
    setAttemptState('playback')
    moves.forEach((m, i) => {
      later(() => {
        makeMove(m.from, m.to, m.promotion ?? 'q')
        setLastMove([m.from as Key, m.to as Key])
      }, (i + 1) * PLAYBACK_STEP_DELAY)
    })
    later(() => {
      setAttemptState('idle')
      onDone()
    }, (moves.length + 1) * PLAYBACK_STEP_DELAY)
  }

  function requestShowSolution() {
    if (!canAct) return
    // From the current position, finish the line: stored continuation while on it, else the mating move.
    const remaining: UciMove[] = offScript ? (expectedMove ? [expectedMove] : []) : solutionMoves.slice(solutionIndex)
    if (remaining.length === 0) return
    setWrongNote(null)
    // A viewed solution is never an independent solve.
    const outcome = classifyOutcome({ solved: false, hintsUsed: hintTier, solutionViewed: true, skipped: false })
    if (outcome) record(outcome, hintTier)
    runPlayback(remaining, () => {
      setPlayedLine((l) => [...l, ...remaining])
      setRevealed(true)
    })
  }

  function replaySolution() {
    if (attemptState !== 'idle' || !(solved || revealed)) return
    reset()
    setLastMove(undefined)
    const line = playedLine
    runPlayback(line, () => undefined)
  }

  /** Another go from the start. Practice only: the result for this puzzle is already recorded. */
  function tryAgain() {
    if (attemptState !== 'idle' && attemptState !== 'wrong') return
    clearTimers()
    reset()
    setSolutionIndex(0)
    setAttemptState('idle')
    setWrongFlashFen(null)
    setWrongAttempts(0)
    setWrongNote(null)
    setSolved(false)
    setRevealed(false)
    setPractice(true)
    setLastMove(undefined)
    setForcedHintTier(null)
    setOffScript(false)
    setPlayedLine([])
    setAltNote(null)
    startedAtRef.current = Date.now()
  }

  function skip() {
    if (!navigationReady()) return
    clearTimers()
    if (!solved && !revealed) {
      const outcome = classifyOutcome({ solved: false, hintsUsed: hintTier, solutionViewed: false, skipped: true })
      if (outcome) record(outcome, hintTier)
    }
    onNext()
  }

  // ── Explanation (only once the puzzle is over) ───────────────────────────
  const explanation = useMemo(() => {
    if (!(solved || revealed) || playedLine.length === 0) return null
    return explainSolution(startingFen, playedLine, puzzle.themes, themeLabel)
  }, [solved, revealed, playedLine, startingFen, puzzle.themes, themeLabel])

  // ── Presentation ─────────────────────────────────────────────────────────
  const opponentColorLabel = colorName(playerColor === 'w' ? 'b' : 'w')
  const objective = objectiveText(puzzle.themes, theme, playerColor, THEME_OBJECTIVES[theme] ?? DEFAULT_OBJECTIVE)
  const relation = topicRelation(puzzle.themes, theme, themeLabel)
  const boardFen = wrongFlashFen ?? fen
  const interactive = canAct
  const boardDests = interactive ? dests : new Map<Key, Key[]>()
  const multiMove = solutionMoves.length > 1

  let statusText: string
  if (solved) statusText = practice ? 'Solved again — nice. (Practice: your saved result is unchanged.)' : 'Solved!'
  else if (revealed) statusText = 'That was the solution. Try it yourself when you are ready.'
  else if (attemptState === 'playback') statusText = 'Watch the solution…'
  else if (attemptState === 'correct') statusText = multiMove && !offScript && solutionIndex + 1 < solutionMoves.length ? `Good move! Now watch ${opponentColorLabel}'s reply.` : 'That works!'
  else if (attemptState === 'wrong') statusText = 'Not quite — try another move.'
  else if (!isPlayerTurn) statusText = `${opponentColorLabel} is replying…`
  else if (multiMove && solutionIndex > 0) statusText = 'Your turn again. Finish the tactic.'
  else statusText = 'Your move.'

  const over = solved || revealed
  const showFeedbackNote = wrongNote && attemptState !== 'correct'

  return (
    <div className={styles.layout} data-fen={fen} data-attempt={attemptState}>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={boardFen}
            turnColor={turn === 'w' ? 'white' : 'black'}
            dests={boardDests}
            orientation={playerColor === 'w' ? 'white' : 'black'}
            viewOnly={!interactive}
            check={isCheck ? (turn === 'w' ? 'white' : 'black') : false}
            lastMove={lastMove}
            highlightSquares={highlight}
            highlightColor="yellow"
            onMove={handleMove}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <p className={styles.stageIndicator}>
          Puzzle {index + 1} of {total} · {themeLabel} · Rating {puzzle.rating}
        </p>
        <p className={styles.turnLabel}>{objective}</p>
        {relation && <p className={styles.relationNote}>{relation}</p>}
        {/* One live region for every outcome message, next to the board — screen readers hear each change. */}
        <div className={`${styles.promptCard} ${attemptState === 'correct' || solved ? styles.promptCardCorrect : ''}`} role="status" aria-live="polite" aria-atomic="true">
          <p className={styles.promptText}>{statusText}</p>
          {showFeedbackNote && <p className={styles.hintText}>{wrongNote}</p>}
          {altNote && <p className={styles.hintText}>{altNote}</p>}
          {hintText && canAct && (
            <p className={styles.hintText}>
              Hint {Math.min(hintTier, 3)} of 3: {hintText}
            </p>
          )}
        </div>

        {over && explanation && (
          <div className={styles.explain}>
            <p className={styles.explainTitle}>Why it works</p>
            {explanation.lines.map((line) => (
              <p key={line} className={styles.explainLine}>
                {line}
              </p>
            ))}
            <p className={styles.explainLine}>
              <strong>Line:</strong> {explanation.line}
            </p>
            {explanation.defences.length > 0 && (
              <details className={styles.defences}>
                <summary>Every defence, and the mate that follows</summary>
                <ul>
                  {explanation.defences.map((d) => (
                    <li key={d.reply}>
                      {d.reply} → {d.mate}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {solved && isLastPuzzle && <p className={styles.doneText}>You&rsquo;ve completed this set!</p>}

        {/* Help while the puzzle is open. No "Try again" here: a wrong move already snaps back by itself,
            and restarting only makes sense once the puzzle is over. */}
        {!over && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} onClick={requestHint} disabled={!canAct || hintTier >= 3}>
              💡 Hint
            </button>
            <button type="button" className={styles.actionBtnGhost} onClick={requestShowSolution} disabled={!canAct}>
              👀 Show solution
            </button>
          </div>
        )}

        {over && (
          <div className={styles.actions}>
            {isLastPuzzle ? (
              <Link href={puzzlesHref} className={styles.actionBtn}>
                Back to Puzzles
              </Link>
            ) : (
              <button type="button" className={styles.actionBtn} onClick={() => navigationReady() && onNext()} disabled={attemptState === 'playback'}>
                Next puzzle →
              </button>
            )}
            <button type="button" className={styles.actionBtnGhost} onClick={tryAgain} disabled={attemptState === 'playback'}>
              {revealed ? '↺ Try yourself' : '↺ Try again'}
            </button>
            <button type="button" className={styles.actionBtnGhost} onClick={replaySolution} disabled={attemptState === 'playback'}>
              ▶ Replay
            </button>
          </div>
        )}

        {!over && (
          <details className={styles.typeMove}>
            <summary>Type your move instead</summary>
            <form onSubmit={submitTypedMove} className={styles.typeMoveForm}>
              <label htmlFor={`typed-move-${puzzle.id}`} className={styles.typeMoveLabel}>
                Move in standard notation, for example Nf3 or Qxh7#
              </label>
              <div className={styles.typeMoveRow}>
                <input
                  id={`typed-move-${puzzle.id}`}
                  className={styles.typeMoveInput}
                  value={typedMove}
                  onChange={(e) => {
                    setTypedMove(e.target.value)
                    setTypedError(null)
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={!canAct}
                />
                <button type="submit" className={styles.actionBtnGhost} disabled={!canAct || !typedMove.trim()}>
                  Play
                </button>
              </div>
              {typedError && (
                <p className={styles.typeMoveError} role="alert">
                  {typedError}
                </p>
              )}
            </form>
          </details>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.actionBtnGhost} onClick={() => { if (!navigationReady()) return; clearTimers(); onPrev() }} disabled={isFirstPuzzle}>
            ← Previous
          </button>
          {!over && (
            <button type="button" className={styles.actionBtnGhost} onClick={skip} disabled={isLastPuzzle}>
              Skip →
            </button>
          )}
        </div>
      </div>

      <Toast visible={!!toast} message={toast ?? ''} onClose={() => setToast(null)} />
    </div>
  )
}
