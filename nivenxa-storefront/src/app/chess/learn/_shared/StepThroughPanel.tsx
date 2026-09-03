'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { computeMoveSquares } from './moveSquares'
import styles from './StepThroughPanel.module.scss'

// The board is read-only here — no legal moves to offer, and moves never
// come from user interaction, so both are fixed, stable constants.
const EMPTY_DESTS = new Map<Key, Key[]>()
function noop() {}

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
}: {
  example: StepThroughExample
  footer?: React.ReactNode
  /** When provided, a button appears once the learner reaches the last move. */
  onPracticeClick?: () => void
  /** Text for that button — defaults to "Try it yourself →" (Openings' Practice mode); pass e.g. "Your Turn →" for a different phase name. */
  practiceCtaLabel?: string
  /** When provided (and onPracticeClick isn't), a "Learn X next" link appears once the learner reaches the last move. */
  nextCta?: { href: string; label: string }
}) {
  const { moves, stepExplanations } = example

  // positions[0] is the starting FEN; positions[i] is the FEN after
  // moves[0..i-1] have been played. lastMoves[0] is undefined (no move yet);
  // lastMoves[i] is the [from, to] of moves[i-1]. Computed once per example.
  const { positions, metas, lastMoves } = useMemo(() => {
    const chess = example.fen ? new Chess(example.fen) : new Chess()
    const fens = [chess.fen()]
    const squares = computeMoveSquares(moves, example.fen)
    const froms: (Key[] | undefined)[] = [undefined, ...squares.map((s) => [s.from, s.to])]
    for (const san of moves) {
      chess.move(san)
      fens.push(chess.fen())
    }
    return { positions: fens, metas: fens.map(parseFenMeta), lastMoves: froms }
  }, [example.fen, moves])

  // 0 = starting position (before any move), up to moves.length.
  const [step, setStep] = useState(0)

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
              if (atStart) return undefined
              const raw = example.stepHighlights?.[step - 1]
              if (!raw) return undefined
              return (Array.isArray(raw) ? raw : [raw]) as Key[]
            })()}
            hintArrow={!atStart ? (example.stepArrows?.[step - 1] as Key[] | undefined) : undefined}
            onMove={noop}
          />
        </div>
      </div>

      <div className={styles.panelCol}>
        <div className={styles.stepControls}>
          <button type="button" className={styles.stepBtn} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={atStart}>
            ← Previous
          </button>
          <span className={styles.stepIndicator}>
            {atStart ? `Start · ${moves.length} moves` : `Move ${step} of ${moves.length}`}
          </span>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => setStep((s) => Math.min(moves.length, s + 1))}
            disabled={atEnd}
          >
            Next →
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
                    className={`${styles.moveCell} ${step === row.white.ply + 1 ? styles.moveCellSelected : ''}`}
                    onClick={() => setStep(row.white!.ply + 1)}
                  >
                    {row.white.san}
                  </button>
                ) : (
                  <span className={styles.moveCell} />
                )}
                {row.black ? (
                  <button
                    type="button"
                    className={`${styles.moveCell} ${step === row.black.ply + 1 ? styles.moveCellSelected : ''}`}
                    onClick={() => setStep(row.black!.ply + 1)}
                  >
                    {row.black.san}
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

        {footer}
      </div>
    </>
  )
}
