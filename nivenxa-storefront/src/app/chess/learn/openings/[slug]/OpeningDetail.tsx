'use client'
import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import Link from 'next/link'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import type { Opening } from '@/lib/chess/openings/data'
import styles from './OpeningDetail.module.scss'

// The board is read-only here — no legal moves to offer, and moves never
// come from user interaction, so both are fixed, stable constants.
const EMPTY_DESTS = new Map<Key, Key[]>()
function noop() {}

function moveNumberLabel(ply: number): string {
  return `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '...'}`
}

export default function OpeningDetail({ opening }: { opening: Opening }) {
  // positions[0] is the starting FEN; positions[i] is the FEN after
  // opening.moves[0..i-1] have been played. Computed once per opening.
  const positions = useMemo(() => {
    const chess = new Chess()
    const fens = [chess.fen()]
    for (const san of opening.moves) {
      chess.move(san)
      fens.push(chess.fen())
    }
    return fens
  }, [opening])

  // 0 = starting position (before any move), up to opening.moves.length.
  const [step, setStep] = useState(0)

  const atStart = step === 0
  const atEnd = step === opening.moves.length

  const movePairs: [number, number | undefined][] = []
  for (let i = 0; i < opening.moves.length; i += 2) {
    movePairs.push([i, i + 1 < opening.moves.length ? i + 1 : undefined])
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Link href="/chess/learn/openings" className={styles.breadcrumb}>
          ← Openings
        </Link>
        <h1 className={styles.heading}>{opening.name}</h1>
        <p className={styles.subtext}>{opening.description}</p>
      </section>

      <div className={styles.layout}>
        <div className={styles.boardCol}>
          <div className={styles.boardWrap}>
            <Board
              fen={positions[step]}
              turnColor={step % 2 === 0 ? 'white' : 'black'}
              dests={EMPTY_DESTS}
              viewOnly
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
              {step} / {opening.moves.length}
            </span>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => setStep((s) => Math.min(opening.moves.length, s + 1))}
              disabled={atEnd}
            >
              Next →
            </button>
          </div>

          <div>
            <p className={styles.moveListLabel}>Moves</p>
            <div className={styles.moveList}>
              {movePairs.map(([whitePly, blackPly], i) => (
                <div key={i} className={styles.moveRow}>
                  <span className={styles.moveNum}>{i + 1}</span>
                  <button
                    type="button"
                    className={`${styles.moveCell} ${step === whitePly + 1 ? styles.moveCellSelected : ''}`}
                    onClick={() => setStep(whitePly + 1)}
                  >
                    {opening.moves[whitePly]}
                  </button>
                  {blackPly !== undefined ? (
                    <button
                      type="button"
                      className={`${styles.moveCell} ${step === blackPly + 1 ? styles.moveCellSelected : ''}`}
                      onClick={() => setStep(blackPly + 1)}
                    >
                      {opening.moves[blackPly]}
                    </button>
                  ) : (
                    <span className={styles.moveCell} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.explanation}>
            <p className={styles.explanationLabel}>
              {atStart ? 'Starting position' : moveNumberLabel(step - 1) + opening.moves[step - 1]}
            </p>
            <p className={styles.explanationText}>
              {atStart
                ? `The starting position, before ${opening.name} begins. Step forward to see the first move.`
                : opening.stepExplanations[step - 1]}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
