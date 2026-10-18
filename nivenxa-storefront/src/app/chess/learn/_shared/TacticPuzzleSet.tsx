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

const EMPTY_DESTS = new Map<Key, Key[]>()
// Beat before a wrong attempt snaps back — matches PracticePanel's own
// timing. A correct answer no longer auto-advances (see Next-puzzle button
// below) — the learner decides when they're ready to move on.
const REVERT_DELAY = 700
// How long a Show Me demonstration plays before resetting back to let the
// learner try it themselves.
const DEMO_DELAY = 1200
const CELEBRATE_DURATION = 1300

// `{yourPiece}`/`{capturedPiece}` tokens in a tactic's own wrongText/
// correctText get filled in from the actual move played — a no-op for any
// tactic whose copy has no tokens, so this is safe to always apply.
function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
}

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
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting' | 'demonstrating'

// How the correct-move praise is framed, by how much help was actually used
// this puzzle — not one fixed "That's it!" regardless of whether a hint or
// Show Me was needed first. `correctText` itself stays whatever the tactic
// authored; only the wrapper around it changes.
function tieredCorrectText(correctText: string, hintTier: number): string {
  if (hintTier >= 3) return `${correctText} Let's try the next one together.`
  if (hintTier >= 2) return `You found it with a hint. ${correctText}`
  return `That's it! ${correctText}`
}

export default function TacticPuzzleSet({
  example,
  nextCta,
}: {
  example: TacticPuzzleSetExample
  nextCta?: { href: string; label: string }
}) {
  const { puzzles, prompt, wrongText, correctText, completionSummary } = example
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const puzzle = puzzles[puzzleIndex]

  const [displayFen, setDisplayFen] = useState(puzzle.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  // Set by a manual Hint/Show Me request (click or voice command) — kept
  // separate from wrongAttempts-driven escalation (never regresses it, see
  // `hintTier` below) so asking for a hint doesn't erase progress a wrong
  // attempt already made toward one.
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voice = useLessonVoice()

  // No separate Start gate here — this component is only ever mounted as
  // the direct result of Learn mode's own "Your Turn →" click one component
  // up (TacticDetail.tsx's mode state starts at 'learn' and only flips via
  // that click), so that click is already the user gesture autoplay needs.
  // A second "Ready to begin?" screen here was pure redundancy.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `puzzle` is derived from puzzleIndex; re-running on puzzle identity would be redundant.
  useEffect(() => {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    voice.cancel()
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
    setForcedHintTier(null)
    if (!voice.muted) voice.speak(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `voice`/`prompt` deliberately excluded: this must run once per puzzleIndex change only, reading whichever is current at that moment.
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

  // Speaks the completion recap the moment the modal actually shows it —
  // not earlier, during the celebration animation.
  useEffect(() => {
    if (!showModal || voice.muted) return
    voice.speak(['Great practice!', ...(completionSummary ?? [])].join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on showModal; completionSummary/voice are static per tactic instance.
  }, [showModal])

  const pieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(puzzle.correctFrom as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, puzzle.correctFrom])

  // The piece actually being captured — puzzles within one tactic don't
  // always capture the same kind of piece (Hanging Pieces' 4 puzzles win a
  // knight, a rook, a bishop, and a knight), so this feeds `correctText`'s
  // `{capturedPiece}` token instead of a tactic guessing one fixed name.
  const capturedPieceName = useMemo(() => {
    const piece = new Chess(puzzle.fen).get(puzzle.correctTo as Parameters<Chess['get']>[0])
    return piece ? PIECE_NAME[piece.type] : 'piece'
  }, [puzzle.fen, puzzle.correctTo])

  const resolvedWrongText = fillTemplate(wrongText, { yourPiece: pieceName })
  const resolvedCorrectText = fillTemplate(correctText, { yourPiece: pieceName, capturedPiece: capturedPieceName })

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

  // Shared by the wrong-attempt auto-revert timeout, the Show Me
  // demonstration's reset, AND the voice "try again" command — a spoken
  // "try again" just fires this early instead of waiting out REVERT_DELAY.
  function clearWrongState() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    setDisplayFen(puzzle.fen)
    setAttemptState('idle')
    setLastMove(undefined)
  }

  function advancePuzzle() {
    if (puzzleIndex === puzzles.length - 1) setAllDone(true)
    else setPuzzleIndex((i) => i + 1)
  }

  function handleMove(from: Key, to: Key) {
    if (attemptState !== 'idle') return
    const chess = new Chess(puzzle.fen)
    const result = chess.move({ from, to, promotion: 'q' })
    if (!result) return
    setLastMove([from, to])
    setDisplayFen(chess.fen())

    if (from === puzzle.correctFrom && to === puzzle.correctTo) {
      setAttemptState('correct')
      if (!voice.muted) voice.speak(tieredCorrectText(resolvedCorrectText, hintTier))
      // No auto-advance timer — the solved board and praise stay on screen
      // until the learner taps Next puzzle (or says "next"), so they have
      // time to see what happened before the board changes.
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

  // 1st wrong: text only. 2nd: the piece-name hint. 3rd+: hint plus the
  // piece highlighted. Math.max, not a replacement — a manual Hint/Show Me
  // request (forcedHintTier) never regresses the automatic
  // wrongAttempts-driven tier, and a later wrong attempt still climbs
  // normally even after a hint was already requested.
  const hintTier = Math.max(forcedHintTier ?? 0, hintTierFor(wrongAttempts))

  let promptLines: string[]
  if (allDone) {
    promptLines = ['Great practice!']
  } else if (attemptState === 'correct') {
    promptLines = [`✓ ${tieredCorrectText(resolvedCorrectText, hintTier)}`]
  } else if (attemptState === 'demonstrating') {
    promptLines = [`Watch — your ${pieceName} captures the ${capturedPieceName}.`, 'Now you try.']
  } else if (hintTier === 0) {
    promptLines = [prompt]
  } else if (hintTier === 1) {
    promptLines = [resolvedWrongText]
  } else {
    promptLines = ['Need a hint?', `Try using your ${pieceName}.`]
  }

  const highlightSquares = hintTier >= 3 && attemptState === 'idle' ? [puzzle.correctFrom as Key] : undefined
  const celebrating = allDone && !showModal

  function currentSpokenText(): string {
    return promptLines.join('. ')
  }

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (attemptState !== 'idle') return
    setForcedHintTier((t) => Math.min((t ?? hintTierFor(wrongAttempts)) + 1, HINT_TIER_COUNT - 1))
  }

  // Plays the correct move on the board, then resets back to `puzzle.fen`
  // after DEMO_DELAY — a demonstration, not an auto-solve: `attemptState`
  // never becomes 'correct' here, so this never counts as the puzzle being
  // solved, and the correct-square highlight (from forcedHintTier) is still
  // showing once it resets, so the learner's retry has that aid in place.
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

  // Speaks the newly-revealed tier text the instant a Hint request (click
  // or voice) changes forcedHintTier — not on every render, and not when
  // wrongAttempts alone drives the tier up (that's already spoken live
  // inside handleMove's wrong branch). Skipped while a Show Me
  // demonstration is playing — that gets its own dedicated line below,
  // which this would otherwise immediately talk over.
  useEffect(() => {
    if (forcedHintTier === null || attemptState === 'demonstrating') return
    voice.speak(currentSpokenText())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on the request itself; currentSpokenText/voice/attemptState intentionally excluded (attemptState read fresh via closure, same render as the forcedHintTier change that triggered this).
  }, [forcedHintTier])

  // The Show Me demonstration's own narration — kept separate from the
  // effect above so it isn't immediately overwritten by the generic hint
  // text (both would otherwise fire off the same forcedHintTier change).
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
