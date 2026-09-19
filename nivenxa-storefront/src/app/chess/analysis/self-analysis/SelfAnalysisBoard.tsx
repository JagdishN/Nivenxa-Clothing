'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Board from '@/components/chess/Board'
import { useChessGame } from '@/lib/chess/useChessGame'
import { setActiveGame } from '@/lib/chess/analysisSession'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import { saveAnalysisGame } from '@/lib/chess/analysisActions'
import type { NormalizedGame, NormalizedMove } from '@/lib/chess/analysisTypes'
import styles from './SelfAnalysis.module.scss'

interface EnteredMove {
  move: NormalizedMove
  from: string
  to: string
}

/**
 * Reconstructing a game that already happened, not playing a new one — so
 * this deliberately shows nothing engine-derived (no best move, no eval, no
 * hints) while the player is entering moves. Giving the reconstruction any
 * assistance would let Nivenxa influence what "actually happened," which
 * defeats the point of Self Analysis. Assistance only begins once the game
 * is finished and Start Analysis is pressed, on a completed game.
 */
export default function SelfAnalysisBoard() {
  const router = useRouter()
  const chessGame = useChessGame()
  const [entries, setEntries] = useState<EnteredMove[]>([])
  const [redoStack, setRedoStack] = useState<EnteredMove[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [finished, setFinished] = useState(false)
  const [localId] = useState(() => crypto.randomUUID())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function handleMove(from: string, to: string) {
    const result = chessGame.makeMove(from, to)
    if (!result) return
    const move: NormalizedMove = {
      ply: entries.length,
      color: result.color,
      san: result.san,
      fenBefore: result.fenBefore,
      fenAfter: result.fenAfter,
      resolutionStatus: 'confirmed',
    }
    setEntries((prev) => [...prev, { move, from, to }])
    setRedoStack([])
  }

  function handleUndo() {
    if (entries.length === 0) return
    chessGame.undo()
    const last = entries[entries.length - 1]
    setEntries((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, last])
  }

  function handleRedo() {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    const result = chessGame.makeMove(next.from, next.to)
    if (!result) return
    setEntries((prev) => [...prev, next])
    setRedoStack((prev) => prev.slice(0, -1))
  }

  function buildGame(): NormalizedGame {
    return {
      source: 'manual',
      metadata: {},
      moves: entries.map((e) => e.move),
      needsVerification: false,
    }
  }

  async function handleSave() {
    setSaveStatus('saving')
    const ownerId = getOrCreateAnalysisOwnerId()
    const result = await saveAnalysisGame({ ownerId, localId, game: buildGame() })
    setSaveStatus(result.error ? 'error' : 'saved')
  }

  function handleStartAnalysis() {
    setActiveGame(buildGame(), 'analyze')
    router.push('/chess/analysis/player')
  }

  if (finished) {
    const count = entries.length
    return (
      <div className={styles.confirmWrap}>
        <div className={styles.confirmCard}>
          <h2 className={styles.confirmHeading}>Game entered</h2>
          <p className={styles.confirmMeta}>
            You entered {count} move{count === 1 ? '' : 's'}.
          </p>
          <p className={styles.confirmQuestion}>Ready for Nivenxa to analyze your game?</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setFinished(false)}>
              Continue Editing
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleStartAnalysis}>
              Start Analysis
            </button>
          </div>
          <button type="button" className={styles.saveLink} onClick={handleSave} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'saving' ? 'Saving…' : 'Save this game'}
          </button>
          {saveStatus === 'error' && <p className={styles.error}>Couldn&apos;t save — try again.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.builder}>
      <div className={styles.boardCol}>
        <Board
          fen={chessGame.fen}
          turnColor={chessGame.turn === 'w' ? 'white' : 'black'}
          dests={chessGame.dests}
          orientation={orientation}
          onMove={handleMove}
        />
        <div className={styles.boardControls}>
          <button type="button" className={styles.smallBtn} onClick={handleUndo} disabled={entries.length === 0}>
            Undo
          </button>
          <button type="button" className={styles.smallBtn} onClick={handleRedo} disabled={redoStack.length === 0}>
            Redo
          </button>
          <button type="button" className={styles.smallBtn} onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
            Flip Board
          </button>
        </div>
      </div>
      <div className={styles.moveCol}>
        <p className={styles.moveListLabel}>Moves ({entries.length})</p>
        <div className={styles.moveList}>
          {entries.length === 0 && <p className={styles.movePlaceholder}>Play the moves on the board to begin.</p>}
          {entries
            .reduce<{ num: number; white?: NormalizedMove; black?: NormalizedMove }[]>((rows, { move }) => {
              const num = Math.floor(move.ply / 2) + 1
              let row = rows[rows.length - 1]
              if (!row || row.num !== num) {
                row = { num }
                rows.push(row)
              }
              if (move.color === 'w') row.white = move
              else row.black = move
              return rows
            }, [])
            .map((row) => (
              <div key={row.num} className={styles.moveRow}>
                <span className={styles.moveNum}>{row.num}.</span>
                <span className={styles.moveCell}>{row.white?.san ?? ''}</span>
                <span className={styles.moveCell}>{row.black?.san ?? ''}</span>
              </div>
            ))}
        </div>
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryBtn} onClick={() => setFinished(true)} disabled={entries.length === 0}>
            Finish Game
          </button>
        </div>
      </div>
    </div>
  )
}
