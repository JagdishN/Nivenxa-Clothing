'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board, { type BoardMarkerKind } from '@/components/chess/Board'
import { correctSquaresFor, wrongSquarePool, applyRawMove, applyPromotionMove, applyCastlingMove, type MoveFilterMode } from './moveTrainerLogic'
import { hintTierFor, HINT_TIER_COUNT, classifyWrongAttempt, wrongKindPrefix, DEMONSTRATION_INTRO, demonstrationFallbackText, type WrongKind } from './feedbackCopy'
import { clearStepResults, getResumeStep, loadStepResults, markLessonCompleted, saveStepResult, updateLessonStep } from '@/lib/chess/basicsProgress'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import LessonNav from './LessonNav'
import { ASSIST_LABEL, assistFromTier, describeSummary, isIndependent, mergeResult, summarize, type Assist, type StepResults } from './lessonAssist'
import { useBoardTheme } from './useBoardTheme'
import styles from './PieceLesson.module.scss'

type PromotionPiece = 'q' | 'r' | 'b' | 'n'
const PROMOTION_CHOICES: { value: PromotionPiece; label: string; whiteGlyph: string; blackGlyph: string }[] = [
  { value: 'q', label: 'Queen', whiteGlyph: '♕', blackGlyph: '♛' },
  { value: 'r', label: 'Rook', whiteGlyph: '♖', blackGlyph: '♜' },
  { value: 'b', label: 'Bishop', whiteGlyph: '♗', blackGlyph: '♝' },
  { value: 'n', label: 'Knight', whiteGlyph: '♘', blackGlyph: '♞' },
]

const REVERT_DELAY = 700
const CELEBRATE_DURATION = 1300

/** A shape-coded square marker (see Board's BoardMarkerKind): dot = can move here, ring = can capture, cross = blocked. */
export interface PieceMarker {
  square: string
  kind: BoardMarkerKind
}

export interface PieceDemoStep {
  kind: 'demo'
  /** e.g. "SEE IT MOVE", "JUMPING OVER" — authoring label. */
  stageLabel: string
  fen: string
  pieceColor: 'w' | 'b'
  /** Which side is at the bottom of the screen. Defaults to the side of `pieceColor`; a Black-pawn step that should keep the usual White-at-the-bottom view sets 'white'. */
  orientation?: 'white' | 'black'
  /** Squares to circle, illustrating the movement pattern. */
  highlightSquares?: string[]
  /** Shape-coded squares: where a piece can move, can capture, or is blocked. */
  markers?: PieceMarker[]
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
  orientation?: 'white' | 'black'
  filterMode: MoveFilterMode
  /** Narrow the filterMode-derived legal squares down to a specific subset. */
  onlyTo?: string[]
  prompt: string
  wrongText: string
  /** Hint tier 2 (a visual cue): says where to look. */
  hintText: string
  /** Hint tier 1 (a reminder), shown before the visual cue when no wrong move has been made yet. */
  reminderText?: string
  revealSquaresFrom: 'start' | 'hint'
  correctText: string
  alternateCorrectText?: string
  hintAreaSquares?: string[]
  demonstrationText?: string
  requiresPromotionChoice?: boolean
  /** Squares marked while the learner tries (e.g. a blocked square). */
  markers?: PieceMarker[]
  /** A fresh, equivalent attempt offered after a hint or Show me — same skill, different position. */
  retry?: Partial<Omit<PieceTryStep, 'kind' | 'retry' | 'stageLabel'>>
}

/** "Recognize this real position" — a question over an arbitrary FEN with N answer options. */
export interface PieceJudgmentStep {
  kind: 'judgment'
  stageLabel: string
  fen: string
  pieceColor: 'w' | 'b'
  orientation?: 'white' | 'black'
  highlightSquares?: string[]
  markers?: PieceMarker[]
  arrows?: [string, string][]
  prompt: string
  options: string[]
  correctOptionIndex: number
  correctText: string
  wrongText: string
  hintText: string
  reminderText?: string
}

export type PieceLessonStep = PieceDemoStep | PieceTryStep | PieceJudgmentStep

export interface PieceLessonExample {
  steps: PieceLessonStep[]
  pieceName: string
  completionHeadline: string
  completionAssistedHeadline?: string
  completionSummary?: string[]
}

type AttemptState = 'idle' | 'correct' | 'reverting'

const MODE_LABEL: Record<PieceLessonStep['kind'], string> = { demo: 'LEARN', try: 'TRY IT', judgment: 'TRY IT' }

const LEGEND: Partial<Record<BoardMarkerKind, string>> = { forward: '● can move here', capture: '◎ can capture here', blocked: '✕ blocked' }

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
  const { steps, pieceName, completionHeadline, completionAssistedHeadline, completionSummary } = example
  const [stepIndex, setStepIndex] = useState(0)
  const baseStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const [started, setStarted] = useState(false)
  const [resume, setResume] = useState<{ step: number; total: number } | null>(null)
  const [variant, setVariant] = useState(false)
  const [results, setResults] = useState<StepResults>({})
  const [boardTheme] = useBoardTheme()

  // The step actually shown: the base step, or its fresh-attempt variant (a try step with its own position).
  const step: PieceLessonStep = useMemo(() => (variant && baseStep.kind === 'try' && baseStep.retry ? ({ ...baseStep, ...baseStep.retry } as PieceTryStep) : baseStep), [variant, baseStep])

  const [displayFen, setDisplayFen] = useState(baseStep.fen)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined)
  const [wrongSquare, setWrongSquare] = useState<Key | null>(null)
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [wrongKind, setWrongKind] = useState<WrongKind | null>(null)
  const [awaitingPromotion, setAwaitingPromotion] = useState<{ from: Key; to: Key; fen: string } | null>(null)
  const [chosenCorrectSquare, setChosenCorrectSquare] = useState<string | null>(null)
  const [judgmentChoice, setJudgmentChoice] = useState<number | null>(null)
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voice = useLessonVoice()
  const pendingIntro = useRef(false)
  useEffect(() => {
    if (!pendingIntro.current || !voice.supported) return
    pendingIntro.current = false
    if (!voice.muted) voice.speak(introTextFor(steps[0]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when speech support becomes known.
  }, [voice.supported])

  // Only offer to continue when the saved position still fits this lesson (a lesson that was later reworked may have a different length).
  const canResume = !!resume && resume.step > 1 && resume.step <= steps.length && resume.total === steps.length

  const practiceSteps = useMemo(() => steps.flatMap((s, i) => (s.kind === 'try' || s.kind === 'judgment' ? [i] : [])), [steps])

  useEffect(() => {
    setResults(loadStepResults(slug) as StepResults)
    setResume(getResumeStep(slug))
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('start') === '1') {
      // Arrived through "Next lesson": begin at once, no second Start click.
      setStarted(true)
      pendingIntro.current = true
    }
  }, [slug])

  useEffect(() => {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    voice.cancel()
    setVariant(false)
    setDisplayFen(steps[stepIndex].fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
    setWrongSquare(null)
    setWrongKind(null)
    setAwaitingPromotion(null)
    setChosenCorrectSquare(null)
    setJudgmentChoice(null)
    setForcedHintTier(null)
    updateLessonStep(slug, stepIndex + 1, steps.length)
    if (started && !voice.muted) voice.speak(introTextFor(steps[stepIndex]))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- must run once per stepIndex change only.
  }, [stepIndex, slug, steps.length])

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

  const summary = useMemo(() => summarize(results, practiceSteps), [results, practiceSteps])
  const helpedAny = summary.withHelp > 0
  const finalHeadline = helpedAny && completionAssistedHeadline ? completionAssistedHeadline : completionHeadline

  useEffect(() => {
    if (!showModal) return
    voice.speak(helpedAny ? [finalHeadline, describeSummary(summary)].join('. ') : [finalHeadline, ...(completionSummary ?? [])].join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on showModal.
  }, [showModal])

  const recordResult = useCallback(
    (assist: Assist) => {
      setResults((prev) => {
        const merged = mergeResult(prev[stepIndex], assist)
        saveStepResult(slug, stepIndex, merged)
        return { ...prev, [stepIndex]: merged }
      })
    },
    [slug, stepIndex]
  )

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

  function handleBack() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function handleStart(fromStep = 0) {
    setStarted(true)
    if (fromStep > 0) setStepIndex(fromStep)
    voice.speak(introTextFor(steps[fromStep]))
  }

  function clearWrongState() {
    if (revertTimer.current) clearTimeout(revertTimer.current)
    if (step.kind === 'try') {
      setDisplayFen(step.fen)
      setLastMove(undefined)
      setWrongSquare(null)
    } else if (step.kind === 'judgment') {
      setJudgmentChoice(null)
    }
    setAttemptState('idle')
  }

  const hintTier = step.kind === 'try' || step.kind === 'judgment' ? Math.max(forcedHintTier ?? 0, hintTierFor(wrongAttempts)) : 0

  function handleMove(from: Key, to: Key) {
    if (step.kind !== 'try') return
    if (attemptState !== 'idle' || from !== step.pieceSquare) return
    setLastMove([from, to])

    if ((correctSquares as string[]).includes(to)) {
      setChosenCorrectSquare(to)
      if (step.requiresPromotionChoice) {
        setDisplayFen(applyRawMove(step.fen, from, to))
        setAwaitingPromotion({ from, to, fen: step.fen })
        return
      }
      setDisplayFen(step.filterMode === 'castling' ? applyCastlingMove(step.fen, from, to) : applyRawMove(step.fen, from, to))
      setAttemptState('correct')
      recordResult(assistFromTier(hintTier))
      return
    }

    // Not a correct answer: the attempt is shown for a moment, with its destination marked, then put back. (Only ever the learner's own try.)
    setDisplayFen(applyRawMove(step.fen, from, to))
    setWrongSquare(to)
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
    recordResult(assistFromTier(hintTier))
  }

  function handleJudgmentAnswer(index: number) {
    if (step.kind !== 'judgment' || attemptState !== 'idle') return
    setJudgmentChoice(index)
    if (index === step.correctOptionIndex) {
      setAttemptState('correct')
      recordResult(assistFromTier(hintTier))
      return
    }
    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    revertTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
  }

  function handlePracticeAgain() {
    voice.cancel()
    clearStepResults(slug)
    setResults({})
    setStepIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  function startFreshTry() {
    if (baseStep.kind !== 'try' || !baseStep.retry) return
    if (revertTimer.current) clearTimeout(revertTimer.current)
    const v = { ...baseStep, ...baseStep.retry } as PieceTryStep
    setVariant(true)
    setDisplayFen(v.fen)
    setAttemptState('idle')
    setWrongAttempts(0)
    setLastMove(undefined)
    setWrongSquare(null)
    setWrongKind(null)
    setAwaitingPromotion(null)
    setChosenCorrectSquare(null)
    setForcedHintTier(null)
    voice.speak(v.prompt)
  }

  const showSquares = step.kind === 'try' && attemptState !== 'correct' && (step.revealSquaresFrom === 'start' || hintTier >= 2)
  const demonstrating = hintTier >= 3

  // The task stays visible as a heading through hints and feedback (and after success); the body below it changes.
  const heading = !allDone && (step.kind === 'try' || step.kind === 'judgment') ? step.prompt : undefined
  let promptLines: string[]
  if (allDone) {
    promptLines = [finalHeadline]
  } else if (step.kind === 'demo') {
    promptLines = step.text
  } else if (attemptState === 'correct' && step.kind === 'try') {
    const usedAlternate = !!step.alternateCorrectText && chosenCorrectSquare !== (correctSquares as string[])[0]
    promptLines = [`✓ ${usedAlternate ? step.alternateCorrectText : step.correctText}`]
  } else if (attemptState === 'correct' && step.kind === 'judgment') {
    promptLines = [`✓ ${step.correctText}`]
  } else if (step.kind === 'try' || step.kind === 'judgment') {
    if (hintTier === 0) {
      promptLines = []
    } else if (hintTier === 1) {
      const prefix = step.kind === 'try' && wrongKind ? wrongKindPrefix(wrongKind) : ''
      promptLines = [
        wrongAttempts > 0
          ? prefix && !step.wrongText.startsWith(prefix.replace(/\.$/, ''))
            ? `${prefix} ${step.wrongText}`
            : step.wrongText
          : (step.reminderText ?? 'Think about how this piece moves, then try again.'),
      ]
    } else if (hintTier === 2) {
      promptLines = ['A hint:', step.hintText]
    } else {
      promptLines =
        step.kind === 'try'
          ? [DEMONSTRATION_INTRO, step.demonstrationText ?? demonstrationFallbackText(step.pieceSquare, (correctSquares as string[])[0])]
          : [DEMONSTRATION_INTRO, `${step.hintText} The answer is: ${step.options[step.correctOptionIndex]}.`]
    }
  } else {
    promptLines = []
  }

  const markers = useMemo(() => {
    if (allDone) return undefined
    const out: { square: Key; kind: BoardMarkerKind }[] = []
    for (const m of step.markers ?? []) out.push({ square: m.square as Key, kind: m.kind })
    if (step.kind === 'try' && showSquares) {
      const kind: BoardMarkerKind = step.filterMode === 'captures' ? 'capture' : 'forward'
      for (const sq of correctSquares) if (!out.some((m) => m.square === sq)) out.push({ square: sq, kind })
    }
    if (step.kind === 'try' && wrongSquare) out.push({ square: wrongSquare, kind: 'blocked' })
    return out.length ? out : undefined
  }, [allDone, step, showSquares, correctSquares, wrongSquare])

  const highlightSquares = step.kind === 'demo' || step.kind === 'judgment' ? (step.highlightSquares as Key[] | undefined) : undefined
  const hintArrow =
    (step.kind === 'demo' || step.kind === 'judgment') && step.arrows?.[0] ? (step.arrows[0] as Key[]) : demonstrating && step.kind === 'try' ? ([step.pieceSquare, (correctSquares as string[])[0]] as Key[]) : undefined
  const celebrating = allDone && !showModal
  const orientation = step.orientation ?? (step.pieceColor === 'b' ? 'black' : 'white')
  const turnColor = step.pieceColor === 'w' ? 'white' : 'black'
  const isPractice = step.kind === 'try' || step.kind === 'judgment'
  const earlier = results[stepIndex]
  const nextAvailable = !allDone && (step.kind === 'demo' || attemptState === 'correct' || (isPractice && earlier !== undefined))
  const legendKinds = (['forward', 'capture', 'blocked'] as BoardMarkerKind[]).filter((k) => (markers ?? []).some((m) => m.kind === k && !(k === 'blocked' && step.kind === 'try' && m.square === wrongSquare)))
  const hasRetry = baseStep.kind === 'try' && !!baseStep.retry && !variant
  const showFreshTry = attemptState === 'correct' && hasRetry && results[stepIndex] !== undefined && !isIndependent(results[stepIndex])

  const spokenText = (promptLines.length ? promptLines.join('. ') : (heading ?? '')).replace(/^✓ /, '')
  const voiceStatus: 'speaking' | null = voice.speaking ? 'speaking' : null

  useEffect(() => {
    if (forcedHintTier === null) return
    voice.speak(spokenText)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only on an actual Hint/Show me request.
  }, [forcedHintTier])

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') return voice.speak('You already did this one. Choose Next when you are ready.')
    if (!isPractice) return voice.speak("This step doesn't need a hint. Read it, then choose Next.")
    setForcedHintTier((t) => Math.min((t ?? hintTier) + 1, HINT_TIER_COUNT - 1))
  }

  function requestShowMe() {
    if (allDone) return
    if (attemptState === 'correct') return voice.speak('You already did this one. Choose Next when you are ready.')
    if (!isPractice) return voice.speak("This step doesn't need a demonstration. Read it, then choose Next.")
    setForcedHintTier(HINT_TIER_COUNT - 1)
  }

  function requestTryAgain() {
    if (attemptState !== 'reverting') return
    clearWrongState()
    voice.speak('Go ahead, try again.')
  }

  function handleVoiceCommand(command: VoiceCommand | null) {
    if (!command) return voice.speak("I didn't catch that. Please try again or use the buttons.")
    switch (command) {
      case 'repeat':
        return voice.speak(spokenText)
      case 'hint':
      case 'explain':
        return requestHint()
      case 'showMe':
        return requestShowMe()
      case 'tryAgain':
        return requestTryAgain()
      case 'next':
        if (nextAvailable) return advanceStep()
        return voice.speak('Finish this step first.')
      case 'pause':
        return voice.pause()
      case 'resume':
        return voice.resume()
    }
  }

  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (showModal) modalRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [showModal])

  return (
    <>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={displayFen}
            turnColor={turnColor}
            dests={started && step.kind === 'try' && !awaitingPromotion ? dests : new Map<Key, Key[]>()}
            orientation={orientation}
            viewOnly={!started || step.kind !== 'try' || attemptState !== 'idle' || allDone || !!awaitingPromotion}
            lastMove={lastMove}
            highlightSquares={allDone ? undefined : highlightSquares}
            highlightColor="green"
            hintArrow={allDone ? undefined : hintArrow}
            markers={markers}
            showDests={false}
            fixedPieces={step.kind !== 'try'}
            boardTheme={boardTheme}
            emphasizeCoordinates
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
          {awaitingPromotion && (
            <div className={styles.promotionPicker}>
              <p className={styles.promotionPickerLabel}>Choose a piece:</p>
              <div className={styles.answerRow}>
                {PROMOTION_CHOICES.map((choice) => (
                  <button key={choice.value} type="button" className={styles.answerBtn} onClick={() => handlePromotionChoice(choice.value)}>
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
          <>
            <div className={styles.stepCounterRow}>
              <span className={styles.stepCounter}>{pieceName}</span>
            </div>
            <div className={styles.promptPlain}>
              <p className={styles.promptText}>Ready to begin?</p>
              {canResume && (
                <p className={styles.promptText} data-testid="lesson-resume-note">
                  You stopped at step {resume!.step} of {resume!.total}.
                </p>
              )}
            </div>
            <div className={styles.actionsSpacer} />
            <div className={styles.actions}>
              {canResume && (
                <button type="button" className={styles.actionBtn} onClick={() => handleStart(resume!.step - 1)} data-testid="lesson-continue">
                  Continue from step {resume!.step}
                </button>
              )}
              <button type="button" className={resume && resume.step > 1 ? styles.actionBtnGhost : styles.actionBtn} onClick={() => handleStart(0)} data-testid="lesson-start">
                {resume && resume.step > 1 ? 'Start from the beginning' : 'Start lesson →'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.stepCounterRow}>
              <span className={styles.stepCounter} data-testid="lesson-step-counter">
                {allDone ? 'Complete' : `Step ${stepIndex + 1} of ${steps.length}`}
              </span>
              {!allDone && (
                <span className={styles.stageEyebrow} data-testid="lesson-mode">
                  {MODE_LABEL[step.kind]}
                </span>
              )}
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressFill} style={{ width: `${Math.round(((allDone ? steps.length : stepIndex + 1) / steps.length) * 100)}%` }} />
            </div>

            {heading && (
              <p className={styles.stepHeadline} data-testid="lesson-headline">
                {heading}
              </p>
            )}

            {promptLines.length > 0 && (
            <div className={attemptState === 'correct' || allDone ? `${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''} ${allDone ? styles.promptCardDone : ''}` : styles.promptPlain} data-testid="lesson-prompt" aria-live="polite">
              {promptLines.map((line, i) => (
                <p key={i} className={styles.promptText}>
                  {line}
                </p>
              ))}
            </div>
            )}

            {!allDone && isPractice && attemptState === 'correct' && results[stepIndex] && (
              <p className={styles.assistNote} data-testid="assist-note" data-assist={results[stepIndex]}>
                {ASSIST_LABEL[results[stepIndex]]}
              </p>
            )}
            {!allDone && isPractice && attemptState !== 'correct' && earlier !== undefined && (
              <p className={styles.assistNote} data-testid="assist-earlier" data-assist={earlier}>
                Earlier: {ASSIST_LABEL[earlier].toLowerCase()}. You can continue, or try this one again.
              </p>
            )}
            {showFreshTry && (
              <button type="button" className={styles.freshTry} onClick={startFreshTry} data-testid="fresh-try">
                Try a fresh one on your own
              </button>
            )}

            {/* What each marker shape on the board means — never colour alone. */}
            {!allDone && legendKinds.length > 0 && (
              <ul className={styles.legend} data-testid="marker-legend" aria-label="What the markers mean">
                {legendKinds.map((k) => (
                  <li key={k}>{LEGEND[k]}</li>
                ))}
              </ul>
            )}

            {!allDone && step.kind === 'judgment' && attemptState !== 'correct' && (
              <div className={styles.answerRow}>
                {step.options.map((option, i) => (
                  <button key={option} type="button" className={`${styles.answerBtn} ${attemptState === 'reverting' && judgmentChoice === i ? styles.answerBtnWrong : ''}`} onClick={() => handleJudgmentAnswer(i)} disabled={attemptState === 'reverting'}>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {!allDone && (
              <VoiceControls
                layout="lesson"
                supported={voice.supported}
                micSupported={voice.micSupported}
                voiceOn={!voice.muted}
                rate={voice.rate}
                listening={voice.listening}
                micNotice={voice.micNotice}
                showHintControls={isPractice}
                helpLocked={isPractice && attemptState === 'correct'}
                onToggleVoice={voice.toggleMute}
                onSetRate={voice.setSpeechRate}
                onReplay={() => voice.speak(spokenText)}
                onHint={requestHint}
                onShowMe={requestShowMe}
                onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
                onMicEnd={voice.stopPushToTalk}
              />
            )}

            {!allDone && <VoiceStatusLine status={voiceStatus} />}

            <div className={styles.actionsSpacer} />
            {allDone ? (
              <div className={styles.actions} data-testid="lesson-done-actions">
                {nextCta && (
                  <Link href={nextCta.href} className={styles.actionBtn} data-testid="lesson-next-lesson">
                    {nextCta.label}
                  </Link>
                )}
                <button type="button" className={styles.actionBtnGhost} onClick={handlePracticeAgain} data-testid="lesson-practice-again">
                  Practice again
                </button>
                <Link href="/chess/learn/basics" className={styles.actionBtnGhost} data-testid="lesson-back-to-basics">
                  Back to Chess Basics
                </Link>
              </div>
            ) : (
              <LessonNav
                onBack={handleBack}
                backAvailable={stepIndex > 0}
                onNext={advanceStep}
                nextAvailable={nextAvailable}
                nextLabel={isLast ? 'Finish lesson' : step.kind === 'demo' ? (step.ctaLabel ?? 'Next →') : 'Next →'}
                nextHelp="Finish this step to continue."
              />
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div
            ref={modalRef}
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-complete-title"
            data-testid="lesson-complete-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowModal(false)
              if (e.key === 'Tab') {
                const f = [...(modalRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])]
                if (!f.length) return
                const first = f[0]
                const last = f[f.length - 1]
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault()
                  last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault()
                  first.focus()
                }
              }
            }}
          >
            <p className={styles.modalTag}>✓ {pieceName} completed</p>
            <p id="lesson-complete-title" className={styles.modalHeading}>
              🎉 {finalHeadline}
            </p>
            {(completionSummary ?? []).map((line, i) => (
              <p key={i} className={styles.modalBody}>
                {line}
              </p>
            ))}
            {describeSummary(summary) && (
              <p className={styles.modalBody} data-testid="completion-assist-summary">
                {describeSummary(summary)}
              </p>
            )}
            <div className={styles.modalActions}>
              {nextCta && (
                <Link href={nextCta.href} className={styles.modalPrimary} data-autofocus data-testid="modal-next-lesson">
                  {nextCta.label}
                </Link>
              )}
              <button type="button" className={styles.modalSecondary} onClick={handlePracticeAgain} data-autofocus={nextCta ? undefined : true}>
                Practice again
              </button>
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
