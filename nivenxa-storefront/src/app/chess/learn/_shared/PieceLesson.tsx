'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { correctSquaresFor, wrongSquarePool, applyRawMove, applyPromotionMove, applyCastlingMove, type MoveFilterMode } from './moveTrainerLogic'
import { hintTierFor, HINT_TIER_COUNT, classifyWrongAttempt, wrongKindPrefix, DEMONSTRATION_INTRO, demonstrationFallbackText, type WrongKind } from './feedbackCopy'
import { markLessonCompleted, updateLessonStep } from '@/lib/chess/basicsProgress'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import styles from './PieceLesson.module.scss'

type PromotionPiece = 'q' | 'r' | 'b' | 'n'
const PROMOTION_CHOICES: { value: PromotionPiece; label: string; whiteGlyph: string; blackGlyph: string }[] = [
  { value: 'q', label: 'Queen', whiteGlyph: '♕', blackGlyph: '♛' },
  { value: 'r', label: 'Rook', whiteGlyph: '♖', blackGlyph: '♜' },
  { value: 'b', label: 'Bishop', whiteGlyph: '♗', blackGlyph: '♝' },
  { value: 'n', label: 'Knight', whiteGlyph: '♘', blackGlyph: '♞' },
]

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
  /** Shown instead of correctText when the learner's correct move wasn't the first of several equally-valid correctSquares — "yes, that works too," not a second copy of the primary confirmation. */
  alternateCorrectText?: string
  /** Tier-1 hint: a vaguer "look over here" cue, shown before the tier-2 exact-destination reveal. Falls back to just the pieceSquare itself if not authored. */
  hintAreaSquares?: string[]
  /** Tier-3 demonstration line, replacing the generic fallback ("Here's how it's done: move from X to Y."). */
  demonstrationText?: string
  /** A pawn reaching the back rank must choose a piece before the move counts as done — see PROMOTION_CHOICES and the picker rendered below. Any of Q/R/B/N is accepted as correct; the point is the mandatory choice, not judging which one. */
  requiresPromotionChoice?: boolean
}

/**
 * "Recognize this real position" — a question over an arbitrary FEN with
 * N answer options, judged against `correctOptionIndex`. Generalizes
 * yes/no (`options: ['Yes','No']`) to also cover a 3-way judgment like
 * "Checkmate / Stalemate / Neither?". Exists because BoardLesson's own
 * `yesNo` step can't render an arbitrary position at all — it only ever
 * draws a decorative parity-flip checkerboard, not the real board.
 */
export interface PieceJudgmentStep {
  kind: 'judgment'
  stageLabel: string
  fen: string
  pieceColor: 'w' | 'b'
  /** Visual aids while the learner considers the question — same fields as a demo step. */
  highlightSquares?: string[]
  arrows?: [string, string][]
  prompt: string
  options: string[]
  correctOptionIndex: number
  correctText: string
  wrongText: string
  hintText: string
}

export type PieceLessonStep = PieceDemoStep | PieceTryStep | PieceJudgmentStep

export interface PieceLessonExample {
  steps: PieceLessonStep[]
  pieceName: string
  /** Natural-sounding completion line — e.g. "You learned how pawns move!" The old template ("You learned the {pieceName}!") reads as "You learned the How Pawns Move!" once lesson names became full questions, so this is required in practice, not just cosmetic. */
  completionHeadline: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting'

// Same title-casing as BoardLesson.tsx — data stores stageLabel in ALL CAPS
// ('SEE IT MOVE', 'YOUR TURN'); this reads as "See It Move" next to the
// plain "N of M" counter instead of shouting the same text beside it.
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

// What auto-speak-on-entry says for a step, before any wrong attempt/hint
// changes the picture — the exact tier-0/idle text the panel already
// shows, so a lesson with no authored spoken-script fields of its own just
// speaks its existing visible copy automatically instead of reading
// differently out loud than on screen.
function introTextFor(step: PieceLessonStep): string {
  return step.kind === 'demo' ? step.text.join('. ') : step.prompt
}

export default function PieceLesson({
  example,
  nextCta,
  slug,
}: {
  example: PieceLessonExample
  nextCta?: { href: string; label: string }
  slug: string
}) {
  const { steps, pieceName, completionHeadline, completionSummary } = example
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  // Gates the whole lesson behind one explicit click — that click is the
  // user gesture auto-narration needs (see handleStart below), and gives a
  // clear "begin" moment instead of narration starting the instant the page
  // loads. Never persisted — a fresh page load/navigation is a fresh gate.
  const [started, setStarted] = useState(false)

  const [displayFen, setDisplayFen] = useState(step.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  // Which flavor of "wrong" the most recent try attempt was — only ever set
  // for `try` steps (a real chess move was attempted); unused by squareQuiz-
  // style judgment, which has no legal/illegal-move axis at all.
  const [wrongKind, setWrongKind] = useState<WrongKind | null>(null)
  // Set the instant a `requiresPromotionChoice` try step's drag lands on a
  // correct (back-rank) square — holds the move until the learner picks a
  // piece, rather than resolving 'correct' immediately like every other try.
  const [awaitingPromotion, setAwaitingPromotion] = useState<{ from: Key; to: Key; fen: string } | null>(null)
  const [chosenCorrectSquare, setChosenCorrectSquare] = useState<string | null>(null)
  const [judgmentChoice, setJudgmentChoice] = useState<number | null>(null)
  // Set by a manual Hint/Show Me request (click or voice command) — see
  // feedbackCopy.ts's tier system. Kept separate from wrongAttempts-driven
  // escalation (never regresses it, see `hintTier` below) so asking for a
  // hint doesn't erase progress a wrong attempt already made toward one.
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voice = useLessonVoice()

  useEffect(() => {
    // A timer armed by the PREVIOUS step can still be pending here — clear
    // both before resetting local state so a stale timeout can't flip
    // attemptState or call advanceStep again after we've already landed on
    // a new step (see BoardLesson.tsx's identical fix for the full reasoning).
    if (revertTimer.current) clearTimeout(revertTimer.current)
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    voice.cancel()
    setDisplayFen(step.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
    setWrongKind(null)
    setAwaitingPromotion(null)
    setChosenCorrectSquare(null)
    setJudgmentChoice(null)
    setForcedHintTier(null)
    updateLessonStep(slug, stepIndex + 1, steps.length)
    // Auto-speak this step's intro once voice is on — but only once the
    // lesson has actually started: on the very first mount `started` is
    // still false, so step 0's own narration instead comes from
    // handleStart's own direct speak() call (inside a real click handler,
    // the user gesture autoplay needs), not from this effect.
    if (started && !voice.muted) voice.speak(introTextFor(step))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `step`/`started`/`voice` deliberately excluded: this must run once per stepIndex change only, reading whichever of those is current at that moment, not re-fire when they change on their own.
  }, [stepIndex, slug, steps.length])

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

  // Speaks the completion recap the moment the modal actually shows it —
  // not earlier, during the celebration animation, when none of this text
  // is on screen yet. The recap was previously the one reaction in this
  // file with no spoken form at all.
  useEffect(() => {
    if (!showModal || voice.muted) return
    voice.speak([completionHeadline, ...(completionSummary ?? [])].join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on showModal; completionHeadline/completionSummary/voice are static per lesson instance.
  }, [showModal])

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
    if (isLast) {
      setAllDone(true)
      markLessonCompleted(slug)
    } else setStepIndex((i) => i + 1)
  }

  // Revisiting a previous explanation shouldn't cost restarting the whole
  // lesson — the existing stepIndex-change effect above already resets
  // attemptState/wrongAttempts/lastMove/displayFen for whichever step this
  // lands on.
  function handleBack() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (revertTimer.current) clearTimeout(revertTimer.current)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  // The user gesture autoplay needs — speaking step 0's intro directly
  // inside this click handler (rather than leaving it to the stepIndex
  // effect, which already ran once before this click with `started` still
  // false) is what lets the very first utterance play without a browser
  // autoplay-policy block.
  function handleStart() {
    setStarted(true)
    if (!voice.muted) voice.speak(introTextFor(step))
  }

  // Shared by the try/judgment wrong-answer auto-revert timeouts AND the
  // voice "try again" command — a spoken "try again" just fires this early
  // instead of waiting out REVERT_DELAY.
  function clearWrongState() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    if (step.kind === 'try') {
      setDisplayFen(step.fen)
      setLastMove(undefined)
    } else if (step.kind === 'judgment') {
      setJudgmentChoice(null)
    }
    setAttemptState('idle')
  }

  function handleMove(from: Key, to: Key) {
    if (step.kind !== 'try') return
    if (attemptState !== 'idle' || from !== step.pieceSquare) return
    setLastMove([from, to])

    if ((correctSquares as string[]).includes(to)) {
      setChosenCorrectSquare(to)
      if (step.requiresPromotionChoice) {
        // Hold here — the move isn't "done" until a piece is actually
        // chosen (chess.js itself would throw calling .move() without one;
        // see applyPromotionMove's own comment). Show the pawn arriving so
        // the drag still feels completed, then swap it for the chosen
        // piece once picked.
        setDisplayFen(applyRawMove(step.fen, from, to))
        setAwaitingPromotion({ from, to, fen: step.fen })
        return
      }
      // Castling moves a second piece (the rook) as a real side effect —
      // applyRawMove only ever relocates the one piece it's told about, so
      // it would leave the rook stuck on its original square. A real
      // chess.js move resolves the rook's jump correctly; every other
      // filterMode keeps the simpler display-only applyRawMove.
      setDisplayFen(step.filterMode === 'castling' ? applyCastlingMove(step.fen, from, to) : applyRawMove(step.fen, from, to))
      setAttemptState('correct')
      advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
      return
    }

    setDisplayFen(applyRawMove(step.fen, from, to))
    setWrongKind(classifyWrongAttempt(step.fen, step.pieceSquare, to))
    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
  }

  function handlePromotionChoice(piece: PromotionPiece) {
    if (!awaitingPromotion) return
    setDisplayFen(applyPromotionMove(awaitingPromotion.fen, awaitingPromotion.from, awaitingPromotion.to, piece))
    setAwaitingPromotion(null)
    setAttemptState('correct')
    advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
  }

  function handleJudgmentAnswer(index: number) {
    if (step.kind !== 'judgment' || attemptState !== 'idle') return
    setJudgmentChoice(index)
    if (index === step.correctOptionIndex) {
      setAttemptState('correct')
      advanceTimer.current = setTimeout(advanceStep, ADVANCE_DELAY)
      return
    }
    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    setStepIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  // 4 tiers now, not 3 (see feedbackCopy.ts): 0 = the question, 1 = a nudge,
  // 2 = reveal the destination (unchanged from before, just renumbered),
  // 3 = a full demonstration. Applies to both `try` and `judgment` steps —
  // a real move attempt and a position-recognition guess are both "trying
  // something and getting it wrong," just with different follow-through.
  // Math.max, not a replacement — a manual Hint/Show Me request (forcedHintTier)
  // never regresses the automatic wrongAttempts-driven tier, and a later wrong
  // attempt still climbs normally even after a hint was already requested.
  const hintTier =
    step.kind === 'try' || step.kind === 'judgment' ? Math.max(forcedHintTier ?? 0, hintTierFor(wrongAttempts)) : 0
  const showSquares = step.kind === 'try' && (step.revealSquaresFrom === 'start' || hintTier >= 2)
  const demonstrating = hintTier >= 3

  let promptLines: string[]
  let stageLabel: string
  if (allDone) {
    promptLines = [completionHeadline]
    stageLabel = 'COMPLETE'
  } else if (step.kind === 'demo') {
    promptLines = step.text
    stageLabel = step.stageLabel
  } else if (attemptState === 'correct' && step.kind === 'try') {
    const usedAlternate = !!step.alternateCorrectText && chosenCorrectSquare !== (correctSquares as string[])[0]
    promptLines = [`✓ That's it! ${usedAlternate ? step.alternateCorrectText : step.correctText}`]
    stageLabel = step.stageLabel
  } else if (attemptState === 'correct' && step.kind === 'judgment') {
    promptLines = [`✓ ${step.correctText}`]
    stageLabel = step.stageLabel
  } else if (step.kind === 'try' || step.kind === 'judgment') {
    if (hintTier === 0) {
      promptLines = [step.prompt]
    } else if (hintTier === 1) {
      // Only a `try` step has a real chess move to classify as illegal vs.
      // legal-but-wrong-goal — a judgment step is a multiple-choice guess,
      // no legality axis to speak of.
      promptLines = [step.kind === 'try' && wrongKind ? `${wrongKindPrefix(wrongKind)} ${step.wrongText}` : step.wrongText]
    } else if (hintTier === 2) {
      promptLines = ['Need a hint?', step.hintText]
    } else {
      promptLines =
        step.kind === 'try'
          ? [DEMONSTRATION_INTRO, step.demonstrationText ?? demonstrationFallbackText(step.pieceSquare, (correctSquares as string[])[0])]
          : [DEMONSTRATION_INTRO, `${step.hintText} The answer is: ${step.options[step.correctOptionIndex]}.`]
    }
    stageLabel = step.stageLabel
  } else {
    promptLines = []
    stageLabel = ''
  }

  const highlightSquares =
    step.kind === 'demo' || step.kind === 'judgment'
      ? (step.highlightSquares as Key[] | undefined)
      : showSquares
        ? (correctSquares as Key[])
        : undefined
  const hintArrow =
    (step.kind === 'demo' || step.kind === 'judgment') && step.arrows?.[0]
      ? (step.arrows[0] as Key[])
      : demonstrating && step.kind === 'try'
        ? ([step.pieceSquare, (correctSquares as string[])[0]] as Key[])
        : undefined
  const celebrating = allDone && !showModal
  const turnColor = step.pieceColor === 'w' ? 'white' : 'black'
  const isReactionMoment = attemptState === 'correct' || allDone
  const showBack = !allDone && stepIndex > 0 && attemptState !== 'correct'
  // A `demo` step can always advance (matches its always-visible Next
  // button); every other kind only once solved — `try`/`judgment` have no
  // manual Next button at all (they auto-advance via advanceTimer), so this
  // also doubles as "is voice allowed to skip the wait and advance now."
  const canVoiceAdvance = step.kind === 'demo' || attemptState === 'correct'

  const spokenText = promptLines.join('. ')
  // "Voice: On" alone says narration is allowed, not what it's doing right
  // now — null once a step is already solved/done, where neither "still
  // talking" nor "waiting on you" is the right read. A plain demo step has
  // no action pending (reading, then Next) — only try/judgment actually
  // expect the learner to do something, so "Your turn" is reserved for
  // those; a plain demo gets "Ready to continue" instead.
  const expectingAction = step.kind === 'try' || step.kind === 'judgment'
  const voiceStatus: 'speaking' | 'yourTurn' | 'readyToContinue' | null = voice.speaking
    ? 'speaking'
    : allDone || attemptState === 'correct'
      ? null
      : expectingAction
        ? 'yourTurn'
        : 'readyToContinue'

  // Speaks the newly-revealed tier text the instant a Hint/Show Me request
  // (click or voice) changes forcedHintTier — NOT on every render, and NOT
  // when wrongAttempts alone drives the tier up, which is exactly what
  // keeps this within "no autoplay, only a direct result of a request."
  // Deliberately keyed only on forcedHintTier: this effect body is
  // recreated fresh every render (closing over that render's own
  // spokenText), React only ever INVOKES the one from the render where
  // forcedHintTier actually changed, so the text spoken is always current.
  useEffect(() => {
    if (forcedHintTier === null) return
    voice.speak(spokenText)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above; spokenText/voice intentionally excluded so this only fires on an actual Hint/Show Me request.
  }, [forcedHintTier])

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (step.kind !== 'try' && step.kind !== 'judgment') {
      voice.speak("This step doesn't need a hint. Read it, then tap Next.")
      return
    }
    setForcedHintTier((t) => Math.min((t ?? hintTierFor(wrongAttempts)) + 1, HINT_TIER_COUNT - 1))
  }

  function requestShowMe() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    if (step.kind !== 'try' && step.kind !== 'judgment') {
      voice.speak("This step doesn't need a demonstration. Read it, then tap Next.")
      return
    }
    setForcedHintTier(HINT_TIER_COUNT - 1)
  }

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
        voice.speak(spokenText)
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
        if (canVoiceAdvance) {
          if (advanceTimer.current) clearTimeout(advanceTimer.current)
          advanceStep()
        } else {
          voice.speak('Finish this step first.')
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

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={displayFen}
            turnColor={turnColor}
            dests={started && step.kind === 'try' && !awaitingPromotion ? dests : new Map<Key, Key[]>()}
            orientation={step.pieceColor === 'b' ? 'black' : 'white'}
            viewOnly={!started || step.kind !== 'try' || attemptState !== 'idle' || allDone || !!awaitingPromotion}
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
          {/* The mandatory "which piece?" choice — chess.js itself has no
              default here (see applyPromotionMove's comment), and all four
              are equally legal, so the point is making the choice, not
              judging it. */}
          {awaitingPromotion && (
            <div className={styles.promotionPicker}>
              <p className={styles.promotionPickerLabel}>Choose a piece:</p>
              <div className={styles.answerRow}>
                {PROMOTION_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className={styles.answerBtn}
                    onClick={() => handlePromotionChoice(choice.value)}
                  >
                    <span aria-hidden="true">{step.pieceColor === 'w' ? choice.whiteGlyph : choice.blackGlyph}</span> {choice.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelCol}>
        {!started ? (
          // One explicit click gates the whole lesson — see handleStart's
          // own comment for why the speak() call has to live inside this
          // click, not a later effect.
          <>
            <div className={styles.stepCounterRow}>
              <span className={styles.stepCounter}>{pieceName}</span>
            </div>
            <div className={styles.promptPlain}>
              <p className={styles.promptText}>Ready to begin?</p>
            </div>
            <div className={styles.actionsSpacer} />
            <div className={styles.actions}>
              <button type="button" className={styles.actionBtn} onClick={handleStart}>
                Start lesson →
              </button>
            </div>
          </>
        ) : (
          <>
        <div className={styles.stepCounterRow}>
          <span className={styles.stepCounter}>{allDone ? 'Complete' : `${stepIndex + 1} of ${steps.length}`}</span>
          {!allDone && stageLabel && <span className={styles.stageEyebrow}>{titleCase(stageLabel)}</span>}
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.round(((allDone ? steps.length : stepIndex + 1) / steps.length) * 100)}%` }}
          />
        </div>

        <div
          className={
            isReactionMoment
              ? `${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''} ${
                  allDone ? styles.promptCardDone : ''
                }`
              : styles.promptPlain
          }
        >
          {promptLines.map((line, i) => (
            <p key={i} className={styles.promptText}>
              {line}
            </p>
          ))}
        </div>

        {/* Answering lives right under the question, not in the fixed
            footer below — same placement BoardLesson uses for yesNo, for
            the same reason (answering and navigating are different
            actions that happen to have shared a row before). */}
        {!allDone && step.kind === 'judgment' && attemptState !== 'correct' && (
          <div className={styles.answerRow}>
            {step.options.map((option, i) => (
              <button
                key={option}
                type="button"
                className={`${styles.answerBtn} ${attemptState === 'reverting' && judgmentChoice === i ? styles.answerBtnWrong : ''}`}
                onClick={() => handleJudgmentAnswer(i)}
                disabled={attemptState === 'reverting'}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {!allDone && (
          <VoiceControls
            supported={voice.supported}
            micSupported={voice.micSupported}
            voiceOn={!voice.muted}
            rate={voice.rate}
            listening={voice.listening}
            showHintControls={step.kind === 'try' || step.kind === 'judgment'}
            onToggleVoice={voice.toggleMute}
            onSetRate={voice.setSpeechRate}
            onReplay={() => voice.speak(spokenText)}
            onHint={requestHint}
            onShowMe={requestShowMe}
            onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
            onMicEnd={voice.stopPushToTalk}
          />
        )}

        {/* Right above Next, bottom-right — moved out of the control row
            above, where it used to sit oddly wedged between buttons. */}
        {!allDone && <VoiceStatusLine status={voiceStatus} />}

        {/* Fixed footer — always in the same position for every step. */}
        <div className={styles.actionsSpacer} />
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtnGhost} ${!showBack ? styles.actionBtnHidden : ''}`}
            onClick={handleBack}
            disabled={!showBack}
            tabIndex={showBack ? 0 : -1}
          >
            ← Back
          </button>
          {!allDone && step.kind === 'demo' && !voice.speaking && (
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
          </>
        )}
      </div>

      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalTag}>✓ {pieceName} completed</p>
            <p className={styles.modalHeading}>🎉 {completionHeadline}</p>
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
