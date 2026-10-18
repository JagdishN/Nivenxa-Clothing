'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { markLessonCompleted, updateLessonStep } from '@/lib/chess/basicsProgress'
import { hintTierFor, HINT_TIER_COUNT, DEMONSTRATION_INTRO } from './feedbackCopy'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import { isLightSquare } from './squareColors'
import styles from './BoardLesson.module.scss'

// A lightweight **bold** convention for step copy — lets a step emphasize
// only the phrase that matters ("Can you find the e-file?") instead of
// either plain text throughout or a whole sentence in bold. Not real
// Markdown (no italics/links/etc.) — just enough for this one pattern.
function renderEmphasis(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

const EMPTY_DESTS = new Map<Key, Key[]>()
const REVERT_DELAY = 700
const CELEBRATE_DURATION = 1300

export type BoardTheme = 'cream' | 'green' | 'purple'

// BUG FIX: these two fields were swapped (light held the darker/more
// saturated hex, dark held the paler one) — SimpleCheckerboard below reads
// them directly (`isLight ? light : dark`), so it was painting real light
// squares with the dark color and vice versa. Subtle on cream/brown, glaring
// on purple/cream — that's what surfaced it. Values now match the real
// board's own CSS (Board.module.scss's per-theme `cg-board` gradients) and
// THEME_COLOR_NAMES below, which both already had this right.
const BOARD_THEMES: { value: BoardTheme; label: string; light: string; dark: string }[] = [
  { value: 'cream', label: 'Cream & Brown', light: '#f0d9b5', dark: '#b58863' },
  { value: 'green', label: 'White & Green', light: '#F4F5EE', dark: '#487451' },
  { value: 'purple', label: 'Purple & Cream', light: '#F5EEDC', dark: '#705080' },
]

// The everyday color NAME a learner would actually use for each theme's
// light/dark squares — for spoken feedback only ("Green is our dark
// colour; white is our light colour"). Derived by eye from the real hex
// pairs above/in Board.module.scss (the paler hex is always the light
// square), independent of BOARD_THEMES' own `light`/`dark` field names.
const THEME_COLOR_NAMES: Record<BoardTheme, { light: string; dark: string }> = {
  cream: { light: 'cream', dark: 'brown' },
  green: { light: 'white', dark: 'green' },
  purple: { light: 'cream', dark: 'purple' },
}

export interface BoardDemoStep {
  kind: 'demo'
  /** Authoring-only categorization (e.g. "TWO COLOURS") — no longer shown verbatim in the UI (see BoardLesson.tsx's stageLabel logic, which now standardizes the displayed badge to LEARN/TRY IT/QUICK CHECK across every step so it reads consistently instead of a different phrase on every screen). Still useful as a per-step label while editing this file. */
  stageLabel: string
  /** A short teaching title shown above the body text — e.g. "Light and dark squares". Optional so older steps without one still render fine. */
  headline?: string
  /** Overrides the lesson-level `fen` for just this step — e.g. a lesson mostly about the empty board can still show one step on the starting position. */
  fen?: string
  highlightSquares?: string[]
  text: string[]
  /** One short, memorable rule shown as its own standout line below the body text — "LIGHT ON RIGHT," "FILE = VERTICAL," "e + 4 = e4." The SEE/DO part of a step teaches the idea; this is the one sentence meant to actually stick. */
  rememberLine?: string
  /** Turns this step into the one-time board color picker: three theme swatches replace the usual Next flow (no Next button while idle — picking a theme IS the step's action). Picking one sets the real board's theme for the rest of the lesson (including steps already passed, if the learner goes Back) and auto-advances, the same "correct answer" rhythm a squareQuiz uses. */
  colorPicker?: boolean
  ctaLabel?: string
  /** Boosts the board's rank/file coordinate labels for steps actively teaching them — see Board.tsx's emphasizeCoordinates. */
  emphasizeCoordinates?: boolean
  /** A short, conversational spoken version of `text` for voice narration — falls back to `text` itself when absent, so a lesson with no authored script still auto-speaks its existing visible copy. Ends with a natural hand-off line where the step leads into an action (e.g. "Now tap any light square."). */
  spokenText?: string[]
}

export interface BoardSquareQuizStep {
  kind: 'squareQuiz'
  /** Authoring-only categorization — see BoardDemoStep.stageLabel's own comment. */
  stageLabel: string
  /** Same short teaching title as BoardDemoStep.headline — shown above the prompt while idle. */
  headline?: string
  /** Overrides the lesson-level `fen` for just this step. */
  fen?: string
  /** 'any' — the step completes the instant any one of `correctSquares` is clicked (e.g. "click a light square", many valid answers). 'all' — every square in `correctSquares` must be found, any order (e.g. "find all four knights"). */
  mode: 'any' | 'all'
  correctSquares: string[]
  /** A single string for one plain question. An array splits the question from its action instruction onto their own lines (e.g. `['Can you find e4?', 'Click the e4 square on the board.']`) — the question reads as one idea, the instruction as another, rather than one run-on sentence. */
  prompt: string | string[]
  wrongText: string
  hintText: string
  revealSquaresFrom: 'start' | 'hint'
  correctText: string
  emphasizeCoordinates?: boolean
  /** Opts this step into the "Show what you learned" checkpoint treatment — a small recap checklist shown above the usual prompt, so the lesson's final quiz reads as a milestone rather than an ordinary step. */
  checkpointItems?: string[]
  /** Spoken equivalents of prompt/correctText/wrongText — same fallback pattern as BoardDemoStep.spokenText. */
  spokenPrompt?: string[]
  spokenCorrectText?: string
  spokenWrongText?: string
  /**
   * Set only on a "find a light/dark square" recognition quiz. When
   * present, BoardLesson.tsx builds the SPOKEN correct/wrong feedback
   * dynamically from the square the learner actually clicked and the
   * current board theme's real color names, instead of any static
   * spokenCorrectText/spokenWrongText (which this field takes priority
   * over) — "Yes! You picked a white square. In chess, we call that a
   * light square," not a generic confirmation. The visible on-screen text
   * is unchanged either way.
   */
  colorAwareSpokenFeedback?: 'light' | 'dark'
  /**
   * Only meaningful alongside colorAwareSpokenFeedback — the small, mixed
   * light+dark area shown at hint tier 2 ("visual clue") instead of
   * ringing all 32 squares of the target color, which made the answer
   * obvious and cluttered the board. 2-4 squares is enough to let the
   * learner compare both colors without being handed the full answer set.
   */
  hintAreaSquares?: string[]
  /** Only meaningful alongside colorAwareSpokenFeedback — the ONE square rung at hint tier 3 ("Show Me"), demonstrating a single example rather than the full 32-square answer set. */
  demonstrationSquare?: string
}

export interface BoardYesNoStep {
  kind: 'yesNo'
  stageLabel: string
  /** Same short teaching title as BoardDemoStep.headline — shown above the question. */
  headline?: string
  /** Whether THIS presentation (rendered via a plain, deliberately correct-or-flipped checkerboard, not the real board — see SimpleCheckerboard below) is actually the correctly-oriented board. */
  boardIsCorrect: boolean
  prompt: string
  correctText: string
  wrongText: string
  /** Spoken equivalents — same fallback pattern as BoardDemoStep.spokenText. */
  spokenPrompt?: string
  spokenCorrectText?: string
  spokenWrongText?: string
  /** A proactive nudge the learner can ask for before guessing — distinct wording from wrongText, which is phrased as a reaction to an actual wrong guess ("Not quite…") rather than a hint offered up front. Falls back to spokenWrongText/wrongText if absent, so an un-authored yesNo step's Hint button still does something. */
  hintText?: string
  spokenHintText?: string
}

export type BoardLessonStep = BoardDemoStep | BoardSquareQuizStep | BoardYesNoStep

export interface BoardLessonExample {
  steps: BoardLessonStep[]
  /** Default position for the lesson — nothing here ever moves a piece, only clicks/observes it. A step can override this with its own `fen`. */
  fen: string
  lessonName: string
  /** Natural-sounding completion line — e.g. "You learned how the chessboard works!" A generic "You learned {lessonName}!" reads fine for some lesson names and awkwardly for others ("You learned The Chessboard!"), so this is opt-in per lesson rather than always templated. */
  completionHeadline?: string
  completionSummary?: string[]
  /** A distinct, more conversational spoken paraphrase of the completion recap — falls back to reading completionHeadline + completionSummary verbatim when absent (fine for a lesson with no authored script; a terse ALL-CAPS memory-phrase summary reads awkwardly spoken, which is exactly what this field exists to override). */
  completionSpokenText?: string
}

type AttemptState = 'idle' | 'correct' | 'wrong'

// Rings the bottom-right square once the player has picked Yes/No — the
// concrete visual referent for "light on the right"/"dark on the right"
// prompts, instead of leaving the reasoning to the text alone. Ring color
// follows the same grammar as the real board (green = correct, warm
// red/amber = incorrect attempt) rather than always gold, so a wrong guess
// here reads the same way a wrong square click does everywhere else. Colors
// come from the learner's own chosen `theme` (see BOARD_THEMES) — this used
// to be fixed cream/brown regardless of the real board's theme, which read
// as "the board changed back to default" the moment this step appeared
// right after a different theme was picked.
function SimpleCheckerboard({ correct, attemptState, theme }: { correct: boolean; attemptState: AttemptState; theme: BoardTheme }) {
  const { light, dark } = BOARD_THEMES.find((t) => t.value === theme) ?? BOARD_THEMES[0]
  const cells = []
  const ringClass = attemptState === 'correct' ? styles.cellAnswerCorrect : attemptState === 'wrong' ? styles.cellAnswerWrong : ''
  for (let rank = 8; rank >= 1; rank--) {
    for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
      let isLight = (fileIdx + rank) % 2 === 0
      if (!correct) isLight = !isLight
      const isBottomRight = rank === 1 && fileIdx === 7
      cells.push(
        <span
          key={`${fileIdx}-${rank}`}
          className={isBottomRight ? ringClass : ''}
          style={{ background: isLight ? light : dark }}
        />
      )
    }
  }
  return <div className={styles.simpleBoard}>{cells}</div>
}

// What auto-speak-on-entry says for a step, before any wrong attempt
// changes the picture — the exact tier-0/idle text the panel already
// shows, unless the step authored a shorter spoken script of its own (see
// each step type's `spoken*` fields). A lesson with no authored script
// just speaks its existing visible copy automatically.
function introTextFor(step: BoardLessonStep): string[] {
  if (step.kind === 'demo') return step.spokenText ?? step.text
  if (step.kind === 'yesNo') return [step.spokenPrompt ?? step.prompt]
  return step.spokenPrompt ?? (Array.isArray(step.prompt) ? step.prompt : [step.prompt])
}

// The everyday color word for one specific square under the learner's
// current theme — reuses the same light/dark convention the color-quiz
// steps' own `correctSquares` are built from (squareColors.ts), so this
// can never disagree with which squares that quiz actually accepts.
function squareColorWord(square: string, theme: BoardTheme): string {
  const names = THEME_COLOR_NAMES[theme]
  return isLightSquare(square) ? names.light : names.dark
}

const FILES = 'abcdefgh'
const THEME_STORAGE_KEY = 'chess-board-theme'

/**
 * Dynamic wrong-answer feedback for a coordinate-finding squareQuiz — the
 * f-file, Rank 6, e4, and b7 steps — inferred purely from the shape of
 * `correctSquares` itself, no new data field needed: exactly one square is
 * "find this square," all 8 sharing a file is "find this file," all 8
 * sharing a rank is "find this rank." States what the learner got right and
 * points at the target directly — no "Almost," no restating the clicked
 * square, since that repeats the mistake without explaining it. Returns
 * null for anything else (the light/dark quizzes, which use their own
 * colorAwareSpokenFeedback path, and the two-corner checkpoint), so the
 * caller falls back to the step's own static wrongText.
 */
function squareMistakeFeedback(clicked: string, correctSquares: string[]): string | null {
  if (correctSquares.length === 1) {
    const target = correctSquares[0]
    const clickedFile = FILES.indexOf(clicked[0])
    const targetFile = FILES.indexOf(target[0])
    const clickedRank = Number(clicked[1])
    const targetRank = Number(target[1])
    const sameFile = clickedFile === targetFile
    const sameRank = clickedRank === targetRank
    if (sameFile && !sameRank) {
      const direction = targetRank > clickedRank ? 'up' : 'down'
      return `You found column ${target[0]}. Now move ${direction} to row ${target[1]}.`
    }
    if (sameRank && !sameFile) {
      return `You found row ${target[1]}. Now find column ${target[0]}.`
    }
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

/** The exact spoken line for a wrong squareQuiz click — same priority chain used both live (handleSquareClick) and when Replay/"repeat" reconstructs it afterward (currentSpokenLine). */
function wrongFeedbackFor(step: BoardSquareQuizStep, clicked: string, theme: BoardTheme): string {
  if (step.colorAwareSpokenFeedback) {
    // "Look for a green square," singular and simple — not "one of the
    // green squares beside it," which was a little more to process for a
    // learner who just needs the one-word nudge.
    return `Not quite — that's a ${squareColorWord(clicked, theme)} square. Look for a ${
      THEME_COLOR_NAMES[theme][step.colorAwareSpokenFeedback]
    } square.`
  }
  return squareMistakeFeedback(clicked, step.correctSquares) ?? step.spokenWrongText ?? step.wrongText
}

/**
 * The exact spoken line for a correct squareQuiz click — same priority
 * chain used both live and reconstructed by Replay/"repeat" afterward.
 * `clicked` is only known for a mode:'any' step (see foundSquares); a
 * mode:'all' checkpoint has no single clicked square and never sets
 * colorAwareSpokenFeedback anyway, so the fallback always applies there.
 *
 * `hintTier` decides HOW the praise is framed — the actual help used this
 * attempt, not a flat "you found it yourself" regardless of what happened.
 * Only applies to a single-square target (e4/b7): the whole-file/whole-rank
 * and color-aware quizzes keep their own existing phrasing, unaffected.
 */
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

/** The exact spoken line for picking a board colour — one shared source so handleChooseTheme's live speak() and currentSpokenLine's reconstruction for Replay can never drift apart. */
function colorPickerReactionText(theme: BoardTheme): string {
  return `Great choice! We'll call that ${THEME_COLOR_NAMES[theme].light} the light squares and ${THEME_COLOR_NAMES[theme].dark} the dark squares.`
}

/**
 * Which squares get the yellow hint ring, by tier — for a color-aware
 * quiz (32 possible correct squares), ringing the whole set at tier 2 made
 * the answer obvious and cluttered the board, so tier 2 shows a small
 * mixed-color area instead and tier 3 ("Show Me") shows exactly one
 * example. Every other quiz (a single square, or a whole file/rank — 8
 * squares at most) keeps ringing its full correctSquares at either tier,
 * since that was never the complaint.
 */
function hintSquaresFor(step: BoardSquareQuizStep, hintTier: number): string[] {
  if (step.colorAwareSpokenFeedback) {
    if (hintTier >= 3) return step.demonstrationSquare ? [step.demonstrationSquare] : step.correctSquares.slice(0, 1)
    return step.hintAreaSquares ?? step.correctSquares
  }
  return step.correctSquares
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
  const { steps, fen, lessonName, completionHeadline, completionSummary, completionSpokenText } = example
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  // Gates the whole lesson behind one explicit click — that click is the
  // user gesture auto-narration needs (see handleStart below), and gives a
  // clear "begin" moment instead of narration starting the instant the page
  // loads. Never persisted — a fresh page load/navigation is a fresh gate.
  const [started, setStarted] = useState(false)

  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [foundSquares, setFoundSquares] = useState<Set<string>>(new Set())
  // The most recently mis-clicked square — cleared with the same flashTimer
  // that reverts attemptState back to 'idle', so the red outline and the
  // "wrong" text disappear together. Distinct from foundSquares (green):
  // this is never persisted across clicks, just the current miss.
  const [wrongSquare, setWrongSquare] = useState<string | null>(null)
  // Set once, by the colorPicker step, and applied to every Board render
  // for the rest of this lesson session (including earlier steps if the
  // learner goes Back) — deliberately NOT reset by the per-step effect
  // below, unlike attemptState/wrongAttempts/foundSquares/wrongSquare,
  // which are all genuinely per-step. Persisted across lessons/practice
  // screens too (not just within this one mount) — "we'll use it for the
  // rest of this lesson" shouldn't mean it resets the moment a new lesson
  // page mounts.
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('cream')
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Set by a manual Hint/Show Me request (click or voice command) — see
  // feedbackCopy.ts's tier system. Kept separate from wrongAttempts-driven
  // escalation (never regresses it, see `hintTier` below) so asking for a
  // hint doesn't erase progress a wrong attempt already made toward one.
  const [forcedHintTier, setForcedHintTier] = useState<number | null>(null)
  const voice = useLessonVoice()

  // Deliberately an effect, not a lazy useState initializer — same
  // reasoning as useLessonVoice.ts's `muted`/`supported`: localStorage
  // doesn't exist during SSR, so a lazy initializer would read the real
  // theme on the client's very first render too and mismatch the
  // server-rendered markup (the Board's theme class differs per theme).
  // Starting at 'cream' and flipping after mount keeps that first render
  // identical on both sides, at the cost of a brief flash to the real
  // theme — the one setState-in-effect here that isn't avoidable by
  // restructuring, matching this project's established precedent.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'cream' || stored === 'green' || stored === 'purple') setBoardTheme(stored)
    } catch {
      // Private-mode/blocked storage — stays on the 'cream' default.
    }
  }, [])

  useEffect(() => {
    // A flashTimer armed by the PREVIOUS step (its wrong-answer revert) can
    // still be pending here if the step changed for some other reason —
    // clearing it before resetting local state stops a stale timeout from
    // flipping attemptState back to 'idle' after we've already landed on a
    // new step.
    if (flashTimer.current) clearTimeout(flashTimer.current)
    voice.cancel()
    setAttemptState('idle')
    setWrongAttempts(0)
    setFoundSquares(new Set())
    setWrongSquare(null)
    setForcedHintTier(null)
    updateLessonStep(slug, stepIndex + 1, steps.length)
    // Auto-speak this step's intro once voice is on — but only once the
    // lesson has actually started: on the very first mount `started` is
    // still false, so step 0's own narration instead comes from
    // handleStart's own direct speak() call (inside a real click handler,
    // the user gesture autoplay needs), not from this effect.
    if (started && !voice.muted) voice.speak(introTextFor(step).join('. '))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `step`/`started`/`voice` deliberately excluded: this must run once per stepIndex change only, reading whichever of those is current at that moment, not re-fire when they change on their own.
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

  function completionSpokenLine(): string {
    return completionSpokenText ?? [completionHeadline ?? `You learned ${lessonName}!`, ...(completionSummary ?? [])].join('. ')
  }

  // Speaks the completion recap the moment the modal actually shows it —
  // not earlier, during the celebration animation, when none of this text
  // is on screen yet. The recap was previously the one reaction in this
  // file with no spoken form at all.
  useEffect(() => {
    if (!showModal || voice.muted) return
    voice.speak(completionSpokenLine())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on showModal; completionSpokenLine/voice are static per lesson instance.
  }, [showModal])

  function advanceStep() {
    if (isLast) {
      setAllDone(true)
      markLessonCompleted(slug)
    } else setStepIndex((i) => i + 1)
  }

  // Shared by the squareQuiz/yesNo wrong-answer auto-revert timeout AND the
  // voice "try again" command — a spoken "try again" just fires this early
  // instead of waiting out REVERT_DELAY.
  function clearWrongState() {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setAttemptState('idle')
    setWrongSquare(null)
  }

  // Revisiting a previous explanation shouldn't cost restarting the whole
  // lesson — the existing stepIndex-change effect above already resets
  // attemptState/wrongAttempts/foundSquares for whichever step this lands on.
  function handleBack() {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setStepIndex((i) => Math.max(0, i - 1))
  }

  // The user gesture autoplay needs — speaking step 0's intro directly
  // inside this click handler (rather than leaving it to the stepIndex
  // effect, which already ran once before this click with `started` still
  // false) is what lets the very first utterance play without a browser
  // autoplay-policy block.
  function handleStart() {
    setStarted(true)
    if (!voice.muted) voice.speak(introTextFor(step).join('. '))
  }

  // Correct no longer auto-advances on a timer — it reveals the Next button
  // instead (see `showNext` in the render below), on explicit preference
  // for a beginner lesson to stay learner-paced rather than time-boxed. A
  // 'wrong' answer still self-reverts after REVERT_DELAY (that's a miss,
  // not a completed step, so there's nothing to wait on the learner for).
  function handleSquareClick(key: Key) {
    // Only 'correct' blocks further input (the step is already done, just
    // waiting on Next). A 'wrong' flash must NOT block the next click —
    // nothing on this board shows an in-flight wrong move to explain why a
    // click did nothing, so a quick correction (miss, then immediately
    // click the right square) has to register right away rather than
    // silently eating that click for the rest of the revert window.
    if (step.kind !== 'squareQuiz' || attemptState === 'correct') return
    // Reassigned into its own const so the nested speakCorrect() closure
    // below keeps the narrowed squareQuiz type — TS doesn't carry a
    // narrowing of the outer `step` into a nested function declaration.
    const quizStep = step
    const isCorrect = quizStep.correctSquares.includes(key)
    if (flashTimer.current) clearTimeout(flashTimer.current)

    if (!isCorrect) {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      setWrongSquare(key)
      if (!voice.muted) voice.speak(wrongFeedbackFor(quizStep, key, boardTheme))
      flashTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
      return
    }

    setWrongSquare(null)

    function speakCorrect() {
      if (voice.muted) return
      voice.speak(correctFeedbackFor(quizStep, key, boardTheme, hintTier))
    }

    if (quizStep.mode === 'any') {
      // Even a single-answer ("any of these squares") quiz adds the clicked
      // square to foundSquares — not because it needs the count (the step
      // completes off attemptState alone), but so the square the learner
      // actually clicked gets the same green confirmation highlight a
      // multi-square 'all' quiz gives its own found squares, instead of no
      // board reaction at all.
      setFoundSquares(new Set([key]))
      setAttemptState('correct')
      speakCorrect()
      return
    }

    // Computed before the state update (not inside its updater, which must
    // stay a pure function of its own previous value) — mirrors exactly
    // what that updater is about to decide, so the "you solved it" line
    // only speaks once the WHOLE quiz is done, not on every intermediate
    // square found along the way.
    const completesQuiz = !foundSquares.has(key) && foundSquares.size + 1 === quizStep.correctSquares.length
    setFoundSquares((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      if (next.size === quizStep.correctSquares.length) {
        setAttemptState('correct')
      }
      return next
    })
    if (completesQuiz) speakCorrect()
  }

  function handleChooseTheme(theme: BoardTheme) {
    // Unlike a quiz step (one locked answer), this is a live preference —
    // the learner should be free to flip between swatches as many times as
    // they like, not be locked out after the first pick (attemptState
    // staying 'correct' from here on is what keeps the swatch row visible
    // per the render guard below, not a "already answered" lock).
    if (step.kind !== 'demo' || !step.colorPicker) return
    setBoardTheme(theme)
    setAttemptState('correct')
    // The only "correct" reaction in this file that wasn't actually
    // speaking anything — squareQuiz/yesNo both call voice.speak() in
    // their own correct branch, this one never did, so picking a theme
    // produced the "Great choice!" text with total silence.
    if (!voice.muted) voice.speak(colorPickerReactionText(theme))
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Private-mode/blocked storage — preference just won't persist.
    }
  }

  function handleYesNo(answer: boolean) {
    if (step.kind !== 'yesNo' || attemptState !== 'idle') return
    if (answer === step.boardIsCorrect) {
      setAttemptState('correct')
      if (!voice.muted) voice.speak(step.spokenCorrectText ?? step.correctText)
    } else {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      if (!voice.muted) voice.speak(step.spokenWrongText ?? step.wrongText)
      flashTimer.current = setTimeout(clearWrongState, REVERT_DELAY)
    }
  }

  function handlePracticeAgain() {
    setStepIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  // 4 tiers, not 3 (see feedbackCopy.ts, shared with PieceLesson.tsx): 0 =
  // the question, 1 = a nudge, 2 = reveal the target square(s) (unchanged
  // from before, just renumbered), 3 = a fuller "let's look together"
  // demonstration. No illegal/legal-wrong-goal classification here, unlike
  // PieceLesson's `try` steps — a squareQuiz is "find a square," which has
  // no real-chess-move legality axis to classify against.
  // Math.max, not a replacement — a manual Hint/Show Me request (forcedHintTier)
  // never regresses the automatic wrongAttempts-driven tier, and a later wrong
  // attempt still climbs normally even after a hint was already requested.
  const hintTier = step.kind === 'squareQuiz' ? Math.max(forcedHintTier ?? 0, hintTierFor(wrongAttempts)) : 0
  // Cleared once solved — "after success, clear previous hints and leave
  // only the selected square marked" — previously this stayed true
  // regardless of attemptState, so a hint ring (sometimes all 32 squares)
  // kept showing layered under the green "found" highlight even after a
  // correct click.
  const showHintSquares = step.kind === 'squareQuiz' && attemptState !== 'correct' && (step.revealSquaresFrom === 'start' || hintTier >= 2)

  // Shown above the prompt/body text while the step is still being read or
  // attempted — the short teaching title from item 8's hierarchy ("TWO
  // COLOURS" eyebrow -> "Light and dark squares" headline -> body). Not
  // shown once a correct/wrong reaction line has replaced the prompt, or at
  // completion — those are confirmations, not new teaching content.
  const headline = !allDone && attemptState === 'idle' && step.headline

  let promptLines: string[]
  // Standardized to exactly three displayed badges across every
  // BoardLesson-based lesson, regardless of each step's own (authoring-
  // only) stageLabel text: LEARN for a passive demo, TRY IT for an
  // interaction, QUICK CHECK for the one step that opts into the
  // checkpoint treatment — on feedback that a different phrase on every
  // single screen ("Two Colours," "Light On The Right," "Your Turn"...)
  // read as inconsistent labeling rather than a real category system.
  let stageLabel: string
  if (allDone) {
    promptLines = [completionHeadline ?? `You learned ${lessonName}!`]
    stageLabel = 'COMPLETE'
  } else if (step.kind === 'demo') {
    stageLabel = 'LEARN'
    promptLines =
      step.colorPicker && attemptState === 'correct'
        ? ['Great choice!', 'Whatever the colours, we still call them **LIGHT** and **DARK** squares.']
        : step.text
  } else if (step.kind === 'yesNo') {
    stageLabel = 'TRY IT'
    // No hardcoded "That's it!" filler — each step's own correctText is the
    // whole message (e.g. "Correct — Light on Right!"), short enough to
    // double as the memory-phrase reinforcement itself, not just a
    // confirmation that gets read past on the way to Next.
    if (attemptState === 'correct') promptLines = [`✓ ${step.correctText}`]
    else if (attemptState === 'wrong') promptLines = [step.wrongText]
    else promptLines = [step.prompt]
  } else {
    stageLabel = step.checkpointItems ? 'QUICK CHECK' : 'TRY IT'
    const promptAsLines = Array.isArray(step.prompt) ? step.prompt : [step.prompt]
    // A mode:'all' quiz's found squares are shown as real chips (see
    // .foundChips below the prompt), not folded into this plain text — so
    // this branch no longer needs its own "found N of M" text line at all,
    // matching mode:'any''s plain structure.
    if (attemptState === 'correct') {
      promptLines = [`✓ ${step.correctText}`]
    } else if (hintTier === 0) {
      promptLines = promptAsLines
    } else if (hintTier === 1) {
      promptLines = [step.wrongText]
    } else if (hintTier === 2) {
      promptLines = ['Need a hint?', step.hintText]
    } else {
      promptLines = [DEMONSTRATION_INTRO, step.hintText]
    }
  }

  // One shared color grammar across every BoardLesson-based lesson, board-
  // only (purple stays reserved for app chrome — buttons, progress, nav —
  // never painted onto the board itself; on the board's own cream/brown
  // squares it didn't read as an accent, it fought them, and a strong fill
  // hid whether the underlying square was actually light or dark): gold for
  // "here's what's relevant right now," whether that's a demo step's own
  // concept squares or a squareQuiz's revealed hint squares, green for "you
  // found it," and red for "that one was wrong" — see
  // [[chess_learn_basics_section]] for the full grammar this backs. Built as
  // separate same-purpose groups (Board's `lineHighlights`, not the single-
  // color `highlightSquares`) since a quiz can need two colors on screen at
  // once (a found square plus a still-outstanding hint square).
  const lineHighlights =
    step.kind === 'demo'
      ? step.highlightSquares?.length
        ? // band: true — an inset outline per cell (see Board.tsx), not a
          // filled wash, so a full rank/file's worth of adjacent squares
          // reads as one highlighted lane ("rank = horizontal, file =
          // vertical") without ever recoloring the squares themselves —
          // the light/dark pattern (and whichever board theme is active)
          // stays fully visible underneath.
          [{ squares: step.highlightSquares as Key[], brush: 'yellow' as const, band: true }]
        : undefined
      : step.kind === 'squareQuiz'
        ? (
            [
              foundSquares.size > 0 ? { squares: [...foundSquares] as Key[], brush: 'green' as const } : null,
              showHintSquares
                ? { squares: hintSquaresFor(step, hintTier).filter((s) => !foundSquares.has(s)) as Key[], brush: 'yellow' as const }
                : null,
              wrongSquare ? { squares: [wrongSquare] as Key[], brush: 'red' as const } : null,
            ].filter(Boolean) as { squares: Key[]; brush: 'green' | 'yellow' | 'red' }[]
          )
        : undefined
  const celebrating = allDone && !showModal
  const displayFen = step.kind !== 'yesNo' && step.fen ? step.fen : fen

  // A card surface (border + tint) is reserved for a genuine reaction
  // moment — correct, or the lesson's own completion — everything else
  // (reading a prompt, a wrong-answer nudge) is plain text directly in the
  // panel, not another bordered rectangle inside the already-bordered panel.
  const isReactionMoment = attemptState === 'correct' || allDone
  // Back is always rendered, in the same footer position, for every step —
  // just invisible (not unmounted) when it doesn't apply yet, so the footer
  // itself never moves. See item 5/18 of the layout-consistency brief.
  const showBack = !allDone && stepIndex > 0 && attemptState !== 'correct'
  // A demo step offers Next once idle AND once that step's own narration
  // has finished speaking (or immediately, if voice is off/muted — nothing
  // to wait on then) — "explanation steps can offer Next after their
  // demonstration finishes." Every other step kind — squareQuiz, yesNo, and
  // the colorPicker demo variant — withholds it until `attemptState ===
  // 'correct'`: picking the answer/swatch IS the action, and once it's
  // right, Next appears for the learner to click themselves rather than
  // auto-advancing on a timer — explicit preference for a beginner lesson
  // to stay learner-paced. This exercise gating is unaffected by voice
  // either way — it was never possible to skip it by waiting out narration.
  const showNext =
    !allDone &&
    (step.kind === 'demo'
      ? (!step.colorPicker || attemptState === 'correct') && !voice.speaking
      : attemptState === 'correct')

  // THE FIX for the Replay/auto-speak mismatch: one function, mirroring
  // promptLines' own branches but sourcing spoken-preferred text at every
  // one of them, instead of the old `promptLines.join('. ')` — which only
  // ever read the VISIBLE fields and had no idea spokenText/spokenPrompt/
  // spokenCorrectText existed. Auto-speak-on-entry (introTextFor, via the
  // stepIndex effect and handleStart) already matched the idle case; this
  // extends the same preference to every other state, so Replay/the
  // hint-tier effect/the "repeat" command all say exactly what was (or
  // would be) auto-spoken for the exact same moment.
  function currentSpokenLine(): string {
    if (allDone) return completionSpokenLine()
    if (step.kind === 'demo') {
      if (step.colorPicker && attemptState === 'correct') return colorPickerReactionText(boardTheme)
      return introTextFor(step).join('. ')
    }
    if (step.kind === 'yesNo') {
      if (attemptState === 'correct') return step.spokenCorrectText ?? step.correctText
      if (attemptState === 'wrong') return step.spokenWrongText ?? step.wrongText
      return step.spokenPrompt ?? step.prompt
    }
    // squareQuiz
    if (attemptState === 'correct') {
      const clicked = step.mode === 'any' ? [...foundSquares][0] : undefined
      return correctFeedbackFor(step, clicked, boardTheme, hintTier)
    }
    if (hintTier === 0) return introTextFor(step).join('. ')
    if (hintTier === 1) return wrongSquare ? wrongFeedbackFor(step, wrongSquare, boardTheme) : step.spokenWrongText ?? step.wrongText
    // Tier 3 ("Show Me") for a color-aware quiz demonstrates the one ringed
    // example square (see hintSquaresFor) — the generic step.hintText
    // alone wouldn't say what that ring IS, just repeat the same tier-2
    // hint text with no acknowledgment anything changed.
    if (hintTier >= 3 && step.colorAwareSpokenFeedback) {
      return `${DEMONSTRATION_INTRO} Here's a ${THEME_COLOR_NAMES[boardTheme][step.colorAwareSpokenFeedback]} square.`
    }
    return step.hintText
  }

  // "Voice: On" alone says narration is allowed, not what it's doing right
  // now — null once a step is already solved/done, where neither "still
  // talking" nor "waiting on you" is the right read. A plain explanation
  // demo has no action pending (reading, then Next) — only squareQuiz/
  // yesNo/the colorPicker demo actually expect the learner to DO something,
  // so "Your turn" is reserved for those; a plain demo gets "Ready to
  // continue" instead.
  const expectingAction = step.kind === 'squareQuiz' || step.kind === 'yesNo' || (step.kind === 'demo' && step.colorPicker)
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
  // currentSpokenLine), React only ever INVOKES the one from the render
  // where forcedHintTier actually changed, so the text spoken is current.
  useEffect(() => {
    if (forcedHintTier === null) return
    voice.speak(currentSpokenLine())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above; currentSpokenLine/voice intentionally excluded so this only fires on an actual Hint/Show Me request.
  }, [forcedHintTier])

  function requestHint() {
    if (allDone) return
    if (attemptState === 'correct') {
      voice.speak('You already solved this — say or tap Next.')
      return
    }
    // yesNo has no tiered escalation (there's only one guess to make, not a
    // square to narrow down) — Hint/Show Me just speak a nudge or the
    // answer directly, rather than stepping through forcedHintTier.
    if (step.kind === 'yesNo') {
      voice.speak(step.spokenHintText ?? step.hintText ?? step.spokenWrongText ?? step.wrongText)
      return
    }
    if (step.kind !== 'squareQuiz') {
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
    if (step.kind === 'yesNo') {
      voice.speak(`The answer is ${step.boardIsCorrect ? 'yes' : 'no'}. ${step.spokenCorrectText ?? step.correctText}`)
      return
    }
    if (step.kind !== 'squareQuiz') {
      voice.speak("This step doesn't need a demonstration. Read it, then tap Next.")
      return
    }
    setForcedHintTier(HINT_TIER_COUNT - 1)
  }

  function requestTryAgain() {
    if (attemptState !== 'wrong') return
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
        voice.speak(currentSpokenLine())
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
        if (showNext) advanceStep()
        else voice.speak('Finish this step first.')
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
          {step.kind === 'yesNo' ? (
            <SimpleCheckerboard correct={step.boardIsCorrect} attemptState={attemptState} theme={boardTheme} />
          ) : (
            <Board
              fen={displayFen}
              turnColor="white"
              dests={EMPTY_DESTS}
              // Only 'correct' locks the board (already advancing) — 'wrong'
              // must stay clickable, or chessground drops the very
              // corrective click a player makes right after a miss (it
              // won't bind mousedown at all while viewOnly, live per-click,
              // not just at mount — see the mount-effect comment above).
              viewOnly={!started || step.kind === 'demo' || attemptState === 'correct' || allDone}
              lineHighlights={allDone ? undefined : lineHighlights}
              emphasizeCoordinates={step.emphasizeCoordinates}
              // Coordinates stay hidden entirely until the lesson actually
              // introduces files/ranks — every step from there on already
              // sets emphasizeCoordinates, so this reuses that same flag
              // rather than adding a second one just for visibility.
              showCoordinates={!!step.emphasizeCoordinates}
              boardTheme={boardTheme}
              pulseHighlights={step.kind === 'squareQuiz' && attemptState === 'correct'}
              onSquareClick={started && step.kind === 'squareQuiz' ? handleSquareClick : undefined}
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

      <div className={!allDone && step.kind !== 'demo' ? styles.panelColCompact : styles.panelCol}>
        {!started ? (
          // One explicit click gates the whole lesson — see handleStart's
          // own comment for why the speak() call has to live inside this
          // click, not a later effect.
          <>
            <div className={styles.stepCounterRow}>
              <span className={styles.stepCounter}>{lessonName}</span>
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
          {/* Lesson name folded into the counter itself ("The Chessboard ·
              3 of 8") — a bare "3 of 8" gives no orientation for what
              you're 3-of-8 through, easy to miss at this small size. */}
          <span className={styles.stepCounter}>{allDone ? 'Complete' : `${lessonName} · ${stepIndex + 1} of ${steps.length}`}</span>
          {!allDone && stageLabel && <span className={styles.stageEyebrow}>{stageLabel}</span>}
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.round(((allDone ? steps.length : stepIndex + 1) / steps.length) * 100)}%` }}
          />
        </div>

        {headline && <p className={styles.stepHeadline}>{renderEmphasis(headline)}</p>}

        {/* No "Quick Check ✓" label inside the card — the stageLabel
            eyebrow above already says QUICK CHECK, and step.headline
            already says "Show what you learned"; a third repeat of the
            same idea inside the card itself was pure duplication. */}
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
              {renderEmphasis(line)}
            </p>
          ))}
        </div>

        {/* Real chips, not a text string — a mode:'all' quiz's found
            squares (and, once complete, the full answer) as small
            checkmark pills, so "which squares" reads as a proper checklist
            rather than folding into the same plain paragraph as the
            question text. Stays visible through the 'correct' window too
            (not just while in progress), so the complete answer — every
            target square, all checked — is what's shown, not just a count. */}
        {!allDone && step.kind === 'squareQuiz' && step.mode === 'all' && foundSquares.size > 0 && (
          <div className={styles.foundChips}>
            {[...foundSquares].map((sq) => (
              <span key={sq} className={styles.foundChip}>
                ✓ {sq}
              </span>
            ))}
            {attemptState !== 'correct' && (
              <span className={styles.foundChipsCount}>
                {foundSquares.size} of {step.correctSquares.length}
              </span>
            )}
          </div>
        )}

        {/* The one line meant to actually stick — shown only while the step
            is still being read (same gating as `headline`), not once a
            reaction line has replaced the prompt above. */}
        {!allDone && step.kind === 'demo' && attemptState === 'idle' && step.rememberLine && (
          <p className={styles.rememberLine}>{step.rememberLine}</p>
        )}

        {/* Three theme swatches — the step's own required action, not an
            optional aside, so there's no Next button rendered alongside
            this (see the footer below). Picking one is what advances the
            step, the same rhythm a squareQuiz's correct click already has.
            Stays visible through the brief 'correct' window too (not just
            'idle') so the chosen swatch can show a checkmark + stronger
            border as real confirmation, instead of the whole row vanishing
            the instant it's clicked. */}
        {!allDone && step.kind === 'demo' && step.colorPicker && attemptState !== 'wrong' && (
          <div className={styles.themeRow}>
            {BOARD_THEMES.map((t) => {
              const selected = attemptState === 'correct' && boardTheme === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.themeSwatch} ${selected ? styles.themeSwatchSelected : ''}`}
                  onClick={() => handleChooseTheme(t.value)}
                >
                  <span
                    className={styles.themeSwatchPreview}
                    style={{ background: `repeating-conic-gradient(${t.light} 0% 25%, ${t.dark} 0% 50%) 0 0 / 25% 25%` }}
                    aria-hidden="true"
                  >
                    {selected && <span className={styles.themeSwatchCheck}>✓</span>}
                  </span>
                  <span className={styles.themeSwatchLabel}>{t.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Yes/No lives right under the question it answers, not in the
            fixed footer below — that footer is for lesson navigation
            (Back/Next), a different thing from answering the question. */}
        {!allDone && step.kind === 'yesNo' && attemptState === 'idle' && (
          <div className={styles.answerRow}>
            <button type="button" className={styles.answerBtn} onClick={() => handleYesNo(true)}>
              Yes
            </button>
            <button type="button" className={styles.answerBtn} onClick={() => handleYesNo(false)}>
              No
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
            showHintControls={step.kind === 'squareQuiz' || step.kind === 'yesNo'}
            onToggleVoice={voice.toggleMute}
            onSetRate={voice.setSpeechRate}
            onReplay={() => voice.speak(currentSpokenLine())}
            onHint={requestHint}
            onShowMe={requestShowMe}
            onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
            onMicEnd={voice.stopPushToTalk}
          />
        )}

        {/* Right above Next, bottom-right — moved out of the control row
            above, where it used to sit oddly wedged between buttons. */}
        {!allDone && <VoiceStatusLine status={voiceStatus} />}

        {/* Fixed footer — always in the same position for every step, so
            Back/Next never jump around as the question above changes shape. */}
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
          {showNext && (
            <button type="button" className={styles.actionBtn} onClick={advanceStep}>
              {step.kind === 'demo' ? (step.ctaLabel ?? 'Next →') : 'Next →'}
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
            {/* No separate "✓ {lessonName} completed" tag above the
                heading — with the trophy badge, that line and
                completionHeadline ("Chessboard Complete!") said the same
                thing twice in a row. */}
            <div className={styles.modalBadge} aria-hidden="true">
              🏆
            </div>
            <p className={styles.modalHeading}>{completionHeadline ?? `You learned ${lessonName}!`}</p>
            {completionSummary && completionSummary.length > 0 && (
              <>
                {/* Reuses the in-lesson Quick Check checkpoint's own label +
                    checklist styling (see .checkpointLabel/.checkpointList/
                    .checkpointItem) rather than inventing a second near-
                    identical pattern — this modal is, structurally, one
                    more checkpoint moment. */}
                <p className={styles.checkpointLabel}>You now know:</p>
                <ul className={styles.checkpointList}>
                  {completionSummary.map((line, i) => (
                    <li key={i} className={styles.checkpointItem}>
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className={styles.modalActions}>
              {nextCta && (
                <Link href={nextCta.href} className={styles.modalPrimary}>
                  {nextCta.label}
                </Link>
              )}
              <button type="button" className={styles.modalSecondary} onClick={handlePracticeAgain}>
                Practice again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
