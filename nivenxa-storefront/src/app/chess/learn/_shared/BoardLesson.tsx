'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { clearStepResults, getResumeStep, loadStepResults, markLessonCompleted, saveStepResult, updateLessonStep } from '@/lib/chess/basicsProgress'
import { hintTierFor, HINT_TIER_COUNT, DEMONSTRATION_INTRO } from './feedbackCopy'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import LessonNav from './LessonNav'
import SetupBoard, { PieceGlyph, fenFromPlacement, pieceLabel, type Placement } from './SetupBoard'
import { PIECE_TOTAL, diagnoseSetup, piecesLeft, removeSide, type SetupDiagnosis } from './lessonPlacement'
import { isLightSquare } from './squareColors'
import { ASSIST_LABEL, assistFromTier, describeSummary, isIndependent, mergeResult, summarize, type Assist, type StepResults } from './lessonAssist'
import { BOARD_THEMES, useBoardTheme, type BoardTheme } from './useBoardTheme'
import styles from './BoardLesson.module.scss'

export type { BoardTheme } from './useBoardTheme'

// A lightweight **bold** convention for step copy — lets a step emphasize only the phrase that matters. Not real Markdown.
function renderEmphasis(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

const EMPTY_DESTS = new Map<Key, Key[]>()
const REVERT_DELAY = 700
const CELEBRATE_DURATION = 1300

// The everyday colour NAME a learner would use for each theme's light/dark squares — for spoken feedback only.
const THEME_COLOR_NAMES: Record<BoardTheme, { light: string; dark: string }> = {
  cream: { light: 'cream', dark: 'brown' },
  green: { light: 'white', dark: 'green' },
  purple: { light: 'cream', dark: 'purple' },
}

export interface BoardDemoStep {
  kind: 'demo'
  /** Authoring-only categorization (e.g. "TWO COLOURS") — not shown verbatim; the panel shows LEARN / TRY IT / QUICK CHECK / SET UP. */
  stageLabel: string
  /** A short teaching title shown above the body text — e.g. "Light and dark squares". */
  headline?: string
  /** Overrides the lesson-level `fen` for just this step. */
  fen?: string
  highlightSquares?: string[]
  text: string[]
  /** One short, memorable rule shown as its own standout line below the body text. */
  rememberLine?: string
  /** Turns this step into the one-time board colour picker: three theme swatches. The choice is saved and used by every Chess Basics lesson. */
  colorPicker?: boolean
  ctaLabel?: string
  /** Boosts the board's rank/file coordinate labels for steps actively teaching them. */
  emphasizeCoordinates?: boolean
  /** Show coordinate labels on this step even if it is not teaching them (lessons after The Chessboard). */
  showCoordinates?: boolean
  /** A short, conversational spoken version of `text` — falls back to `text` itself when absent. */
  spokenText?: string[]
  /** Pieces that appear on the board from this step on (guided setup): square -> FEN letter. They stay for the rest of the lesson. */
  placePieces?: Placement
  /** Shows the compact piece-value chips (pawn ≈ 1 … queen ≈ 9) with the king kept apart as priceless. */
  valueSummary?: boolean
}

export interface BoardSquareQuizStep {
  kind: 'squareQuiz'
  stageLabel: string
  headline?: string
  fen?: string
  /** 'any' — completes when any one of `correctSquares` is chosen. 'all' — every square must be found, in any order. */
  mode: 'any' | 'all'
  correctSquares: string[]
  prompt: string | string[]
  wrongText: string
  /** Hint tier 2 (a visual cue): says where to look. Before coordinates are taught it must use plain, visual language — no square names. */
  hintText: string
  /** Hint tier 1 (a reminder), shown before the visual cue. */
  reminderText?: string
  revealSquaresFrom: 'start' | 'hint'
  correctText: string
  emphasizeCoordinates?: boolean
  showCoordinates?: boolean
  /** Opts this step into the "Show what you learned" checkpoint treatment. */
  checkpointItems?: string[]
  spokenPrompt?: string[]
  spokenCorrectText?: string
  spokenWrongText?: string
  /** Light/dark recognition quiz: spoken feedback is built from the square actually chosen and the current theme's colour names. */
  colorAwareSpokenFeedback?: 'light' | 'dark'
  hintAreaSquares?: string[]
  demonstrationSquare?: string
  /** What Show me says while demonstrating (falls back to hintText). */
  demonstrationText?: string
  /** Guided setup: these pieces appear on the board once the step is answered correctly (square -> FEN letter). */
  placePieces?: Placement
  /** A fresh, equivalent attempt offered after Show me or a hint — same skill, different target. */
  retry?: Partial<
    Pick<BoardSquareQuizStep, 'headline' | 'prompt' | 'correctSquares' | 'wrongText' | 'hintText' | 'reminderText' | 'correctText' | 'hintAreaSquares' | 'demonstrationSquare' | 'demonstrationText' | 'spokenPrompt'>
  >
}

export interface BoardYesNoStep {
  kind: 'yesNo'
  stageLabel: string
  headline?: string
  boardIsCorrect: boolean
  prompt: string
  correctText: string
  wrongText: string
  spokenPrompt?: string
  spokenCorrectText?: string
  spokenWrongText?: string
  hintText?: string
  spokenHintText?: string
}

/**
 * An independent set-up task: build `target` on an empty board from a labelled piece tray — click/tap/keyboard only,
 * dragging is never needed. Correct pieces are never reset by a correction.
 */
export interface BoardSetupStep {
  kind: 'setup'
  stageLabel: string
  headline?: string
  prompt: string[]
  spokenPrompt?: string[]
  /** The position to build. */
  target: Placement
  correctText: string
  /** Hint tier 1: a reminder of the teaching order. */
  reminderText: string
  /** Plain-language description of where each piece type goes, keyed by lower-case piece letter (r n b q k p). */
  groupHints: Record<string, string>
  showCoordinates?: boolean
}

export type BoardLessonStep = BoardDemoStep | BoardSquareQuizStep | BoardYesNoStep | BoardSetupStep

export interface BoardLessonExample {
  steps: BoardLessonStep[]
  /** Default position for the lesson — nothing here ever moves a piece, only clicks/observes it. A step can override this with its own `fen`. */
  fen: string
  lessonName: string
  completionHeadline?: string
  /** Used instead of completionHeadline when the learner needed help on some practice steps. */
  completionAssistedHeadline?: string
  completionSummary?: string[]
  completionSpokenText?: string
  /** Lessons after The Chessboard keep the coordinate labels visible on every step. */
  alwaysShowCoordinates?: boolean
}

type AttemptState = 'idle' | 'correct' | 'wrong'

// The piece types in the order the lesson teaches them.
const SETUP_ORDER = ['r', 'n', 'b', 'q', 'k', 'p']
const SETUP_NAMES: Record<string, string> = { r: 'rooks', n: 'knights', b: 'bishops', q: 'queens', k: 'kings', p: 'pawns' }
const TRAY: string[] = ['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p']

function SimpleCheckerboard({ correct, attemptState, theme }: { correct: boolean; attemptState: AttemptState; theme: BoardTheme }) {
  const { light, dark } = BOARD_THEMES.find((t) => t.value === theme) ?? BOARD_THEMES[0]
  const cells = []
  const ringClass = attemptState === 'correct' ? styles.cellAnswerCorrect : attemptState === 'wrong' ? styles.cellAnswerWrong : ''
  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      let isLight = (fileIdx + rank) % 2 === 0
      if (!correct) isLight = !isLight
      const isBottomRight = rank === 1 && fileIdx === 7
      cells.push(<span key={`${fileIdx}-${rank}`} className={isBottomRight ? ringClass : ''} style={{ background: isLight ? light : dark }} />)
    }
  }
  return (
    <div
      className={styles.simpleBoard}
      role="img"
      aria-label={`A chessboard. The corner nearest your right hand is ${correct ? 'light' : 'dark'}.`}
    >
      {cells}
    </div>
  )
}

function introTextFor(step: BoardLessonStep): string[] {
  if (step.kind === 'demo') return step.spokenText ?? step.text
  if (step.kind === 'yesNo') return [step.spokenPrompt ?? step.prompt]
  if (step.kind === 'setup') return step.spokenPrompt ?? step.prompt
  return step.spokenPrompt ?? (Array.isArray(step.prompt) ? step.prompt : [step.prompt])
}

function squareColorWord(square: string, theme: BoardTheme): string {
  const names = THEME_COLOR_NAMES[theme]
  return isLightSquare(square) ? names.light : names.dark
}

const FILES = 'abcdefgh'

/** Dynamic wrong-answer feedback for a coordinate-finding squareQuiz (a square, a whole file or a whole rank), inferred from the shape of `correctSquares`. */
function squareMistakeFeedback(clicked: string, correctSquares: string[]): string | null {
  if (correctSquares.length === 1) {
    const target = correctSquares[0]
    const sameFile = FILES.indexOf(clicked[0]) === FILES.indexOf(target[0])
    const sameRank = Number(clicked[1]) === Number(target[1])
    if (sameFile && !sameRank) return `You found column ${target[0]}. Now move ${Number(target[1]) > Number(clicked[1]) ? 'up' : 'down'} to row ${target[1]}.`
    if (sameRank && !sameFile) return `You found row ${target[1]}. Now find column ${target[0]}.`
    return `Let's start with the letter ${target[0]} along the bottom.`
  }
  if (correctSquares.length === 8 && correctSquares.every((sq) => sq[0] === correctSquares[0][0])) {
    return `Not quite. Find the letter ${correctSquares[0][0]} along the bottom, then follow that column up.`
  }
  if (correctSquares.length === 8 && correctSquares.every((sq) => sq[1] === correctSquares[0][1])) {
    return `Not quite. Find the number ${correctSquares[0][1]} along the side, then follow that row across.`
  }
  return null
}

function wrongFeedbackFor(step: BoardSquareQuizStep, clicked: string, theme: BoardTheme): string {
  if (step.colorAwareSpokenFeedback) {
    return `Not quite — that's a ${squareColorWord(clicked, theme)} square. Look for a ${THEME_COLOR_NAMES[theme][step.colorAwareSpokenFeedback]} square.`
  }
  return squareMistakeFeedback(clicked, step.correctSquares) ?? step.spokenWrongText ?? step.wrongText
}

function correctFeedbackFor(step: BoardSquareQuizStep, clicked: string | undefined, theme: BoardTheme, hintTier: number): string {
  if (clicked && step.colorAwareSpokenFeedback) {
    return `Yes! You picked a ${squareColorWord(clicked, theme)} square. In chess, we call that a ${step.colorAwareSpokenFeedback} square.`
  }
  if (step.correctSquares.length === 1) {
    const target = step.correctSquares[0]
    if (hintTier >= 3) return `That's ${target}. Let's try another square together.`
    if (hintTier >= 1) return `Yes! You followed column ${target[0]} to row ${target[1]}.`
    return `Yes! You found ${target}.`
  }
  return step.spokenCorrectText ?? step.correctText
}

function colorPickerReactionText(theme: BoardTheme): string {
  return `Great choice! We'll call that ${THEME_COLOR_NAMES[theme].light} the light squares and ${THEME_COLOR_NAMES[theme].dark} the dark squares.`
}

/** Which squares get the hint ring, by tier — a colour-aware quiz shows a small mixed area at tier 2 and exactly one example at tier 3. */
function hintSquaresFor(step: BoardSquareQuizStep, hintTier: number): string[] {
  if (step.colorAwareSpokenFeedback) {
    if (hintTier >= 3) return step.demonstrationSquare ? [step.demonstrationSquare] : step.correctSquares.slice(0, 1)
    return step.hintAreaSquares ?? step.correctSquares
  }
  return step.correctSquares
}

/** The piece groups still missing from `placed`, in teaching order. */
function missingGroups(target: Placement, placed: Placement): { type: string; squares: string[] }[] {
  const out: { type: string; squares: string[] }[] = []
  for (const type of SETUP_ORDER) {
    const squares = Object.keys(target).filter((sq) => target[sq].toLowerCase() === type && placed[sq] !== target[sq])
    if (squares.length) out.push({ type, squares })
  }
  return out
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
  const { steps, fen, lessonName, completionHeadline, completionAssistedHeadline, completionSummary, completionSpokenText, alwaysShowCoordinates } = example
  const [stepIndex, setStepIndex] = useState(0)
  const baseStep = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  // Gates the whole lesson behind one explicit click on a direct visit (that click is the gesture narration needs). A lesson reached
  // from "Next lesson" starts straight away (?start=1): the click on that link is the gesture.
  const [started, setStarted] = useState(false)
  const [resume, setResume] = useState<{ step: number; total: number } | null>(null)

  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [foundSquares, setFoundSquares] = useState<Set<string>>(new Set())
  // Mirrors of the answer state that update synchronously, so two quick taps in a row (before React re-renders) are never lost or double counted.
  const foundRef = useRef<Set<string>>(new Set())
  const doneRef = useRef(false)
  const [wrongSquare, setWrongSquare] = useState<string | null>(null)
  const [boardTheme, setBoardTheme] = useBoardTheme()
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  // Independent set-up task state.
  const [placed, setPlaced] = useState<Placement>({})
  // Mirrors `placed` synchronously, so two quick taps in a row never read a stale board.
  const placedRef = useRef<Placement>({})
  function updatePlaced(fn: (prev: Placement) => Placement) {
    const next = fn(placedRef.current)
    placedRef.current = next
    setPlaced(next)
  }
  const [tray, setTray] = useState<string | null>(null)
  const [setupWrong, setSetupWrong] = useState<string[]>([])
  const [setupMessage, setSetupMessage] = useState('')
  // What Check my setup found (patterns first), the pattern group being worked on, and a placed piece chosen to move or take off.
  const [diagnosis, setDiagnosis] = useState<SetupDiagnosis | null>(null)
  const [pickedSquare, setPickedSquare] = useState<string | null>(null)
  const [movingFrom, setMovingFrom] = useState<string | null>(null)

  // Which piece group Show me last placed (so its explanation names what was placed, not what is still missing).
  const [demoType, setDemoType] = useState<string | null>(null)
  // A fresh, equivalent attempt of the current step (after help).
  const [variant, setVariant] = useState(false)
  const [results, setResults] = useState<StepResults>({})
  const voice = useLessonVoice()
  // Set when the lesson began from a "Next lesson" link: its first narration waits until the voice hook has finished detecting the browser's speech support.
  const pendingIntro = useRef(false)
  useEffect(() => {
    if (!pendingIntro.current || !voice.supported) return
    pendingIntro.current = false
    if (!voice.muted) voice.speak(introTextFor(steps[0]).join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when speech support becomes known.
  }, [voice.supported])

  // Which steps are practice (need an answer) — used by the completion summary.
  // Only offer to continue when the saved position still fits this lesson (a lesson that was later reworked may have a different length).
  const canResume = !!resume && resume.step > 1 && resume.step <= steps.length && resume.total === steps.length

  const practiceSteps = useMemo(() => steps.flatMap((s, i) => (s.kind === 'squareQuiz' || s.kind === 'yesNo' || s.kind === 'setup' ? [i] : [])), [steps])

  // The step actually shown: the base step, or its fresh-attempt variant.
  const step: BoardLessonStep = useMemo(() => (variant && baseStep.kind === 'squareQuiz' && baseStep.retry ? { ...baseStep, ...baseStep.retry } : baseStep), [variant, baseStep])

  // Saved results + a resume offer are read after mount (never during render, so server and client markup match).
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
    if (flashTimer.current) clearTimeout(flashTimer.current)
    voice.cancel()
    foundRef.current = new Set()
    doneRef.current = false
    setAttemptState('idle')
    setWrongAttempts(0)
    setFoundSquares(new Set())
    setWrongSquare(null)
    setForcedHintTier(null)
    setVariant(false)
    placedRef.current = {}
    setPlaced({})
    setTray(null)
    setSetupWrong([])
    setSetupMessage('')
    setDiagnosis(null)
    setPickedSquare(null)
    setMovingFrom(null)
    setDemoType(null)
    updateLessonStep(slug, stepIndex + 1, steps.length)
    if (started && !voice.muted) voice.speak(introTextFor(steps[stepIndex]).join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- must run once per stepIndex change only.
  }, [stepIndex, slug, steps.length])

  useEffect(
    () => () => {
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

  const summary = useMemo(() => summarize(results, practiceSteps), [results, practiceSteps])
  const helpedAny = summary.withHelp > 0
  // A lesson with an independent set-up task says plainly whether the board was built alone or with help.
  const setupIdx = steps.findIndex((x) => x.kind === 'setup')
  const setupLine =
    setupIdx < 0 || results[setupIdx] === undefined
      ? ''
      : isIndependent(results[setupIdx])
        ? 'You set up the whole board on your own.'
        : 'You completed the guided setup and finished the board with some help. Use Practice again to build it on your own.'
  const finalHeadline = helpedAny && completionAssistedHeadline ? completionAssistedHeadline : (completionHeadline ?? `You learned ${lessonName}!`)

  function completionSpokenLine(): string {
    if (helpedAny || setupLine) return [finalHeadline, setupLine, describeSummary(summary)].filter(Boolean).join(' ')
    return completionSpokenText ?? [finalHeadline, ...(completionSummary ?? [])].join('. ')
  }

  useEffect(() => {
    if (!showModal) return
    voice.speak(completionSpokenLine())
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

  function advanceStep() {
    if (isLast) {
      setAllDone(true)
      markLessonCompleted(slug)
    } else setStepIndex((i) => i + 1)
  }

  function clearWrongState() {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setAttemptState('idle')
    setWrongSquare(null)
  }

  function handleBack() {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  function handleStart(fromStep = 0) {
    setStarted(true)
    if (fromStep > 0) setStepIndex(fromStep)
    voice.speak(introTextFor(steps[fromStep]).join('. '))
  }

  // hintTier is derived (never stored): wrong attempts escalate it, and a manual Hint/Show me request can only raise it.
  const hintTier = step.kind === 'squareQuiz' || step.kind === 'yesNo' || step.kind === 'setup' ? Math.max(forcedHintTier ?? 0, step.kind === 'setup' ? 0 : hintTierFor(wrongAttempts)) : 0

  function handleSquareClick(key: Key) {
    if (step.kind !== 'squareQuiz' || attemptState === 'correct' || doneRef.current) return
    const quizStep = step
    const isCorrect = quizStep.correctSquares.includes(key)
    if (flashTimer.current) clearTimeout(flashTimer.current)

    if (!isCorrect) {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      setWrongSquare(key)
      voice.speak(wrongFeedbackFor(quizStep, key, boardTheme))
      flashTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
      return
    }

    setWrongSquare(null)

    // Choosing a square that is already found changes nothing: the count never goes up twice.
    if (quizStep.mode === 'all' && foundRef.current.has(key)) return

    const finish = () => {
      recordResult(assistFromTier(hintTier))
      voice.speak(correctFeedbackFor(quizStep, key, boardTheme, hintTier))
    }

    if (quizStep.mode === 'any') {
      foundRef.current = new Set([key])
      doneRef.current = true
      setFoundSquares(foundRef.current)
      setAttemptState('correct')
      finish()
      return
    }

    const next = new Set(foundRef.current)
    next.add(key)
    foundRef.current = next
    setFoundSquares(next)
    if (next.size === quizStep.correctSquares.length) {
      doneRef.current = true
      setAttemptState('correct')
      finish()
    }
  }

  function handleChooseTheme(theme: BoardTheme) {
    if (step.kind !== 'demo' || !step.colorPicker) return
    setBoardTheme(theme)
    setAttemptState('correct')
    voice.speak(colorPickerReactionText(theme))
  }

  function handleYesNo(answer: boolean) {
    if (step.kind !== 'yesNo' || attemptState === 'correct') return
    if (flashTimer.current) clearTimeout(flashTimer.current)
    if (answer === step.boardIsCorrect) {
      setAttemptState('correct')
      recordResult(assistFromTier(hintTier))
      voice.speak(step.spokenCorrectText ?? step.correctText)
    } else {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      voice.speak(step.spokenWrongText ?? step.wrongText)
      flashTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
    }
  }

  // ── Independent set-up task ─────────────────────────────────────────────────────────────────────
  const setupDone = step.kind === 'setup' && attemptState === 'correct'

  function clearSetupFeedback() {
    setSetupMessage('')
    setSetupWrong([])
    setDiagnosis(null)
  }

  function cancelPlacing() {
    setTray(null)
    setMovingFrom(null)
    setPickedSquare(null)
  }

  function selectTray(letter: string) {
    if (step.kind !== 'setup' || setupDone) return
    clearSetupFeedback()
    setPickedSquare(null)
    setMovingFrom(null)
    if (piecesLeft(placedRef.current, letter) <= 0) {
      setTray(null)
      setSetupMessage(`All ${PIECE_TOTAL[letter.toLowerCase()]} ${pieceLabel(letter)}${PIECE_TOTAL[letter.toLowerCase()] === 1 ? ' is' : 's are'} already placed. Choose a piece that still has some left, or select a placed one to move or take off.`)
      return
    }
    setTray((t) => (t === letter ? null : letter))
  }

  function handleSetupSquare(square: string) {
    if (step.kind !== 'setup' || setupDone) return
    clearSetupFeedback()
    const occupant = placedRef.current[square]
    if (tray) {
      if (occupant) {
        if (square === movingFrom) return cancelPlacing()
        // Never replaces a piece silently.
        setSetupMessage(`${square} already has a ${pieceLabel(occupant)}. Choose an empty square, or Cancel.`)
        return
      }
      const moving = movingFrom
      if (!moving && piecesLeft(placedRef.current, tray) <= 0) {
        setTray(null)
        setSetupMessage(`All of those pieces are already placed.`)
        return
      }
      const letter = tray
      updatePlaced((prev) => {
        const next = { ...prev }
        if (moving) delete next[moving]
        next[square] = letter
        return next
      })
      setMovingFrom(null)
      // Keep placing the same piece while some are left; a move finishes after one placement.
      if (moving || piecesLeft(placedRef.current, letter) <= 0) setTray(null)
      return
    }
    if (occupant) {
      setPickedSquare((p) => (p === square ? null : square))
      return
    }
    setPickedSquare(null)
    setSetupMessage('Choose a piece from the tray first, then choose the square.')
  }

  function moveSelectedPiece() {
    if (!pickedSquare || !placedRef.current[pickedSquare]) return
    setTray(placedRef.current[pickedSquare])
    setMovingFrom(pickedSquare)
    setPickedSquare(null)
  }

  function takeOffPiece(square: string | null) {
    if (!square || setupDone || !placedRef.current[square]) return
    const label = pieceLabel(placedRef.current[square])
    updatePlaced((prev) => {
      const next = { ...prev }
      delete next[square]
      return next
    })
    clearSetupFeedback()
    setPickedSquare(null)
    if (movingFrom === square) cancelPlacing()
    setSetupMessage(`Took the ${label} off ${square}.`)
  }

  function removeWrongPieces() {
    const marked = setupWrong.length ? setupWrong : focusSquares
    updatePlaced((prev) => {
      const next = { ...prev }
      for (const sq of marked) delete next[sq]
      return next
    })
    clearSetupFeedback()
    setSetupMessage('Those pieces are back off the board. Everything else you placed is still there.')
  }

  function retrySide(side: 'white' | 'black') {
    if (step.kind !== 'setup' || setupDone) return
    const n = Object.values(placedRef.current).filter((p) => (p === p.toUpperCase()) === (side === 'white')).length
    updatePlaced((prev) => removeSide(prev, side))
    cancelPlacing()
    clearSetupFeedback()
    setSetupMessage(
      side === 'white'
        ? `White’s side is clear: ${n} White pieces came off, and all the Black pieces stayed. Place White on the two rows nearest you, ranks 1 and 2. Rooks go first, in the corners.`
        : `Black’s side is clear: ${n} Black pieces came off, and all the White pieces stayed. Place Black on the two rows at the top, ranks 7 and 8. Rooks go first, in the corners.`
    )
  }

  function editSetup() {
    if (step.kind !== 'setup') return
    // Unlocks the board. The result already recorded for this step is kept.
    setAttemptState('idle')
    clearSetupFeedback()
    setSetupMessage('You can change the board again. Choose Check my setup when you are ready.')
  }

  function describeDiagnosis(d: SetupDiagnosis): string {
    const parts: string[] = []
    const g = d.groups[0]
    if (g) {
      parts.push(g.message)
      if (d.groups.length > 1) parts.push(`There ${d.groups.length - 1 === 1 ? 'is 1 more pattern' : `are ${d.groups.length - 1} more patterns`} to look at after this one.`)
    } else if (d.individual.length) {
      parts.push(`${d.individual.length} ${d.individual.length === 1 ? 'piece is' : 'pieces are'} in the wrong place (marked ✕).`)
    }
    if (d.missing.length) parts.push(`${d.missing.length} ${d.missing.length === 1 ? 'square is' : 'squares are'} still empty.`)
    if (d.correct > 0) parts.push(`${d.correct} ${d.correct === 1 ? 'piece is' : 'pieces are'} already right and will stay.`)
    return parts.join(' ')
  }

  function checkSetup() {
    if (step.kind !== 'setup' || setupDone) return
    const current = placedRef.current
    if (Object.keys(current).length === 0) {
      setSetupMessage('Place some pieces first: choose a piece from the tray, then choose its square.')
      return
    }
    const d = diagnoseSetup(current, step.target)
    cancelPlacing()
    if (d.complete) {
      setDiagnosis(null)
      setSetupWrong([])
      setAttemptState('correct')
      setSetupMessage('')
      recordResult(assistFromTier(hintTier))
      voice.speak(step.correctText)
      return
    }
    // A failed check is not a hint: it changes no help level (the tier for this step only comes from Hint and Show me).
    setWrongAttempts((n) => n + 1)
    setDiagnosis(d)
    setSetupWrong(d.groups.length ? [] : d.individual)
    const message = describeDiagnosis(d)
    setSetupMessage(message)
    voice.speak(message.replace('✕', 'cross'))
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
    if (baseStep.kind !== 'squareQuiz' || !baseStep.retry) return
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setVariant(true)
    foundRef.current = new Set()
    doneRef.current = false
    setAttemptState('idle')
    setWrongAttempts(0)
    setFoundSquares(new Set())
    setWrongSquare(null)
    setForcedHintTier(null)
    // Speak the new prompt (the step-change effect does not run for a variant).
    const v = { ...baseStep, ...baseStep.retry }
    voice.speak((v.spokenPrompt ?? (Array.isArray(v.prompt) ? v.prompt : [v.prompt])).join('. '))
  }

  const showHintSquares = step.kind === 'squareQuiz' && attemptState !== 'correct' && (step.revealSquaresFrom === 'start' || hintTier >= 2)

  // The task heading stays visible through feedback; only the completion screen drops it.
  // The task heading stays through hints and feedback. A quiz with no separate title uses its question as the heading.
  const promptAsLines = step.kind === 'squareQuiz' ? (Array.isArray(step.prompt) ? step.prompt : [step.prompt]) : []
  const promptIsHeading = !allDone && step.kind === 'squareQuiz' && !step.headline
  const headline = !allDone ? (step.headline ?? (promptIsHeading ? promptAsLines[0] : undefined)) : undefined

  let promptLines: string[]
  let modeLabel: string
  if (allDone) {
    promptLines = [finalHeadline]
    modeLabel = 'COMPLETE'
  } else if (step.kind === 'demo') {
    modeLabel = 'LEARN'
    promptLines = step.colorPicker && attemptState === 'correct' ? ['Great choice!', 'Whatever the colours, we still call them **LIGHT** and **DARK** squares.'] : step.text
  } else if (step.kind === 'yesNo') {
    modeLabel = 'TRY IT'
    if (attemptState === 'correct') promptLines = [`✓ ${step.correctText}`]
    else if (attemptState === 'wrong') promptLines = [step.wrongText]
    else if (hintTier >= 3) promptLines = [DEMONSTRATION_INTRO, `The answer is ${step.boardIsCorrect ? 'yes' : 'no'}. ${step.spokenCorrectText ?? step.correctText}`]
    else if (hintTier >= 1) promptLines = [step.hintText ?? step.wrongText]
    else promptLines = [step.prompt]
  } else if (step.kind === 'setup') {
    modeLabel = 'SET UP'
    const next = missingGroups(step.target, placed)[0]
    if (attemptState === 'correct') promptLines = [`✓ ${step.correctText}`]
    else if (hintTier >= 3) promptLines = [DEMONSTRATION_INTRO, demoType ? `I have placed the ${SETUP_NAMES[demoType]} for you. ${step.groupHints[demoType]}${next ? '' : ' Every piece is now on its square. Choose Check my setup.'}` : 'Every piece is on its square. Choose Check my setup.']
    else if (hintTier === 2 && next) promptLines = ['A hint:', `Next, the ${SETUP_NAMES[next.type]}. ${step.groupHints[next.type]}`]
    else if (hintTier === 1) promptLines = [step.reminderText]
    else promptLines = step.prompt
  } else {
    modeLabel = step.checkpointItems ? 'QUICK CHECK' : 'TRY IT'
    if (attemptState === 'correct') promptLines = [`✓ ${step.correctText}`]
    else if (attemptState === 'wrong') promptLines = [step.wrongText]
    else if (hintTier === 0) promptLines = promptIsHeading ? promptAsLines.slice(1) : promptAsLines
    else if (hintTier === 1) promptLines = [wrongAttempts > 0 ? step.wrongText : (step.reminderText ?? 'Take another look at the board, then choose again.')]
    else if (hintTier === 2) promptLines = ['A hint:', step.hintText]
    else promptLines = [DEMONSTRATION_INTRO, step.demonstrationText ?? step.hintText]
  }

  const lineHighlights =
    step.kind === 'demo'
      ? step.highlightSquares?.length
        ? [{ squares: step.highlightSquares as Key[], brush: 'yellow' as const, band: true }]
        : undefined
      : step.kind === 'squareQuiz'
        ? ([
            foundSquares.size > 0 ? { squares: [...foundSquares] as Key[], brush: 'green' as const } : null,
            showHintSquares ? { squares: hintSquaresFor(step, hintTier).filter((s) => !foundSquares.has(s)) as Key[], brush: 'yellow' as const } : null,
            wrongSquare ? { squares: [wrongSquare] as Key[], brush: 'red' as const } : null,
          ].filter(Boolean) as { squares: Key[]; brush: 'green' | 'yellow' | 'red' }[])
        : undefined
  const celebrating = allDone && !showModal
  // Corner badges that say the same thing as the highlight colours: ✓ found, ✕ wrong, ? hint.
  const quizMarkers: { square: Key; kind: 'found' | 'wrong' | 'hint' }[] | undefined =
    allDone || step.kind !== 'squareQuiz'
      ? undefined
      : [
          ...[...foundSquares].map((sq) => ({ square: sq as Key, kind: 'found' as const })),
          ...(wrongSquare ? [{ square: wrongSquare as Key, kind: 'wrong' as const }] : []),
          ...(showHintSquares ? hintSquaresFor(step, hintTier).filter((s) => !foundSquares.has(s)).slice(0, 4).map((sq) => ({ square: sq as Key, kind: 'hint' as const })) : []),
        ]

  // Guided setup: pieces accumulate — everything placed by earlier steps stays, this step's own pieces appear as it is answered.
  const accumulated: Placement = useMemo(() => {
    const out: Placement = {}
    const upTo = allDone ? steps.length - 1 : stepIndex
    for (let i = 0; i <= upTo; i++) {
      const s = steps[i]
      if (s.kind === 'setup' || s.kind === 'yesNo' || !s.placePieces) continue
      const reached = allDone || i < stepIndex || s.kind === 'demo' || attemptState === 'correct'
      if (reached) Object.assign(out, s.placePieces)
    }
    return out
  }, [steps, stepIndex, allDone, attemptState])
  const usesPlacement = useMemo(() => steps.some((s) => s.kind !== 'setup' && s.kind !== 'yesNo' && !!s.placePieces), [steps])
  const displayFen = step.kind !== 'yesNo' && step.kind !== 'setup' && step.fen ? step.fen : usesPlacement ? fenFromPlacement(accumulated) : fen
  const showCoordinates = alwaysShowCoordinates || (step.kind !== 'yesNo' && step.showCoordinates) || (step.kind !== 'setup' && step.kind !== 'yesNo' && !!step.emphasizeCoordinates)

  const earlier = results[stepIndex]
  const isPractice = step.kind === 'squareQuiz' || step.kind === 'yesNo' || step.kind === 'setup'
  const stepDone = attemptState === 'correct' || (isPractice && earlier !== undefined)
  // Navigation never waits for narration. Explanations can always continue; a practice step needs its answer (or an earlier one).
  const nextAvailable = !allDone && (step.kind === 'demo' || stepDone)
  const nextHelp = step.kind === 'setup' ? 'Build the starting position, then choose Check my setup.' : 'Finish this step to continue.'

  function currentSpokenLine(): string {
    if (allDone) return completionSpokenLine()
    if (step.kind === 'demo') {
      if (step.colorPicker && attemptState === 'correct') return colorPickerReactionText(boardTheme)
      return introTextFor(step).join('. ')
    }
    if (step.kind === 'yesNo') {
      if (attemptState === 'correct') return step.spokenCorrectText ?? step.correctText
      if (attemptState === 'wrong') return step.spokenWrongText ?? step.wrongText
      if (hintTier >= 3) return `The answer is ${step.boardIsCorrect ? 'yes' : 'no'}. ${step.spokenCorrectText ?? step.correctText}`
      if (hintTier >= 1) return step.spokenHintText ?? step.hintText ?? step.wrongText
      return step.spokenPrompt ?? step.prompt
    }
    if (step.kind === 'setup') return promptLines.join('. ').replace(/✓ /, '')
    if (attemptState === 'correct') {
      const clicked = step.mode === 'any' ? [...foundSquares][0] : undefined
      return correctFeedbackFor(step, clicked, boardTheme, hintTier)
    }
    if (hintTier === 0) return introTextFor(step).join('. ')
    if (hintTier === 1) return wrongSquare ? wrongFeedbackFor(step, wrongSquare, boardTheme) : wrongAttempts > 0 ? (step.spokenWrongText ?? step.wrongText) : (step.reminderText ?? 'Take another look at the board, then choose again.')
    if (hintTier >= 3 && step.colorAwareSpokenFeedback) return `${DEMONSTRATION_INTRO} Here's a ${THEME_COLOR_NAMES[boardTheme][step.colorAwareSpokenFeedback]} square.`
    return step.demonstrationText && hintTier >= 3 ? step.demonstrationText : step.hintText
  }

  // Only active narration is shown (unobtrusively). An enabled Next already says "ready", and the task says "your turn".
  const voiceStatus: 'speaking' | null = voice.speaking ? 'speaking' : null

  // A Hint/Show me request speaks the newly revealed text (only on an actual request, not on automatic escalation).
  useEffect(() => {
    if (forcedHintTier === null) return
    voice.speak(currentSpokenLine())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires only on an actual Hint/Show me request.
  }, [forcedHintTier])

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') return voice.speak('You already did this one. Choose Next when you are ready.')
    if (step.kind !== 'squareQuiz' && step.kind !== 'yesNo' && step.kind !== 'setup') return voice.speak("This step doesn't need a hint. Read it, then choose Next.")
    setForcedHintTier((t) => Math.min((t ?? hintTier) + 1, HINT_TIER_COUNT - 1))
  }

  function requestShowMe() {
    if (allDone) return
    if (attemptState === 'correct') return voice.speak('You already did this one. Choose Next when you are ready.')
    if (step.kind !== 'squareQuiz' && step.kind !== 'yesNo' && step.kind !== 'setup') return voice.speak("This step doesn't need a demonstration. Read it, then choose Next.")
    if (step.kind === 'setup') {
      // Demonstrate: put the next missing group on the board (and say which it is). The learner still checks the setup.
      const next = missingGroups(step.target, placed)[0]
      if (next) {
        setDemoType(next.type)
        updatePlaced((prev) => {
          const out = { ...prev }
          for (const sq of next.squares) out[sq] = step.target[sq]
          return out
        })
        clearSetupFeedback()
        cancelPlacing()
      }
    }
    setForcedHintTier(HINT_TIER_COUNT - 1)
  }

  function requestTryAgain() {
    if (attemptState !== 'wrong') return
    clearWrongState()
    voice.speak('Go ahead, try again.')
  }

  function handleVoiceCommand(command: VoiceCommand | null) {
    if (!command) return voice.speak("I didn't catch that. Please try again or use the buttons.")
    switch (command) {
      case 'repeat':
        return voice.speak(currentSpokenLine())
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

  // Modal: focus the primary action, Escape closes, Tab stays inside.
  const modalRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (showModal) modalRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [showModal])

  const recapLines = [setupLine, describeSummary(summary)].filter(Boolean)
  const counts = step.kind === 'squareQuiz' && step.mode === 'all' ? { found: foundSquares.size, total: step.correctSquares.length } : null
  const hasRetry = baseStep.kind === 'squareQuiz' && !!baseStep.retry && !variant
  const showFreshTry = attemptState === 'correct' && hasRetry && !isIndependent(results[stepIndex]) && results[stepIndex] !== undefined
  const placedCount = Object.keys(placed).length
  const firstGroup = diagnosis?.groups[0]
  // For a fully reversed board only the White pieces are marked first, so the board is not covered in marks.
  const focusSquares = firstGroup ? (firstGroup.side === 'both' ? firstGroup.squares.filter((sq) => placed[sq] && placed[sq] === placed[sq].toUpperCase()) : firstGroup.squares.filter((sq) => placed[sq])) : []
  const countOf = (white: boolean) => Object.values(placed).filter((p) => (p === p.toUpperCase()) === white).length
  const retrySides: ('white' | 'black')[] = !diagnosis ? [] : diagnosis.groups.some((g) => g.id === 'sides-swapped') ? ['white', 'black'] : diagnosis.groups.some((g) => g.id === 'white-wrong-side') ? ['white'] : diagnosis.groups.some((g) => g.id === 'black-wrong-side') ? ['black'] : []
  const pickedLabel = pickedSquare && placed[pickedSquare] ? pieceLabel(placed[pickedSquare]) : ''
  const trayStatus = movingFrom
    ? `Moving: ${pieceLabel(placed[movingFrom] ?? tray ?? '')} from ${movingFrom}. Choose an empty square.`
    : tray
      ? `Selected: ${pieceLabel(tray)} · ${piecesLeft(placed, tray)} remaining. Choose a square.`
      : pickedSquare
        ? `Selected on the board: ${pickedLabel} on ${pickedSquare}. Choose Move it or Take it off.`
        : placedCount === 0
          ? 'Choose a piece from the tray, then choose a square.'
          : 'No piece selected. Choose a piece from the tray, or select a placed piece to move it or take it off.'

  return (
    <>
      <div className={`${styles.boardCol} ${started && step.kind === 'setup' ? styles.boardColSticky : ''}`}>
        <div className={styles.boardWrap}>
          {step.kind === 'yesNo' ? (
            <SimpleCheckerboard correct={step.boardIsCorrect} attemptState={attemptState} theme={boardTheme} />
          ) : step.kind === 'setup' ? (
            <SetupBoard
              placed={placed}
              theme={boardTheme}
              onSquare={handleSetupSquare}
              onRemove={takeOffPiece}
              onEscape={cancelPlacing}
              wrong={setupWrong}
              focus={focusSquares}
              selected={movingFrom ?? pickedSquare ?? undefined}
              hint={hintTier === 2 && attemptState !== 'correct' ? (missingGroups(step.target, placed)[0]?.squares ?? []) : []}
              readOnly={!started || attemptState === 'correct'}
              sideLabels
              label="Practice board. Build the starting position here. White's side is at the bottom."
            />
          ) : (
            <Board
              fen={displayFen}
              turnColor="white"
              dests={EMPTY_DESTS}
              // Identification and demonstration: the pieces are fixed — nothing can be picked up, dragged or dropped.
              fixedPieces
              viewOnly={!started || step.kind === 'demo' || attemptState === 'correct' || allDone}
              lineHighlights={allDone ? undefined : lineHighlights}
              emphasizeCoordinates={step.emphasizeCoordinates || alwaysShowCoordinates || !!showCoordinates}
              showCoordinates={!!showCoordinates}
              boardTheme={boardTheme}
              pulseHighlights={step.kind === 'squareQuiz' && attemptState === 'correct'}
              onSquareClick={started && step.kind === 'squareQuiz' ? handleSquareClick : undefined}
              keyboardSquares={started && step.kind === 'squareQuiz' && attemptState !== 'correct'}
              markers={quizMarkers}
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

      <div className={`${styles.panelCol} ${started && step.kind === 'setup' ? styles.panelRoomy : ''}`}>
        {!started ? (
          <>
            <div className={styles.stepCounterRow}>
              <span className={styles.stepCounter}>{lessonName}</span>
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
            <div className={styles.startRow}>
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
              {!allDone && <span className={styles.stageEyebrow} data-testid="lesson-mode">{modeLabel}</span>}
            </div>
            <div className={styles.progressTrack} aria-hidden="true">
              <div className={styles.progressFill} style={{ width: `${Math.round(((allDone ? steps.length : stepIndex + 1) / steps.length) * 100)}%` }} />
            </div>

            {headline && (
              <p className={styles.stepHeadline} data-testid="lesson-headline">
                {renderEmphasis(headline)}
              </p>
            )}

            {!allDone && step.kind === 'squareQuiz' && step.checkpointItems && attemptState === 'idle' && (
              <div className={styles.checkpointCard}>
                <ul className={styles.checkpointList}>
                  {step.checkpointItems.map((item, i) => (
                    <li key={i} className={styles.checkpointItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {promptLines.length > 0 && (
            <div
              className={attemptState === 'correct' || allDone ? `${styles.promptCard} ${attemptState === 'correct' ? styles.promptCardCorrect : ''} ${allDone ? styles.promptCardDone : ''}` : styles.promptPlain}
              data-testid="lesson-prompt"
              aria-live="polite"
            >
              {promptLines.map((line, i) => (
                <p key={i} className={styles.promptText}>
                  {renderEmphasis(line)}
                </p>
              ))}
            </div>
            )}

            {/* Whether the step was done alone or with help — stated plainly, never as a penalty. */}
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

            {/* A running count for "find all of them" tasks. Announced politely; never goes up twice for the same square. */}
            {!allDone && counts && (
              <div className={styles.foundChips}>
                {[...foundSquares].map((sq) => (
                  <span key={sq} className={styles.foundChip}>
                    ✓ {sq}
                  </span>
                ))}
                <span className={styles.foundChipsCount} role="status" data-testid="found-count">
                  {counts.found} of {counts.total} found
                </span>
              </div>
            )}

            {!allDone && step.kind === 'demo' && attemptState === 'idle' && step.rememberLine && <p className={styles.rememberLine}>{step.rememberLine}</p>}

            {!allDone && step.kind === 'demo' && step.valueSummary && (
              <div className={styles.valueSummary} data-testid="piece-values">
                <ul className={styles.valueList} aria-label="Approximate piece values">
                  {(
                    [
                      ['P', 'pawn', 1],
                      ['N', 'knight', 3],
                      ['B', 'bishop', 3],
                      ['R', 'rook', 5],
                      ['Q', 'queen', 9],
                    ] as const
                  ).map(([letter, name, value]) => (
                    <li key={letter} className={styles.valueItem}>
                      <span className={`cg-wrap ${styles.valueGlyph}`}>
                        <PieceGlyph letter={letter} />
                      </span>
                      <span className={styles.valueName}>{name}</span>
                      <span className={styles.valueNum}>≈ {value}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.valueKing}>
                  <span className={`cg-wrap ${styles.valueGlyphSmall}`}>
                    <PieceGlyph letter="K" />
                  </span>
                  <span>
                    <strong>King: priceless.</strong> It has no trading value. Protect it from checkmate.
                  </span>
                </p>
              </div>
            )}

            {!allDone && step.kind === 'demo' && step.colorPicker && (
              <div className={styles.themeRow} role="group" aria-label="Board colours">
                {BOARD_THEMES.map((t) => {
                  const selected = boardTheme === t.value && attemptState === 'correct'
                  return (
                    <button key={t.value} type="button" className={`${styles.themeSwatch} ${selected ? styles.themeSwatchSelected : ''}`} onClick={() => handleChooseTheme(t.value)} aria-pressed={boardTheme === t.value} data-testid={`theme-${t.value}`}>
                      <span className={styles.themeSwatchPreview} style={{ background: `repeating-conic-gradient(${t.light} 0% 25%, ${t.dark} 0% 50%) 0 0 / 25% 25%` }} aria-hidden="true">
                        {selected && <span className={styles.themeSwatchCheck}>✓</span>}
                      </span>
                      <span className={styles.themeSwatchLabel}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {!allDone && step.kind === 'yesNo' && attemptState !== 'correct' && (
              <div className={styles.answerRow}>
                <button type="button" className={styles.answerBtn} onClick={() => handleYesNo(true)}>
                  Yes
                </button>
                <button type="button" className={styles.answerBtn} onClick={() => handleYesNo(false)}>
                  No
                </button>
              </div>
            )}

            {/* The independent set-up task: labelled White / Black trays, click/tap/keyboard, no dragging. */}
            {!allDone && step.kind === 'setup' && (
              <div className={styles.setupArea} data-testid="setup-area">
                <p className={styles.setupOrient} data-testid="setup-orientation">
                  White starts nearest you in this view: ranks 1 and 2 at the bottom. Black starts at the top: ranks 7 and 8.
                </p>
                {attemptState === 'correct' ? (
                  <div className={styles.setupDone}>
                    <p className={styles.setupDoneText} role="status" data-testid="setup-success">
                      ✓ All 32 pieces are correctly placed.
                    </p>
                    <button type="button" className={styles.actionBtnGhost} onClick={editSetup} data-testid="setup-edit">
                      Edit setup
                    </button>
                  </div>
                ) : (
                  <>
                    <div data-testid="piece-tray" className={styles.trayGroups}>
                      {(
                        [
                          ['White pieces', TRAY.filter((l) => l === l.toUpperCase()), 'white'],
                          ['Black pieces', TRAY.filter((l) => l !== l.toUpperCase()), 'black'],
                        ] as const
                      ).map(([title, letters, side]) => (
                        <div key={side} role="group" aria-label={`${title}. Choose a piece, then choose its square on the board.`} data-testid={`tray-${side}`}>
                          <p className={styles.trayTitle}>{title}</p>
                          <div className={styles.tray}>
                            {letters.map((letter) => {
                              const left = piecesLeft(placed, letter)
                              const out = left <= 0
                              const on = tray === letter
                              return (
                                <button
                                  key={letter}
                                  type="button"
                                  className={`${styles.trayBtn} ${on ? styles.trayBtnOn : ''} ${out ? styles.trayBtnOut : ''}`}
                                  aria-pressed={on}
                                  aria-disabled={out || undefined}
                                  aria-label={`${pieceLabel(letter)}, ${out ? `all ${PIECE_TOTAL[letter.toLowerCase()]} placed` : `${left} remaining`}`}
                                  onClick={() => selectTray(letter)}
                                  data-testid={`tray-${letter}`}
                                  data-left={left}
                                >
                                  <span className={`cg-wrap ${styles.trayGlyph}`}>
                                    <PieceGlyph letter={letter} />
                                  </span>
                                  <span className={styles.trayCount} aria-hidden="true">
                                    {out ? 'placed ✓' : `${left} left`}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className={styles.setupProgress} data-testid="setup-progress">
                      {placedCount} of 32 placed
                    </p>
                    <p className={styles.setupStatus} data-testid="setup-status">
                      {trayStatus}
                    </p>
                    {pickedSquare && !tray && (
                      <div className={styles.setupActions}>
                        <button type="button" className={styles.actionBtnGhost} onClick={moveSelectedPiece} data-testid="setup-move">
                          Move it
                        </button>
                        <button type="button" className={styles.actionBtnGhost} onClick={() => takeOffPiece(pickedSquare)} data-testid="setup-takeoff">
                          Take it off
                        </button>
                      </div>
                    )}
                    {setupMessage && (
                      <p className={styles.setupMessage} role="status" data-testid="setup-message">
                        {setupMessage}
                      </p>
                    )}
                    {retrySides.length > 0 && (
                      <div className={styles.retryBox} data-testid="setup-retry">
                        <div className={styles.setupActions}>
                          {retrySides.includes('white') && (
                            <button type="button" className={styles.actionBtnGhost} onClick={() => retrySide('white')} data-testid="setup-retry-white">
                              Retry White’s side
                            </button>
                          )}
                          {retrySides.includes('black') && (
                            <button type="button" className={styles.actionBtnGhost} onClick={() => retrySide('black')} data-testid="setup-retry-black">
                              Retry Black’s side
                            </button>
                          )}
                        </div>
                        <p className={styles.retryNote} data-testid="setup-retry-note">
                          {retrySides.includes('white') && `Retry White’s side takes off the ${countOf(true)} White pieces on the board. `}
                          {retrySides.includes('black') && `Retry Black’s side takes off the ${countOf(false)} Black pieces on the board. `}
                          The other colour stays where it is. Nothing is placed for you.
                        </p>
                      </div>
                    )}
                    <div className={styles.setupActions}>
                      <button type="button" className={styles.actionBtn} onClick={checkSetup} data-testid="setup-check">
                        Check my setup
                      </button>
                      {(tray || movingFrom || pickedSquare) && (
                        <button type="button" className={styles.actionBtnGhost} onClick={cancelPlacing} data-testid="setup-cancel">
                          Cancel
                        </button>
                      )}
                      {(setupWrong.length > 0 || focusSquares.length > 0) && (
                        <button type="button" className={styles.actionBtnGhost} onClick={removeWrongPieces} data-testid="setup-remove-wrong">
                          {setupWrong.length > 0 ? 'Remove the pieces marked ✕' : 'Take off the pieces marked !'}
                        </button>
                      )}
                    </div>
                  </>
                )}
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
                onReplay={() => voice.speak(currentSpokenLine())}
                onHint={requestHint}
                onShowMe={requestShowMe}
                onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
                onMicEnd={voice.stopPushToTalk}
              />
            )}

            {!allDone && <VoiceStatusLine status={voiceStatus} />}

            <div className={styles.actionsSpacer} />
            {allDone ? (
              <div className={styles.doneActions} data-testid="lesson-done-actions">
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
              <LessonNav inline={step.kind === 'setup'} onBack={handleBack} backAvailable={stepIndex > 0} onNext={advanceStep} nextAvailable={nextAvailable} nextLabel={isLast ? 'Finish lesson' : step.kind === 'demo' ? (step.ctaLabel ?? 'Next →') : 'Next →'} nextHelp={nextHelp} />
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
            <div className={styles.modalBadge} aria-hidden="true">
              🏆
            </div>
            <p id="lesson-complete-title" className={styles.modalHeading}>
              {finalHeadline}
            </p>
            {usesPlacement && (
              <div className={styles.modalBoard} data-testid="completion-board">
                <SetupBoard placed={accumulated} theme={boardTheme} readOnly small label="The complete starting position" testId="completion-board-grid" />
              </div>
            )}
            {completionSummary && completionSummary.length > 0 && (
              <>
                <p className={styles.checkpointLabel}>What you covered:</p>
                <ul className={styles.checkpointList}>
                  {completionSummary.map((line, i) => (
                    <li key={i} className={styles.checkpointItem}>
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {recapLines.length > 0 && (
              <div data-testid="completion-assist-summary">
                {recapLines.map((line) => (
                  <p key={line} className={styles.modalBody}>
                    {line}
                  </p>
                ))}
              </div>
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
