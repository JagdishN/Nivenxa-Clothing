'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { computeMoveSquares, announceMove } from './moveSquares'
import { useLessonVoice, type VoiceCommand } from './useLessonVoice'
import VoiceControls, { VoiceStatusLine } from './VoiceControls'
import styles from './StepThroughPanel.module.scss'

// The board is read-only here — no legal moves to offer, and moves never
// come from user interaction, so both are fixed, stable constants.
const EMPTY_DESTS = new Map<Key, Key[]>()
function noop() {}

// Autoplay pacing (enableVoice only) — starting values to tune against real
// kids, not a one-shot guess: PRE_MOVE_PAUSE sits between the intro sentence
// finishing and the move actually animating; ANIMATE_DELAY gives the piece's
// own slide (plus the existing highlight pulse) a moment to settle before
// the result narration starts talking over it; LOOK_TIME is how long the
// finished position sits still, after narration ends, before the next
// move's intro begins.
const PRE_MOVE_PAUSE = 1000
const ANIMATE_DELAY = 450
const LOOK_TIME = 2000

interface FenMeta {
  turn: 'w' | 'b'
  fullmove: number
}

// Reads whose move it is and the move number directly off each FEN's own
// fields, rather than assuming White always moves first at ply 0 — tactics
// and endgames start from arbitrary positions, sometimes with Black to move.
function parseFenMeta(fen: string): FenMeta {
  const parts = fen.split(' ')
  return { turn: parts[1] === 'b' ? 'b' : 'w', fullmove: parseInt(parts[5] ?? '1', 10) }
}

function moveLabel(meta: FenMeta): string {
  return meta.turn === 'w' ? `${meta.fullmove}. ` : `${meta.fullmove}...`
}

export interface StepThroughExample {
  /** Starting FEN. Omit for the standard game start position (used by Openings). */
  fen?: string
  moves: string[]
  /** One explanation per move, aligned by index with `moves`. Use "\n" to break a step's explanation into separate one-idea lines. */
  stepExplanations: string[]
  /** Shown at step 0, before any move has been played. */
  startDescription: string
  /** Square(s) to circle at step 0, alongside `startDescription` — for teaching what a position already shows before any move plays. */
  startHighlights?: string[]
  /** Extra square(s) to circle per move, aligned by index with `moves` — e.g. the square a piece newly aims at, or both squares in a mutual-attack moment. */
  stepHighlights?: (string | string[] | undefined)[]
  /** [from, to] arrow to draw per move, aligned by index with `moves`. */
  stepArrows?: ([string, string] | undefined)[]
  /** A short "this is the X!" aside per move, aligned by index with `moves`. */
  stepReveal?: (string | undefined)[]
  /** Shown instead of the last move's explanation once the learner reaches the end. */
  completionLabel?: string
  completionSummary?: string[]
}

export default function StepThroughPanel({
  example,
  footer,
  onPracticeClick,
  practiceCtaLabel = 'Try it yourself →',
  nextCta,
  enableVoice = false,
  initialStep = 0,
  onStepChange,
}: {
  example: StepThroughExample
  footer?: React.ReactNode
  /** When provided, a button appears once the learner reaches the last move. */
  onPracticeClick?: () => void
  /** Text for that button — defaults to "Try it yourself →" (Openings' Practice mode); pass e.g. "Your Turn →" for a different phase name. */
  practiceCtaLabel?: string
  /** When provided (and onPracticeClick isn't), a "Learn X next" link appears once the learner reaches the last move. */
  nextCta?: { href: string; label: string }
  /**
   * Opts into the full voice layer (Start gate, autoplay narration, Replay/
   * Mic, tiered status) — off by default so this component's existing
   * consumers (Openings, Rules) render exactly as before. Only TacticDetail
   * passes true today. No hint/Show-Me controls render here either way —
   * this is pure passive playback, nothing to hint about, same reasoning
   * Chess Basics uses to hide Hint/Show Me on a plain `demo` step.
   */
  enableVoice?: boolean
  /**
   * Resumes at this step instead of 0 — lets a caller that remounts this
   * component per example (different FEN/moves need a remount, not just a
   * reset) still pick up where that example was left, e.g. after switching
   * back and forth between an Example 1 / Example 2 tab.
   */
  initialStep?: number
  /** Reports every step change upward, so a caller can remember it per example (see `initialStep`). */
  onStepChange?: (step: number) => void
}) {
  const { moves, stepExplanations } = example

  // positions[0] is the starting FEN; positions[i] is the FEN after
  // moves[0..i-1] have been played. lastMoves[0] is undefined (no move yet);
  // lastMoves[i] is the [from, to] of moves[i-1]. moveSquares[i] carries the
  // piece/capture info for moves[i] (used by the autoplay intro announcer
  // below). Computed once per example.
  const { positions, metas, lastMoves, moveSquares } = useMemo(() => {
    const chess = example.fen ? new Chess(example.fen) : new Chess()
    const fens = [chess.fen()]
    const squares = computeMoveSquares(moves, example.fen)
    const froms: (Key[] | undefined)[] = [undefined, ...squares.map((s) => [s.from, s.to])]
    for (const san of moves) {
      chess.move(san)
      fens.push(chess.fen())
    }
    return { positions: fens, metas: fens.map(parseFenMeta), lastMoves: froms, moveSquares: squares }
  }, [example.fen, moves])

  // 0 = starting position (before any move), up to moves.length. Seeded
  // from `initialStep` so a caller that remounts this component per example
  // (see the prop doc above) can resume rather than restart.
  const [step, setStep] = useState(initialStep)
  // Gates the whole panel behind one explicit click when voice is enabled —
  // that click is the user gesture autoplay needs (see handleStart), and
  // gives a clear "begin" moment. Irrelevant (never rendered/checked) when
  // enableVoice is false. Already past step 0 means this example was
  // already started (and possibly finished) before — don't ask again.
  const [started, setStarted] = useState(initialStep > 0)
  // Teaching sequence: Start lesson (the concept + board highlights, still
  // position) -> Watch example (the moves happen) -> Your Turn (practice,
  // unchanged elsewhere). `started && !introAcknowledged` is the first
  // stage; already past step 0 means this was sat through before.
  const [introAcknowledged, setIntroAcknowledged] = useState(initialStep > 0)
  const voice = useLessonVoice()
  // Set by "Watch example again" (see below) — the step-change effect
  // checks this once step 0's narration finishes, so a replay re-teaches
  // the concept first, same as the very first visit, rather than silently
  // skipping straight to the moves.
  const pendingReplayRef = useRef(false)

  // Drives the autoplay loop (enableVoice only) — `playing` is for the
  // Pause/Play button's own label; `playingRef` is what every in-flight
  // timeout/onEnd callback actually checks, so a callback scheduled several
  // renders ago always sees the CURRENT paused/playing state, not a stale
  // one captured when it was created.
  const [playing, setPlaying] = useState(false)
  const playingRef = useRef(false)
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The upcoming move's destination square, highlighted on the board WHILE
  // it's still at the old position and the intro sentence is naming that
  // square — set only during the intro phase, cleared the moment the move
  // actually animates (or autoplay stops).
  const [introSquare, setIntroSquare] = useState<Key | null>(null)

  useEffect(() => {
    onStepChange?.(step)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on step; onStepChange read fresh via closure, same reasoning as this file's other step-keyed effects (avoids re-firing on an unrelated parent re-render that happens to recreate the callback).
  }, [step])

  useEffect(
    () => () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current)
    },
    []
  )

  // Briefly pulses the just-played move's own two squares right after a step
  // change — the "Show, don't just Tell" layer on top of chessground's
  // slide animation: the learner's eye gets pointed at exactly what moved,
  // for a moment, before it settles into whatever this step's own
  // stepHighlights/hintArrow are (if any).
  const [pulsing, setPulsing] = useState(false)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (step === 0) return
    ;(() => {
      setPulsing(true)
      pulseTimer.current = setTimeout(() => setPulsing(false), 900)
    })()
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
    }
  }, [step])

  const atStart = step === 0
  const atEnd = step === moves.length

  // Groups moves into White/Black columns by the FEN-derived move number and
  // mover, rather than assuming index parity — a Black-to-move start puts the
  // first move in the Black column with an empty White cell, same as the
  // existing pattern for a trailing lone White move.
  const rows: { num: number; white?: { ply: number; san: string }; black?: { ply: number; san: string } }[] = []
  const rowByNum = new Map<number, (typeof rows)[number]>()
  moves.forEach((san, i) => {
    const meta = metas[i]
    let row = rowByNum.get(meta.fullmove)
    if (!row) {
      row = { num: meta.fullmove }
      rowByNum.set(meta.fullmove, row)
      rows.push(row)
    }
    if (meta.turn === 'w') row.white = { ply: i, san }
    else row.black = { ply: i, san }
  })

  // "Next" only ever reads as generic — name what's about to be shown for
  // the first couple of steps, where a beginner most needs the orientation,
  // then settle into a short, still-specific "Next move →".
  const firstMover = metas[0].turn === 'w' ? 'White' : 'Black'
  const secondMover = firstMover === 'White' ? 'Black' : 'White'
  const nextLabel = atStart ? `Show ${firstMover}'s first move →` : step === 1 ? `Show ${secondMover}'s reply →` : 'Next move →'

  function retreatStep() {
    setStep((s) => Math.max(0, s - 1))
  }

  function advanceStep() {
    setStep((s) => Math.min(moves.length, s + 1))
  }

  // Stops the autoplay loop in its tracks — clears the timer any in-flight
  // chain is waiting on and cancels whatever's mid-utterance. Called first
  // by every manual control (Previous, a move-list click, Replay, and the
  // manual Next below) so touching anything always hands control straight
  // back to the learner, rather than racing the automatic chain.
  function stopAutoplay() {
    playingRef.current = false
    setPlaying(false)
    setIntroSquare(null)
    if (autoplayTimer.current) {
      clearTimeout(autoplayTimer.current)
      autoplayTimer.current = null
    }
    voice.cancel()
  }

  // A natural sentence naming the actual piece, destination, and capture
  // (if any) — generated from this step's own move data (moveSquares),
  // never quoting authored `stepExplanations` text (which describes a move
  // that already happened, so speaking it before the move animates would
  // misstate tense). Applies to every tactic automatically, no data.ts
  // changes — chess.js already hands us piece/capture/check for free.
  function introTextFor(stepIndex: number): string {
    const mover = metas[stepIndex].turn === 'w' ? 'White' : 'Black'
    const isCheck = /[+#]$/.test(moves[stepIndex])
    return announceMove(moveSquares[stepIndex], mover, isCheck)
  }

  // "Introduce" + "before moving" beats: speaks the intro line (highlighting
  // its destination square on the still-unmoved board as it's named), then —
  // once that's done (or, if muted, after an estimated reading pause) —
  // waits PRE_MOVE_PAUSE before actually animating the move. The move
  // itself (`advanceStep`) is what triggers "explain the result" via the
  // `[step]` effect below.
  function runIntroPhase() {
    if (!playingRef.current || atEnd) return
    setIntroSquare(moveSquares[step].to)
    voice.speak(introTextFor(step), () => {
      if (!playingRef.current) return
      autoplayTimer.current = setTimeout(() => {
        if (!playingRef.current) return
        setIntroSquare(null)
        advanceStep()
      }, PRE_MOVE_PAUSE)
    })
  }

  function startAutoplay() {
    if (atEnd || moves.length === 0) return
    playingRef.current = true
    setPlaying(true)
    runIntroPhase()
  }

  function toggleAutoplay() {
    if (playing) stopAutoplay()
    else startAutoplay()
  }

  // Tactics only (enableVoice) — a move stays hidden in the move list until
  // the demonstration actually reaches it, so the solution isn't visible
  // before it's taught. Openings/Rules (enableVoice false) always show
  // every move — that list is a reference to browse, not an answer to hide.
  function isRevealed(ply: number): boolean {
    return !enableVoice || step > ply
  }

  function handlePrevious() {
    stopAutoplay()
    retreatStep()
  }

  function handleNext() {
    stopAutoplay()
    advanceStep()
  }

  // Exactly what's shown on screen for the current step, flattened into one
  // string for speech — same source, so narration never says something
  // different from the visible text (the bug fixed for Chess Basics).
  function currentSpokenText(): string {
    const base = (atStart ? example.startDescription : stepExplanations[step - 1]).replace(/\n/g, '. ')
    const reveal = !atStart && example.stepReveal?.[step - 1] ? ` ${example.stepReveal[step - 1]}` : ''
    const completion =
      atEnd && example.completionSummary
        ? ` ${example.completionLabel ?? "You're done"}. ${example.completionSummary.join('. ')}`
        : ''
    return `${base}${reveal}${completion}`
  }

  // "Explain the result" + "before the next move" beats. Delayed by
  // ANIMATE_DELAY only while autoplaying (gives the move's own slide a
  // moment to settle before narration starts); a manual step change speaks
  // immediately, same as always. Always calls `speak` (never gated on
  // `voice.muted` itself) so its `onEnd` still fires — via the hook's own
  // estimated-reading-time fallback when muted — and the autoplay chain
  // keeps pacing itself with no sound at all.
  useEffect(() => {
    if (!enableVoice || !started) return
    voice.cancel()
    const delay = playingRef.current ? ANIMATE_DELAY : 0
    const timer = setTimeout(() => {
      voice.speak(currentSpokenText(), () => {
        // "Watch example again" lands here once step 0's narration (the
        // concept, re-taught) finishes — proceed straight into the moves.
        if (pendingReplayRef.current) {
          pendingReplayRef.current = false
          startAutoplay()
          return
        }
        if (!playingRef.current) return
        if (atEnd) {
          stopAutoplay()
          return
        }
        autoplayTimer.current = setTimeout(() => {
          if (!playingRef.current) return
          runIntroPhase()
        }, LOOK_TIME)
      })
    }, delay)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on step; enableVoice/started/voice/currentSpokenText/atEnd/playingRef read fresh via closure each render, same pattern as BoardLesson.tsx's identical stepIndex effect.
  }, [step])

  // "Start lesson" — speaks the concept (currentSpokenText() at step 0 is
  // `startDescription`), board highlights whatever `startHighlights` names.
  // Deliberately does NOT begin autoplay — that's "Watch example" below,
  // a distinct stage so the concept gets its own moment before any move
  // happens. "Explain the concept first, demonstrate it next, then let the
  // child practise" is the required sequence; this is the first beat of it.
  function handleStart() {
    setStarted(true)
    voice.speak(currentSpokenText())
  }

  // "Watch example" — the second stage: moves now happen automatically.
  function handleWatchExample() {
    setIntroAcknowledged(true)
    startAutoplay()
  }

  // Available once the intro's been seen, for a replay or a returning
  // learner who wants to see it again without re-doing the whole lesson
  // from scratch — resets to the start, which re-teaches the concept
  // (see the step-change effect's pendingReplayRef check) before the moves
  // play again.
  function watchExampleAgain() {
    stopAutoplay()
    // Already at step 0 means setStep(0) below would be a no-op (React
    // bails out on an identical value), so the step-change effect would
    // never fire to consume pendingReplayRef — go straight to autoplay
    // instead of relying on that effect in this one case.
    if (step === 0) {
      startAutoplay()
      return
    }
    pendingReplayRef.current = true
    setStep(0)
  }

  // No hint/Show-Me concept here (pure passive playback, nothing to narrow
  // down) — these exist only so a spoken "hint"/"show me" command gets a
  // graceful, explicit response instead of silently doing nothing.
  function requestHint() {
    voice.speak('There\'s no hint here — say or tap Replay to hear this step again.')
  }
  function requestShowMe() {
    voice.speak('This step is already a demonstration — say or tap Replay to see it again.')
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
        // Nothing to retry on a passive step-through — silently ignored,
        // same as this command doing nothing on a Chess Basics demo step.
        break
      case 'next':
        if (!atEnd) handleNext()
        else voice.speak("You're at the end — use the button below to continue.")
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
            fen={positions[step]}
            turnColor={metas[step].turn === 'w' ? 'white' : 'black'}
            dests={EMPTY_DESTS}
            viewOnly
            lastMove={lastMoves[step]}
            highlightSquares={(() => {
              if (introSquare) return [introSquare]
              if (atStart) return example.startHighlights as Key[] | undefined
              if (pulsing) return lastMoves[step]
              const raw = example.stepHighlights?.[step - 1]
              if (!raw) return undefined
              return (Array.isArray(raw) ? raw : [raw]) as Key[]
            })()}
            hintArrow={!introSquare && !atStart && !pulsing ? (example.stepArrows?.[step - 1] as Key[] | undefined) : undefined}
            pulseHighlights={pulsing}
            onMove={noop}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        {enableVoice && !started ? (
          <>
            <p className={styles.explanationLabel}>Ready to begin?</p>
            <div className={styles.stepControls}>
              <button type="button" className={styles.stepBtn} onClick={handleStart}>
                Start lesson →
              </button>
            </div>
          </>
        ) : enableVoice && !introAcknowledged ? (
          // Stage 1 of "explain, then demonstrate, then practise" — the
          // concept and its board highlights, deliberately without the move
          // list or step controls yet, so this stays a short, focused idea
          // rather than one more set of buttons to parse.
          <>
            <div className={styles.explanation}>
              <p className={styles.explanationLabel}>What to notice</p>
              {example.startDescription.split('\n').map((line, i) => (
                <p key={i} className={styles.explanationText}>
                  {line}
                </p>
              ))}
            </div>
            <div className={styles.stepControls}>
              <button type="button" className={styles.stepBtn} onClick={handleWatchExample}>
                Watch example →
              </button>
            </div>
            <VoiceStatusLine status={voice.speaking ? 'speaking' : 'readyToContinue'} />
          </>
        ) : (
          <>
        {/* Autoplay (Pause/Replay, in VoiceControls below) is the one
            primary action once a demonstration is playing — this row stays
            as a full manual override, just visually secondary so it
            doesn't compete with that for attention. Unaffected when
            enableVoice is false (Openings/Rules never had autoplay to
            defer to in the first place). */}
        <div className={`${styles.stepControls} ${enableVoice ? styles.stepControlsSecondary : ''}`}>
          <button
            type="button"
            className={enableVoice ? styles.stepBtnSecondary : styles.stepBtn}
            onClick={handlePrevious}
            disabled={atStart}
          >
            ← Previous
          </button>
          <span className={styles.stepIndicator}>
            {atStart ? `Start · ${moves.length} move${moves.length === 1 ? '' : 's'}` : `Move ${step} of ${moves.length}`}
          </span>
          <button
            type="button"
            className={enableVoice ? styles.stepBtnSecondary : styles.stepBtn}
            onClick={handleNext}
            disabled={atEnd}
          >
            {nextLabel}
          </button>
        </div>

        <div>
          <p className={styles.moveListLabel}>Moves</p>
          <div className={styles.moveList}>
            {rows.map((row) => (
              <div key={row.num} className={styles.moveRow}>
                <span className={styles.moveNum}>{row.num}</span>
                {row.white ? (
                  <button
                    type="button"
                    className={`${styles.moveCell} ${step === row.white.ply + 1 ? styles.moveCellSelected : ''} ${
                      isRevealed(row.white.ply) ? '' : styles.moveCellHidden
                    }`}
                    disabled={!isRevealed(row.white.ply)}
                    onClick={() => {
                      if (!isRevealed(row.white!.ply)) return
                      stopAutoplay()
                      setStep(row.white!.ply + 1)
                    }}
                  >
                    {isRevealed(row.white.ply) ? row.white.san : '···'}
                  </button>
                ) : (
                  <span className={styles.moveCell} />
                )}
                {row.black ? (
                  <button
                    type="button"
                    className={`${styles.moveCell} ${step === row.black.ply + 1 ? styles.moveCellSelected : ''} ${
                      isRevealed(row.black.ply) ? '' : styles.moveCellHidden
                    }`}
                    disabled={!isRevealed(row.black.ply)}
                    onClick={() => {
                      if (!isRevealed(row.black!.ply)) return
                      stopAutoplay()
                      setStep(row.black!.ply + 1)
                    }}
                  >
                    {isRevealed(row.black.ply) ? row.black.san : '···'}
                  </button>
                ) : (
                  <span className={styles.moveCell} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.explanation}>
          <p className={styles.explanationLabel}>{atStart ? "Let's start" : moveLabel(metas[step - 1]) + moves[step - 1]}</p>
          {(atStart ? example.startDescription : stepExplanations[step - 1]).split('\n').map((line, i) => (
            <p key={i} className={styles.explanationText}>
              {line}
            </p>
          ))}
          {!atStart && example.stepReveal?.[step - 1] && <p className={styles.reveal}>{example.stepReveal[step - 1]}</p>}

          {atEnd && example.completionSummary && (
            <div className={styles.completionBlock}>
              <p className={`${styles.explanationLabel} ${styles.explanationLabelDone}`}>
                {example.completionLabel ?? "You're done"} <span aria-hidden="true">✓</span>
              </p>
              {example.completionSummary.map((line, i) => (
                <p key={i} className={styles.explanationText}>
                  {line}
                </p>
              ))}
              {onPracticeClick && (
                <button type="button" className={styles.practiceCta} onClick={onPracticeClick}>
                  {practiceCtaLabel}
                </button>
              )}
              {!onPracticeClick && nextCta && (
                <Link href={nextCta.href} className={styles.practiceCta}>
                  {nextCta.label}
                </Link>
              )}
            </div>
          )}
        </div>

        {enableVoice && (
          <VoiceControls
            supported={voice.supported}
            micSupported={voice.micSupported}
            voiceOn={!voice.muted}
            rate={voice.rate}
            listening={voice.listening}
            showHintControls={false}
            autoplay={atEnd ? undefined : { playing, onToggle: toggleAutoplay }}
            onToggleVoice={voice.toggleMute}
            onSetRate={voice.setSpeechRate}
            onReplay={() => {
              stopAutoplay()
              voice.speak(currentSpokenText())
            }}
            onWatchAgain={watchExampleAgain}
            onHint={requestHint}
            onShowMe={requestShowMe}
            onMicStart={() => voice.startPushToTalk(handleVoiceCommand)}
            onMicEnd={voice.stopPushToTalk}
          />
        )}
        {enableVoice && (
          <VoiceStatusLine status={voice.speaking ? 'speaking' : 'readyToContinue'} />
        )}

        {footer}
          </>
        )}
      </div>
    </>
  )
}
