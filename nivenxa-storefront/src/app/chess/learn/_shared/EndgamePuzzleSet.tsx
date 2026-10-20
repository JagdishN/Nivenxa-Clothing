'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { PIECE_NAME } from './moveSquares'
import { hintTierFor, HINT_TIER_COUNT } from './feedbackCopy'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import styles from './TacticPuzzleSet.module.scss'

// Sibling to TacticPuzzleSet.tsx, not a variant of it — Endgames' own
// objectives (deliver checkmate, promote a pawn, reach a square) are a
// different, smaller vocabulary than Tactics' (attacks on other pieces), so
// this gets its own acceptance predicates and template tokens rather than
// stretching Tactics' own union to cover both. The surrounding UX — board,
// hint tiers, voice, Show Me/Hint/Try again, the completion modal — is
// deliberately identical, reusing the same shared infrastructure
// (moveSquares.ts, useLessonVoice, VoiceControls, feedbackCopy.ts) and even
// the same stylesheet (TacticPuzzleSet.module.scss has no tactic-specific
// class names in it, just the puzzle-set layout shared by both).

const EMPTY_DESTS = new Map<Key, Key[]>()
const REVERT_DELAY = 700
const DEMO_DELAY = 1200
const CELEBRATE_DURATION = 1300

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

const MOVEMENT_HINT: Record<string, string> = {
  p: 'Look at the squares just ahead of your pawn.',
  n: "Look for your knight's L-shaped jump.",
  b: 'Look along the diagonals from your bishop.',
  r: "Look along your rook's row and column.",
  q: "Look along your queen's row, column, and diagonals.",
  k: 'Look at the squares right next to your king.',
}

export interface EndgamePuzzleConfig {
  fen: string
  correctFrom: string
  correctTo: string
  /** Shown instead of the shared `prompt` when this puzzle's own goal differs from the others. */
  objective?: string
  /**
   * Accepts ANY legal move satisfying this property, not just the one
   * authored at `correctFrom`/`correctTo` — same reasoning as Tactics'
   * own `acceptAnyMoveThat` (built earlier), just a different vocabulary:
   * `'deliversCheckmate'` (`chess.isCheckmate()`) and `'promotesPawn'`
   * (the move promoted — any piece, not just a queen). Omitted keeps
   * today's exact-match behavior.
   */
  acceptAnyMoveThat?: 'deliversCheckmate' | 'promotesPawn'
}

export interface EndgamePuzzleSetExample {
  /** Exactly 3, in order. */
  puzzles: EndgamePuzzleConfig[]
  prompt: string
  wrongText: string
  correctText: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting' | 'demonstrating'

function tieredCorrectText(correctText: string, hintTier: number): string {
  if (hintTier >= 3) return `${correctText} Let's try the next one together.`
  if (hintTier >= 2) return `You found it with a hint. ${correctText}`
  return `That's it! ${correctText}`
}

export default function EndgamePuzzleSet({
  example,
  nextCta,
}: {
  example: EndgamePuzzleSetExample
  nextCta?: { href: string; label: string }
}) {
  const { puzzles, prompt, wrongText, correctText, completionSummary } = example
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const puzzle = puzzles[puzzleIndex]
  const puzzlePrompt = puzzle.objective ?? prompt

  // Set once a move is judged correct — every feedback computation below
  // reads `effectiveFrom`/`effectiveTo` instead of `puzzle.correctFrom`/
  // `puzzle.correctTo` directly, so an open-ended puzzle solved via a
  // genuinely different legal move still gets feedback describing THAT
  // move. Same pattern as TacticPuzzleSet.tsx.
  const [solvedMove, setSolvedMove] = useState<{ from: string; to: string } | null>(null)
  const effectiveFrom = solvedMove?.from ?? puzzle.correctFrom
  const effectiveTo = solvedMove?.to ?? puzzle.correctTo

  const pieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(effectiveFrom as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, effectiveFrom])

  const pieceType = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(effectiveFrom as Parameters<Chess['get']>[0])
    return piece?.type
  }, [puzzle.fen, effectiveFrom])

  // The piece actually being captured, if any — distinct from `yourPiece`
  // (the piece that moved). "Your king captures the {yourPiece}" would
  // otherwise name the king itself as what got captured; puzzles that
  // describe a capture (Use Your King, Can the King Catch the Pawn?) need
  // this instead. Looked up on the FEN BEFORE the move, since by the time
  // this runs the capturing piece already occupies that square.
  const capturedPieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(effectiveTo as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, effectiveTo])

  const templateVars = {
    yourPiece: pieceName,
    targetSquare: effectiveTo,
    capturedPiece: capturedPieceName,
  }
  const resolvedWrongText = fillTemplate(wrongText, templateVars)
  const resolvedCorrectText = fillTemplate(correctText, templateVars)
  const resolvedPuzzlePrompt = fillTemplate(puzzlePrompt, templateVars)

  const [displayFen, setDisplayFen] = useState(puzzle.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  // "Right idea, not finished yet" case (e.g. a legal check that isn't
  // mate, or an accidental stalemate) — set alongside `attemptState:
  // 'reverting'`, read by `promptLines` below, cleared by `clearWrongState`.
  const [partialFeedback, setPartialFeedback] = useState<string | null>(null)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voice = useLessonVoice()

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `puzzle` is derived from puzzleIndex; re-running on puzzle identity would be redundant.
  useEffect(() => {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    voice.cancel()
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
    setForcedHintTier(null)
    setSolvedMove(null)
    setPartialFeedback(null)
    if (!voice.muted) voice.speak(resolvedPuzzlePrompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately run once per puzzleIndex change only, reading whichever is current at that moment.
  }, [puzzleIndex])

  useEffect(
    () => () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
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

  useEffect(() => {
    if (!showModal || voice.muted) return
    voice.speak(['Great practice!', ...(completionSummary ?? [])].join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on showModal; completionSummary/voice are static per lesson instance.
  }, [showModal])

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

  function clearWrongState() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setLastMove(undefined)
    setPartialFeedback(null)
  }

  function advancePuzzle() {
    if (puzzleIndex === puzzles.length - 1) setAllDone(true)
    else setPuzzleIndex((i) => i + 1)
  }

  function satisfiesObjective(chessAfterMove: Chess, from: string, to: string, wasPromotion: boolean): boolean {
    switch (puzzle.acceptAnyMoveThat) {
      case 'deliversCheckmate':
        return chessAfterMove.isCheckmate()
      case 'promotesPawn':
        return wasPromotion
      default:
        return from === puzzle.correctFrom && to === puzzle.correctTo
    }
  }

  function partialCreditMessage(chessAfterMove: Chess): string | undefined {
    if (puzzle.acceptAnyMoveThat !== 'deliversCheckmate') return undefined
    if (chessAfterMove.isStalemate()) {
      return "That's a stalemate — a draw! The king has no legal moves, but it isn't in check either. Try a move that keeps at least one square open for it, or checks it directly."
    }
    if (chessAfterMove.inCheck()) {
      return "Yes, that's check! But the king can still escape — look for a check it can't get away from."
    }
    return undefined
  }

  function handleMove(from: Key, to: Key) {
    if (attemptState !== 'idle') return
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from, to, promotion: 'q' })
    if (!result) return
    setLastMove([from, to])
    setDisplayFen(chess.fen())
    const wasPromotion = !!result.promotion

    if (satisfiesObjective(chess, from, to, wasPromotion)) {
      setSolvedMove({ from, to })
      setAttemptState('correct')
      return
    }

    const partial = partialCreditMessage(chess)
    if (partial) {
      setAttemptState('reverting')
      setPartialFeedback(partial)
      setWrongAttempts((n) => n + 1)
      if (!voice.muted) voice.speak(partial)
      revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
      return
    }

    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    if (!voice.muted) voice.speak(resolvedWrongText)
    revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    setPuzzleIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  const hintTier = Math.max(forcedHintTier ?? 0, hintTierFor(wrongAttempts))

  let promptLines: string[]
  if (allDone) {
    promptLines = ['Great practice!']
  } else if (attemptState === 'correct') {
    promptLines = [`✓ ${tieredCorrectText(resolvedCorrectText, hintTier)}`]
  } else if (attemptState === 'demonstrating') {
    promptLines = [`Watch — your ${pieceName} moves to ${puzzle.correctTo}.`, 'Now you try.']
  } else if (attemptState === 'reverting' && partialFeedback) {
    promptLines = [partialFeedback]
  } else if (hintTier === 0) {
    promptLines = [resolvedPuzzlePrompt]
  } else if (hintTier === 1) {
    promptLines = [resolvedWrongText]
  } else {
    promptLines = ['Need a hint?', (pieceType && MOVEMENT_HINT[pieceType]) || `Try using your ${pieceName}.`]
  }

  const showHighlight = attemptState === 'correct' || (hintTier >= 2 && attemptState === 'idle')
  const highlightSquares = showHighlight ? [effectiveFrom as Key, effectiveTo as Key] : undefined
  const celebrating = allDone && !showModal

  function currentSpokenText(): string {
    return promptLines.join('. ')
  }

  useEffect(() => {
    if (attemptState !== 'correct' || voice.muted) return
    voice.speak(tieredCorrectText(resolvedCorrectText, hintTier))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on attemptState entering 'correct'; resolvedCorrectText/hintTier/voice read fresh via closure, same render that set solvedMove.
  }, [attemptState])

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (attemptState !== 'idle') return
    setForcedHintTier((t) => Math.min((t ?? hintTierFor(wrongAttempts)) + 1, HINT_TIER_COUNT - 1))
  }

  function requestShowMe() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (attemptState !== 'idle') return
    setForcedHintTier(HINT_TIER_COUNT - 1)
    setAttemptState('demonstrating')
    const chess = new Chess(puzzle.fen)
    chess.move({ from: puzzle.correctFrom, to: puzzle.correctTo, promotion: 'q' })
    setDisplayFen(chess.fen())
    setLastMove([puzzle.correctFrom as Key, puzzle.correctTo as Key])
    if (revertTimer.current) clearTimeout(revertTimer.current)
    revertTimer.current = setTimeout(clearWrongState, DEMO_DELAY)
  }

  useEffect(() => {
    if (forcedHintTier === null || attemptState === 'demonstrating') return
    voice.speak(currentSpokenText())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on the request itself; currentSpokenText/voice/attemptState intentionally excluded (attemptState read fresh via closure, same render as the forcedHintTier change that triggered this).
  }, [forcedHintTier])

  useEffect(() => {
    if (attemptState !== 'demonstrating' || voice.muted) return
    voice.speak(currentSpokenText())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on attemptState entering 'demonstrating'; currentSpokenText/voice read fresh via closure.
  }, [attemptState])

  function requestTryAgain() {
    if (attemptState !== 'reverting') return
    clearWrongState()
    voice.speak('Go ahead, try again.')
  }

  function handleVoiceCommand(command: VoiceCommand | null) {
    if (!command) {
      voice.speak("I didn't catch that. Please try again or use the buttons.")
      return
    }
    switch (command) {
      case 'repeat':
        voice.speak(currentSpokenText())
        break
      case 'hint':
      case 'explain':
        requestHint()
        break
      case 'showMe':
        requestShowMe()
        break
      case 'tryAgain':
        requestTryAgain()
        break
      case 'next':
        if (attemptState === 'correct') {
          advancePuzzle()
        } else {
          voice.speak('Finish this puzzle first.')
        }
        break
      case 'pause':
        voice.pause()
        break
      case 'resume':
        voice.resume()
        break
    }
  }

  const voiceStatus: 'speaking' | 'yourTurn' | null = voice.speaking ? 'speaking' : allDone || attemptState === 'correct' ? null : 'yourTurn'

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
        {!allDone && (
          <p className={styles.puzzleIndicator}>{puzzle.fen.split(' ')[1] === 'b' ? 'Black' : 'White'} to move</p>
        )}
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

        {attemptState === 'correct' && !allDone && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtnGhost} onClick={advancePuzzle}>
              {puzzleIndex === puzzles.length - 1 ? 'Finish →' : 'Next puzzle →'}
            </button>
          </div>
        )}

        {!allDone && (
          <VoiceControls
            supported={voice.supported}
            micSupported={voice.micSupported}
            voiceOn={!voice.muted}
            rate={voice.rate}
            listening={voice.listening}
            showHintControls
            onToggleVoice={voice.toggleMute}
            onSetRate={voice.setSpeechRate}
            onReplay={() => voice.speak(currentSpokenText())}
            onHint={requestHint}
            onShowMe={requestShowMe}
            onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
            onMicEnd={voice.stopPushToTalk}
          />
        )}
        {!allDone && <VoiceStatusLine status={voiceStatus} />}

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
            <p className={styles.modalTag}>✓ Practice complete</p>
            <p className={styles.modalHeading}>🎉 Great practice!</p>
            {(completionSummary ?? []).map((line, i) => (
              <p key={i} className={styles.modalBody}>
                {line}
              </p>
            ))}
            <div className={styles.modalActions}>
              <button type="button" className={styles.actionBtnGhost} onClick={handlePracticeAgain}>
                Practice again
              </button>
              {nextCta && (
                <Link href={nextCta.href} className={styles.modalPrimary}>
                  {nextCta.label}
                </Link>
              )}
              <Link href="/chess/learn/endgames" className={styles.modalSecondary}>
                Back to Endgames
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
