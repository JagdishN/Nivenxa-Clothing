'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { computeMoveSquares, PIECE_NAME } from '../../_shared/moveSquares'
import { getNextOpeningInPath, withArticle, type Opening } from '@/lib/chess/openings/data'
import styles from './OpeningLesson.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
const PULSE_DURATION = 900
const AUTO_PLAY_DELAY = 650
const REVERT_DELAY = 700
const OPPONENT_REPLY_HOLD = 1400
const CELEBRATE_DURATION = 1300

type Phase = 'intro' | 'guided' | 'practice' | 'complete'
type AttemptState = 'idle' | 'correct' | 'reverting'

function noop() {}

/**
 * One continuous learning workspace: a single board, a single panel that
 * changes shape (Intro -> Guided -> Practice -> Complete) instead of a
 * toggle between two separate board+panel pairs plus a stack of static
 * cards above/below them. Deliberately NOT built on StepThroughPanel /
 * PracticePanel (those stay as-is for Tactics, which still wants the
 * two-mode toggle) — this page's whole point is that there's only ever
 * one thing on screen: the board, and whatever the panel is doing right now.
 */
export default function OpeningLesson({ opening }: { opening: Opening }) {
  const openingWithArticle = withArticle(opening.name)
  const learnerColor: 'w' | 'b' = opening.playedBy === 'white' ? 'w' : 'b'
  const learnerLabel = opening.playedBy === 'white' ? 'White' : 'Black'
  const opponentLabel = opening.playedBy === 'white' ? 'Black' : 'White'
  const orientation = opening.playedBy === 'black' ? 'black' : 'white'
  const next = getNextOpeningInPath(opening.slug)
  const completionSummary = opening.completionSummary ?? [
    'You played through every move.',
    `Now you know how ${openingWithArticle} works.`,
  ]

  const [phase, setPhase] = useState<Phase>('intro')
  const [showMoves, setShowMoves] = useState(false)

  // ── Guided walkthrough — a plain scripted replay, both colors, via Previous/Next. ──
  const { positions, lastMoves } = useMemo(() => {
    const chess = new Chess()
    const fens = [chess.fen()]
    const squares = computeMoveSquares(opening.moves)
    const froms: (Key[] | undefined)[] = [undefined, ...squares.map((s) => [s.from, s.to])]
    for (const san of opening.moves) {
      chess.move(san)
      fens.push(chess.fen())
    }
    return { positions: fens, lastMoves: froms }
  }, [opening.moves])
  const [guidedStep, setGuidedStep] = useState(1) // 1-indexed: guidedStep N means moves[N-1] was just played

  const [pulsing, setPulsing] = useState(false)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (phase !== 'guided') return
    ;(() => {
      setPulsing(true)
      pulseTimer.current = setTimeout(() => setPulsing(false), PULSE_DURATION)
    })()
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current)
    }
  }, [phase, guidedStep])

  // ── Practice — a real chess.js game; the learner plays their own moves, the opponent auto-plays. ──
  const { fen, turn, history, dests: liveDests, makeMove, undo, reset } = useChessGame()
  const practiceMoveIndex = history.length
  const practiceComplete = practiceMoveIndex >= opening.moves.length
  const isLearnerTurn = !practiceComplete && turn === learnerColor
  const moveSquares = useMemo(() => computeMoveSquares(opening.moves), [opening.moves])

  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [attemptState, setAttemptState] = useState<AttemptState>('idle')
  const [practiceLastMove, setPracticeLastMove] = useState<Key[] | undefined>(undefined)
  const [opponentJustMoved, setOpponentJustMoved] = useState<{ moveIndex: number } | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const opponentHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (revertTimer.current) clearTimeout(revertTimer.current)
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
      if (opponentHoldTimer.current) clearTimeout(opponentHoldTimer.current)
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current)
    }
  }, [])

  // Practice finishing plays a brief on-board celebration, then the panel
  // itself switches to the Complete state — no popup/modal, no new card.
  useEffect(() => {
    if (phase !== 'practice' || !practiceComplete) return
    ;(() => {
      setCelebrating(true)
      celebrateTimer.current = setTimeout(() => {
        setCelebrating(false)
        setPhase('complete')
      }, CELEBRATE_DURATION)
    })()
    return () => {
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current)
    }
  }, [phase, practiceComplete])

  // Auto-play the opponent's reply a beat after the learner's correct move.
  useEffect(() => {
    if (phase !== 'practice' || practiceComplete || isLearnerTurn || attemptState === 'reverting') return
    const nextMove = moveSquares[practiceMoveIndex]
    if (!nextMove) return
    const playedIndex = practiceMoveIndex
    autoPlayTimer.current = setTimeout(() => {
      makeMove(nextMove.from, nextMove.to)
      setPracticeLastMove([nextMove.from, nextMove.to])
      setAttemptState('idle')
      setOpponentJustMoved({ moveIndex: playedIndex })
      opponentHoldTimer.current = setTimeout(() => setOpponentJustMoved(null), OPPONENT_REPLY_HOLD)
    }, AUTO_PLAY_DELAY)
    return () => {
      if (autoPlayTimer.current) clearTimeout(autoPlayTimer.current)
    }
  }, [phase, practiceComplete, isLearnerTurn, attemptState, practiceMoveIndex, moveSquares, makeMove])

  function handleStartLesson() {
    setPhase('guided')
    setGuidedStep(1)
  }

  function handleGuidedPrev() {
    if (guidedStep <= 1) {
      setPhase('intro')
      return
    }
    setGuidedStep((s) => s - 1)
  }

  function handleGuidedNext() {
    if (guidedStep >= opening.moves.length) {
      setPhase('practice')
      return
    }
    setGuidedStep((s) => s + 1)
  }

  function handlePracticeMove(from: Key, to: Key) {
    if (!isLearnerTurn || attemptState === 'reverting') return
    const result = makeMove(from, to)
    if (!result) return
    if (opponentHoldTimer.current) clearTimeout(opponentHoldTimer.current)
    setOpponentJustMoved(null)
    setPracticeLastMove([from, to])
    if (result.san === opening.moves[practiceMoveIndex]) {
      setAttemptState('correct')
      setWrongAttempts(0)
      return
    }
    setAttemptState('reverting')
    setWrongAttempts((n) => n + 1)
    const priorIndex = practiceMoveIndex
    revertTimer.current = setTimeout(() => {
      undo()
      setAttemptState('idle')
      setPracticeLastMove(priorIndex > 0 ? [moveSquares[priorIndex - 1].from, moveSquares[priorIndex - 1].to] : undefined)
    }, REVERT_DELAY)
  }

  function handleReset() {
    reset()
    setWrongAttempts(0)
    setAttemptState('idle')
    setPracticeLastMove(undefined)
    if (opponentHoldTimer.current) clearTimeout(opponentHoldTimer.current)
    setOpponentJustMoved(null)
    setPhase('practice')
  }

  // ── "You'll learn" preview (Intro) — up to 3 of the learner's own moves,
  // reusing stepHeadline (already authored per move) rather than inventing new copy. ──
  const learnerIndices = useMemo(() => {
    const all = opening.moves.map((_, i) => i).filter((i) => (opening.playedBy === 'white' ? i % 2 === 0 : i % 2 === 1))
    if (all.length <= 3) return all
    return [all[0], all[Math.floor(all.length / 2)], all[all.length - 1]]
  }, [opening.moves, opening.playedBy])

  // ── Board props per phase ──
  const targetIndex = attemptState === 'reverting' ? practiceMoveIndex - 1 : practiceMoveIndex
  const expected = !practiceComplete ? moveSquares[targetIndex] : undefined
  const hintTier = Math.min(wrongAttempts, 3)
  const pieceName = expected ? PIECE_NAME[expected.piece] : 'piece'
  const practiceInteractive = phase === 'practice' && isLearnerTurn && attemptState !== 'reverting'

  let boardFen: string
  let boardTurnColor: 'white' | 'black'
  let boardDests = EMPTY_DESTS
  let boardViewOnly = true
  let boardLastMove: Key[] | undefined
  let boardHighlightSquares: Key[] | undefined
  let boardHintArrow: Key[] | undefined
  let boardPulsing = false
  let onBoardMove: (from: Key, to: Key) => void = noop

  if (phase === 'intro') {
    boardFen = positions[0]
    boardTurnColor = 'white'
  } else if (phase === 'guided') {
    boardFen = positions[guidedStep]
    boardTurnColor = guidedStep % 2 === 0 ? 'white' : 'black'
    boardLastMove = lastMoves[guidedStep]
    boardPulsing = pulsing
    if (pulsing) {
      boardHighlightSquares = lastMoves[guidedStep]
    } else {
      const raw = opening.stepHighlights?.[guidedStep - 1]
      boardHighlightSquares = raw ? ((Array.isArray(raw) ? raw : [raw]) as Key[]) : undefined
      boardHintArrow = opening.stepArrows?.[guidedStep - 1] as Key[] | undefined
    }
  } else {
    // practice / complete
    boardFen = fen
    boardTurnColor = turn === 'w' ? 'white' : 'black'
    boardDests = practiceInteractive ? liveDests : EMPTY_DESTS
    boardViewOnly = !practiceInteractive
    boardLastMove = practiceLastMove
    onBoardMove = handlePracticeMove
    if (hintTier >= 1 && hintTier < 3 && expected) boardHighlightSquares = [expected.from]
    if (hintTier >= 3 && expected) boardHintArrow = [expected.from, expected.to]
    boardPulsing = attemptState === 'correct'
    if (attemptState === 'correct' && practiceLastMove) boardHighlightSquares = practiceLastMove
  }

  const moveTipForGuidedStep = phase === 'guided' ? opening.moveTips?.filter((t) => t.moveIndex === guidedStep - 1) : undefined

  return (
    <div className={styles.workspace}>
      <div className={styles.boardCol}>
        <div className={styles.boardWrap}>
          <Board
            fen={boardFen}
            turnColor={boardTurnColor}
            dests={boardDests}
            orientation={orientation}
            viewOnly={boardViewOnly}
            lastMove={boardLastMove}
            highlightSquares={boardHighlightSquares}
            hintArrow={boardHintArrow}
            pulseHighlights={boardPulsing}
            onMove={onBoardMove}
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
        {phase === 'intro' && (
          <>
            <p className={styles.eyebrow}>The Idea</p>
            {opening.bigIdea.map((line, i) => (
              <p key={i} className={styles.ideaText}>
                {line}
              </p>
            ))}

            <p className={styles.learnLabel}>You&rsquo;ll learn</p>
            <ul className={styles.learnList}>
              {learnerIndices.map((i) => (
                <li key={i}>
                  <strong>{opening.moves[i]}</strong> — {opening.stepHeadline?.[i] ?? 'a key idea'}
                </li>
              ))}
            </ul>

            <button type="button" className={styles.primaryBtn} onClick={handleStartLesson}>
              Start Lesson →
            </button>
          </>
        )}

        {phase === 'guided' && (
          <>
            <p className={styles.eyebrow}>
              Step {guidedStep} of {opening.moves.length} · {colorLabel(guidedStep % 2 === 1 ? 'w' : 'b')}
            </p>
            <p className={styles.moveTitle}>
              {opening.moves[guidedStep - 1]}
              {opening.stepHeadline?.[guidedStep - 1] ? ` — ${opening.stepHeadline[guidedStep - 1]}` : ''}
            </p>
            <div className={styles.explanationBlock}>
              {opening.stepExplanations[guidedStep - 1].split('\n').map((line, i) => (
                <p key={i} className={styles.explanationText}>
                  {line}
                </p>
              ))}
              {opening.stepReveal?.[guidedStep - 1] && <p className={styles.reveal}>{opening.stepReveal[guidedStep - 1]}</p>}
            </div>

            {moveTipForGuidedStep?.map((tip, i) => (
              <p key={i} className={tip.icon === '💡' ? styles.tipGood : styles.tipCareful}>
                {tip.icon} {tip.text}
              </p>
            ))}

            <div className={styles.movesAccordion}>
              <button type="button" className={styles.movesToggle} onClick={() => setShowMoves((v) => !v)}>
                View moves {showMoves ? '▴' : '▾'}
              </button>
              {showMoves && <MovesList moves={opening.moves} upTo={guidedStep} />}
            </div>

            <div className={styles.stepControls}>
              <button type="button" className={styles.ghostBtn} onClick={handleGuidedPrev}>
                ← Previous
              </button>
              <button type="button" className={styles.primaryBtnSmall} onClick={handleGuidedNext}>
                {guidedStep >= opening.moves.length ? 'Your Turn →' : 'Next move →'}
              </button>
            </div>
          </>
        )}

        {phase === 'practice' && (
          <>
            <p className={styles.eyebrow}>Your Turn</p>
            {practiceComplete ? (
              <p className={styles.moveTitle}>You played {openingWithArticle} yourself!</p>
            ) : attemptState === 'correct' ? (
              <PracticeCorrectBlock opening={opening} moveIndex={practiceMoveIndex} />
            ) : opponentJustMoved ? (
              <PracticeOpponentBlock opening={opening} moveIndex={opponentJustMoved.moveIndex} opponentLabel={opponentLabel} />
            ) : !isLearnerTurn && attemptState !== 'reverting' ? (
              <p className={styles.moveTitle}>{opponentLabel} is replying…</p>
            ) : hintTier === 0 ? (
              <PracticePrompt opening={opening} moveIndex={practiceMoveIndex} learnerLabel={learnerLabel} />
            ) : hintTier === 1 ? (
              <>
                <p className={styles.moveTitle}>Good try.</p>
                <p className={styles.explanationText}>
                  {targetIndex === 0 ? `${openingWithArticle} starts with the ${pieceName}. Can you find it?` : `Look for the ${pieceName}.`}
                </p>
              </>
            ) : hintTier === 2 ? (
              <>
                <p className={styles.moveTitle}>Here&rsquo;s a hint —</p>
                <p className={styles.explanationText}>Try moving your {pieceName}.</p>
              </>
            ) : (
              <p className={styles.moveTitle}>Try moving this piece here.</p>
            )}

            <div className={styles.movesAccordion}>
              <button type="button" className={styles.movesToggle} onClick={() => setShowMoves((v) => !v)}>
                View moves {showMoves ? '▴' : '▾'}
              </button>
              {showMoves && <MovesList moves={opening.moves} upTo={practiceMoveIndex} />}
            </div>

            <button type="button" className={styles.ghostBtn} onClick={handleReset}>
              Reset
            </button>
          </>
        )}

        {phase === 'complete' && (
          <>
            <p className={styles.eyebrow}>✓ Complete</p>
            <p className={styles.moveTitle}>🎉 You learned {openingWithArticle}!</p>
            {completionSummary.map((line, i) => (
              <p key={i} className={styles.explanationText}>
                ✓ {line}
              </p>
            ))}
            <div className={styles.completeActions}>
              {next && (
                <Link href={`/chess/learn/openings/${next.slug}`} className={styles.primaryBtn}>
                  Learn {next.name} next →
                </Link>
              )}
              <button type="button" className={styles.ghostBtn} onClick={handleReset}>
                Try Again
              </button>
              <Link href="/chess/play" className={styles.ghostBtn}>
                Play a Game →
              </Link>
              <Link href="/chess/learn/openings" className={styles.ghostBtn}>
                Back to Openings
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function colorLabel(color: 'w' | 'b'): string {
  return color === 'w' ? 'White' : 'Black'
}

function PracticePrompt({ opening, moveIndex, learnerLabel }: { opening: Opening; moveIndex: number; learnerLabel: string }) {
  const contextual = opening.stepPrompts?.[moveIndex]
  if (contextual) return <p className={styles.moveTitle}>{contextual}</p>
  return (
    <p className={styles.moveTitle}>
      {moveIndex === 0 ? `${learnerLabel} to move. What should ${learnerLabel} play?` : `What should ${learnerLabel} play next?`}
    </p>
  )
}

function PracticeCorrectBlock({ opening, moveIndex }: { opening: Opening; moveIndex: number }) {
  const justPlayedReveal = opening.stepReveal?.[moveIndex - 1]
  const whyLines = opening.stepExplanations[moveIndex - 1]?.split('\n') ?? []
  const identityMatch = justPlayedReveal?.match(/^This is (the .+)!$/)
  return (
    <>
      <p className={styles.moveTitle}>{identityMatch ? `✓ That's ${identityMatch[1]}!` : "✓ That's it!"}</p>
      {!identityMatch && justPlayedReveal && <p className={styles.reveal}>{justPlayedReveal}</p>}
      {whyLines.map((line, i) => (
        <p key={i} className={styles.explanationText}>
          {line}
        </p>
      ))}
    </>
  )
}

function PracticeOpponentBlock({ opening, moveIndex, opponentLabel }: { opening: Opening; moveIndex: number; opponentLabel: string }) {
  const oppWhy = opening.stepExplanations[moveIndex]?.split('\n') ?? []
  return (
    <>
      <p className={styles.moveTitle}>
        {opponentLabel} plays {opening.moves[moveIndex]}.
      </p>
      {oppWhy.map((line, i) => (
        <p key={i} className={styles.explanationText}>
          {line}
        </p>
      ))}
    </>
  )
}

function MovesList({ moves, upTo }: { moves: string[]; upTo: number }) {
  const rows: { num: number; white?: string; black?: string }[] = []
  moves.forEach((san, i) => {
    if (i >= upTo) return
    const num = Math.floor(i / 2) + 1
    let row = rows.find((r) => r.num === num)
    if (!row) {
      row = { num }
      rows.push(row)
    }
    if (i % 2 === 0) row.white = san
    else row.black = san
  })
  if (rows.length === 0) return <p className={styles.movesEmpty}>No moves played yet.</p>
  return (
    <div className={styles.movesList}>
      {rows.map((row) => (
        <div key={row.num} className={styles.movesRow}>
          <span className={styles.movesNum}>{row.num}</span>
          <span>{row.white ?? ''}</span>
          <span>{row.black ?? ''}</span>
        </div>
      ))}
    </div>
  )
}
