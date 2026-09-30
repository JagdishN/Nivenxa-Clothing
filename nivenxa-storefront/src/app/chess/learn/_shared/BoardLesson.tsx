'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { markLessonCompleted, updateLessonStep } from '@/lib/chess/basicsProgress'
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

const BOARD_THEMES: { value: BoardTheme; label: string; light: string; dark: string }[] = [
  { value: 'cream', label: 'Cream & Brown', light: '#f0d9b5', dark: '#b58863' },
  { value: 'green', label: 'White & Green', light: '#eeeed2', dark: '#769656' },
  { value: 'purple', label: 'Purple & Cream', light: '#f1e8f7', dark: '#8c6bb1' },
]

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

export default function BoardLesson({
  example,
  nextCta,
  slug,
}: {
  example: BoardLessonExample
  nextCta?: { href: string; label: string }
  slug: string
}) {
  const { steps, fen, lessonName, completionHeadline, completionSummary } = example
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

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
  // which are all genuinely per-step.
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('cream')
  const [allDone, setAllDone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // A flashTimer armed by the PREVIOUS step (its wrong-answer revert) can
    // still be pending here if the step changed for some other reason —
    // clearing it before resetting local state stops a stale timeout from
    // flipping attemptState back to 'idle' after we've already landed on a
    // new step.
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setAttemptState('idle')
    setWrongAttempts(0)
    setFoundSquares(new Set())
    setWrongSquare(null)
    updateLessonStep(slug, stepIndex + 1, steps.length)
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

  function advanceStep() {
    if (isLast) {
      setAllDone(true)
      markLessonCompleted(slug)
    } else setStepIndex((i) => i + 1)
  }

  // Revisiting a previous explanation shouldn't cost restarting the whole
  // lesson — the existing stepIndex-change effect above already resets
  // attemptState/wrongAttempts/foundSquares for whichever step this lands on.
  function handleBack() {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setStepIndex((i) => Math.max(0, i - 1))
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
    const isCorrect = step.correctSquares.includes(key)
    if (flashTimer.current) clearTimeout(flashTimer.current)

    if (!isCorrect) {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      setWrongSquare(key)
      flashTimer.current = setTimeout(() => {
        setAttemptState('idle')
        setWrongSquare(null)
      }, REVERT_DELAY)
      return
    }

    setWrongSquare(null)

    if (step.mode === 'any') {
      // Even a single-answer ("any of these squares") quiz adds the clicked
      // square to foundSquares — not because it needs the count (the step
      // completes off attemptState alone), but so the square the learner
      // actually clicked gets the same green confirmation highlight a
      // multi-square 'all' quiz gives its own found squares, instead of no
      // board reaction at all.
      setFoundSquares(new Set([key]))
      setAttemptState('correct')
      return
    }

    setFoundSquares((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      if (next.size === step.correctSquares.length) {
        setAttemptState('correct')
      }
      return next
    })
  }

  function handleChooseTheme(theme: BoardTheme) {
    if (step.kind !== 'demo' || !step.colorPicker || attemptState !== 'idle') return
    setBoardTheme(theme)
    setAttemptState('correct')
  }

  function handleYesNo(answer: boolean) {
    if (step.kind !== 'yesNo' || attemptState !== 'idle') return
    if (answer === step.boardIsCorrect) {
      setAttemptState('correct')
    } else {
      setAttemptState('wrong')
      setWrongAttempts((n) => n + 1)
      flashTimer.current = setTimeout(() => setAttemptState('idle'), REVERT_DELAY)
    }
  }

  function handlePracticeAgain() {
    setStepIndex(0)
    setAllDone(false)
    setShowModal(false)
  }

  const hintTier = step.kind === 'squareQuiz' ? Math.min(wrongAttempts, 2) : 0
  const showHintSquares = step.kind === 'squareQuiz' && (step.revealSquaresFrom === 'start' || hintTier >= 2)

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
    } else {
      promptLines = ['Need a hint?', step.hintText]
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
                ? { squares: step.correctSquares.filter((s) => !foundSquares.has(s)) as Key[], brush: 'yellow' as const }
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
  // A demo step always offers Next while idle (reading is the whole
  // action). Every other step kind — squareQuiz, yesNo, and the colorPicker
  // demo variant — withholds it until `attemptState === 'correct'`: picking
  // the answer/swatch IS the action, and once it's right, Next appears for
  // the learner to click themselves rather than auto-advancing on a timer —
  // explicit preference for a beginner lesson to stay learner-paced.
  const showNext = !allDone && (step.kind === 'demo' ? !step.colorPicker || attemptState === 'correct' : attemptState === 'correct')

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
              viewOnly={step.kind === 'demo' || attemptState === 'correct' || allDone}
              lineHighlights={allDone ? undefined : lineHighlights}
              emphasizeCoordinates={step.emphasizeCoordinates}
              // Coordinates stay hidden entirely until the lesson actually
              // introduces files/ranks — every step from there on already
              // sets emphasizeCoordinates, so this reuses that same flag
              // rather than adding a second one just for visibility.
              showCoordinates={!!step.emphasizeCoordinates}
              boardTheme={boardTheme}
              pulseHighlights={step.kind === 'squareQuiz' && attemptState === 'correct'}
              onSquareClick={step.kind === 'squareQuiz' ? handleSquareClick : undefined}
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
