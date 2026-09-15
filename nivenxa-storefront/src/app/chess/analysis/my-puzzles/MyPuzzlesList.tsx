'use client'
import { useEffect, useState } from 'react'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import { listMyPuzzles, deletePracticePosition, type PracticePosition } from '@/lib/chess/analysisActions'
import styles from './MyPuzzles.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()

export default function MyPuzzlesList() {
  const [positions, setPositions] = useState<PracticePosition[] | null>(null)

  useEffect(() => {
    const ownerId = getOrCreateAnalysisOwnerId()
    listMyPuzzles(ownerId).then(setPositions)
  }, [])

  async function handleDelete(id: string) {
    const ownerId = getOrCreateAnalysisOwnerId()
    await deletePracticePosition(ownerId, id)
    setPositions((prev) => prev?.filter((p) => p.id !== id) ?? null)
  }

  if (positions === null) return <p className={styles.loading}>Loading your puzzles…</p>
  if (positions.length === 0) {
    return <p className={styles.empty}>No saved positions yet — save one from a Practice Position in Analysis.</p>
  }

  return (
    <div className={styles.grid}>
      {positions.map((p) => {
        const turnColor: 'white' | 'black' = p.fen.split(' ')[1] === 'b' ? 'black' : 'white'
        return (
          <div key={p.id} className={styles.card}>
            <div className={styles.boardWrap}>
              <Board fen={p.fen} turnColor={turnColor} dests={EMPTY_DESTS} viewOnly onMove={() => {}} />
            </div>
            <p className={styles.cardMeta}>{turnColor === 'white' ? 'White' : 'Black'} to move</p>
            <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(p.id)}>
              Remove
            </button>
          </div>
        )
      })}
    </div>
  )
}
