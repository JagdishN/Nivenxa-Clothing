'use client'
import { useState } from 'react'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import GameActions from '../GameActions'
import styles from '../../Activity.module.scss'

const NO_DESTS = new Map<Key, Key[]>()

/** A read-only replay: step through the stored moves. Nothing here runs the engine or writes anything. */
export default function GameReplay({
  fens,
  sans,
  orientation,
  id,
  analysisGameId,
}: {
  fens: string[]
  sans: string[]
  orientation: 'white' | 'black'
  id: string
  analysisGameId: string | null
}) {
  const [ply, setPly] = useState(sans.length)
  const fen = fens[ply]
  const turn: 'white' | 'black' = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  const go = (n: number) => setPly(Math.max(0, Math.min(sans.length, n)))

  return (
    <div className={styles.replay} onKeyDown={(e) => {
      if (e.key === 'ArrowLeft') go(ply - 1)
      else if (e.key === 'ArrowRight') go(ply + 1)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(sans.length)
    }}>
      <div>
        <div className={styles.replayBoard}>
          <Board fen={fen} turnColor={turn} dests={NO_DESTS} orientation={orientation} viewOnly onMove={() => {}} />
        </div>
        <div className={styles.transport} role="group" aria-label="Replay controls">
          <button type="button" className={styles.action} onClick={() => go(0)} disabled={ply === 0} aria-label="First position">
            ⏮
          </button>
          <button type="button" className={styles.action} onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Previous move">
            ◀
          </button>
          <button type="button" className={styles.action} onClick={() => go(ply + 1)} disabled={ply === sans.length} aria-label="Next move">
            ▶
          </button>
          <button type="button" className={styles.action} onClick={() => go(sans.length)} disabled={ply === sans.length} aria-label="Last position">
            ⏭
          </button>
        </div>
      </div>
      <div>
        <p className={styles.moveList} aria-label="Moves">
          {sans.map((san, i) => (
            <span key={i}>
              {i % 2 === 0 && <span>{i / 2 + 1}. </span>}
              <button type="button" className={styles.moveBtn} aria-current={ply === i + 1 ? 'true' : undefined} onClick={() => go(i + 1)}>
                {san}
              </button>{' '}
            </span>
          ))}
        </p>
        <GameActions id={id} analysisGameId={analysisGameId} />
      </div>
    </div>
  )
}
