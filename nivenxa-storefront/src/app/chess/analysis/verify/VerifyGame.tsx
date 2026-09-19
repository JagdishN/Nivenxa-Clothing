'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Chess } from 'chess.js'
import type { Key } from 'chessground/types'
import Board from '@/components/chess/Board'
import { getPendingGame, setActiveGame, clearPendingGame } from '@/lib/chess/analysisSession'
import { applyMoveResolutions, truncateGameAt } from '@/lib/chess/applyMoveResolutions'
import { getOrCreateAnalysisOwnerId } from '@/lib/chess/analysisOwner'
import { saveAnalysisGame } from '@/lib/chess/analysisActions'
import type { NormalizedGame } from '@/lib/chess/analysisTypes'
import styles from './Verify.module.scss'

const EMPTY_DESTS = new Map<Key, Key[]>()
const STANDARD_START_FEN = new Chess().fen()
const AUTOPLAY_STEP_MS = 700

// Only Import-sourced games (paste/PGN/OCR) ever reach Verify — Self Analysis
// and Nivenxa Play games are always already-confirmed and skip this screen
// entirely — so "Edit Moves" only ever needs to go back to Import.
const EDIT_HREF = '/chess/analysis/import'

export default function VerifyGame() {
  const router = useRouter()
  const [game, setGame] = useState<NormalizedGame | null | undefined>(undefined) // undefined = still loading
  const [resolutions, setResolutions] = useState<Map<number, string>>(new Map())
  const [step, setStep] = useState(0)
  const [activeFlagPly, setActiveFlagPly] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [localId] = useState(() => crypto.randomUUID())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    setGame(getPendingGame())
  }, [])

  const resolvedGame = useMemo(() => {
    if (!game) return game
    return resolutions.size > 0 ? applyMoveResolutions(game, resolutions) : game
  }, [game, resolutions])

  const moves = resolvedGame?.moves ?? []
  const flagged = moves.filter((m) => m.resolutionStatus === 'needs-review')

  // Jump the board straight to whichever flagged move is being resolved, and
  // default to the first one so opening Verify with uncertain moves doesn't
  // require an extra click to find them.
  useEffect(() => {
    if (activeFlagPly === null && flagged.length > 0) {
      setActiveFlagPly(flagged[0].ply)
      setStep(flagged[0].ply + 1)
    }
    // Only re-run when the flagged set actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagged.length])

  useEffect(() => {
    if (activeFlagPly !== null) setStep(activeFlagPly + 1)
  }, [activeFlagPly])

  const atStart = step === 0
  const atEnd = step >= moves.length

  useEffect(() => {
    if (!isPlaying || atEnd) return
    const timer = setTimeout(() => setStep((s) => Math.min(moves.length, s + 1)), AUTOPLAY_STEP_MS)
    return () => clearTimeout(timer)
  }, [isPlaying, atEnd, step, moves.length])

  const positionFen = step === 0 ? (moves[0]?.fenBefore ?? resolvedGame?.startingFen ?? STANDARD_START_FEN) : moves[step - 1].fenAfter
  const positionTurn: 'white' | 'black' = positionFen.split(' ')[1] === 'b' ? 'black' : 'white'

  const chips = useMemo(() => {
    if (activeFlagPly === null || !resolvedGame) return []
    const target = resolvedGame.moves.find((m) => m.ply === activeFlagPly)
    if (!target) return []
    try {
      return new Chess(target.fenBefore).moves({ verbose: true }).map((m) => ({ san: m.san, from: m.from, to: m.to }))
    } catch {
      return []
    }
  }, [activeFlagPly, resolvedGame])

  const activeMove = activeFlagPly !== null ? moves.find((m) => m.ply === activeFlagPly) : undefined

  if (game === undefined) return null
  if (!game || game.moves.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nothing to verify yet.</p>
        <button type="button" className={styles.primaryBtn} onClick={() => router.push('/chess/analysis')}>
          Back to Analysis
        </button>
      </div>
    )
  }

  function pickChip(san: string) {
    if (activeFlagPly === null) return
    const nextResolutions = new Map(resolutions)
    nextResolutions.set(activeFlagPly, san)
    setResolutions(nextResolutions)
    const remaining = flagged.filter((m) => m.ply !== activeFlagPly)
    setActiveFlagPly(remaining.length > 0 ? remaining[0].ply : null)
  }

  function truncateHere() {
    if (activeFlagPly === null || !game) return
    const truncated = truncateGameAt(game, activeFlagPly)
    setGame(truncated)
    const remaining = flagged.filter((m) => m.ply !== activeFlagPly)
    setActiveFlagPly(remaining.length > 0 ? remaining[0].ply : null)
  }

  function handleMoveClick(ply: number) {
    setIsPlaying(false)
    setStep(ply + 1)
    const move = moves.find((m) => m.ply === ply)
    setActiveFlagPly(move?.resolutionStatus === 'needs-review' ? ply : null)
  }

  async function handleSave() {
    if (!resolvedGame) return
    setSaveStatus('saving')
    const ownerId = getOrCreateAnalysisOwnerId()
    const result = await saveAnalysisGame({ ownerId, localId, game: resolvedGame })
    setSaveStatus(result.error ? 'error' : 'saved')
  }

  function proceed(mode: 'watch' | 'analyze') {
    if (!resolvedGame) return
    setActiveGame(resolvedGame, mode)
    clearPendingGame()
    router.push('/chess/analysis/player')
  }

  // Move-pairs table, grouped by fullmove number rather than array index —
  // same pattern as StepThroughPanel/Play's Moves tab.
  const rows: { num: number; white?: (typeof moves)[number]; black?: (typeof moves)[number] }[] = []
  moves.forEach((m) => {
    const num = Math.floor(m.ply / 2) + 1
    let row = rows[rows.length - 1]
    if (!row || row.num !== num) {
      row = { num }
      rows.push(row)
    }
    if (m.color === 'w') row.white = m
    else row.black = m
  })

  return (
    <>
      <header className={styles.header}>
        <Link href="/chess/analysis" className={styles.breadcrumb}>
          ← Analysis
        </Link>
        <h1 className={styles.heading}>Game Reconstructed</h1>
        <p className={styles.subheading}>
          {moves.length} move{moves.length === 1 ? '' : 's'} found
          {flagged.length > 0 && ` · ${flagged.length} need${flagged.length === 1 ? 's' : ''} your review`}
        </p>
      </header>

      <div className={styles.workspace}>
        <div className={styles.boardCol}>
          <Board fen={positionFen} turnColor={positionTurn} dests={EMPTY_DESTS} viewOnly onMove={() => {}} />
          <div className={styles.controls}>
            <button type="button" onClick={() => { setIsPlaying(false); setStep(0) }} disabled={atStart}>
              |&lt; Start
            </button>
            <button type="button" onClick={() => { setIsPlaying(false); setStep((s) => Math.max(0, s - 1)) }} disabled={atStart}>
              &lt; Previous
            </button>
            <button type="button" onClick={() => setIsPlaying((p) => !p)} disabled={atEnd && !isPlaying}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => { setIsPlaying(false); setStep((s) => Math.min(moves.length, s + 1)) }} disabled={atEnd}>
              Next &gt;
            </button>
            <button type="button" onClick={() => { setIsPlaying(false); setStep(moves.length) }} disabled={atEnd}>
              End &gt;|
            </button>
          </div>

          {activeMove && (
            <div className={styles.resolvePanel}>
              <p className={styles.resolveTitle}>
                We couldn&apos;t confidently read move {Math.floor(activeMove.ply / 2) + 1}
                {activeMove.color === 'b' ? ' (Black)' : ''}.
              </p>
              {activeMove.rawGuess && <p className={styles.resolveGuess}>Possible reading: {activeMove.rawGuess}</p>}
              <p className={styles.resolveQuestion}>Which move was played?</p>
              <div className={styles.chipRow}>
                {chips.map((c) => (
                  <button key={c.san} type="button" className={styles.chip} onClick={() => pickChip(c.san)}>
                    {c.san}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.truncateBtn} onClick={truncateHere}>
                End the game here instead
              </button>
            </div>
          )}
        </div>

        <div className={styles.moveCol}>
          <p className={styles.moveListLabel}>Moves</p>
          <div className={styles.moveList}>
            {rows.map((row) => (
              <div key={row.num} className={styles.moveRow}>
                <span className={styles.moveNum}>{row.num}</span>
                {(['white', 'black'] as const).map((side) => {
                  const m = row[side]
                  if (!m) return <span key={side} className={styles.moveCell} />
                  const flaggedHere = m.resolutionStatus === 'needs-review'
                  const selected = step === m.ply + 1
                  return (
                    <button
                      key={side}
                      type="button"
                      className={`${styles.moveCell} ${selected ? styles.moveCellSelected : ''} ${flaggedHere ? styles.moveCellFlagged : ''}`}
                      onClick={() => handleMoveClick(m.ply)}
                    >
                      {m.san}
                      {flaggedHere && ' ?'}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {flagged.length === 0 ? (
            <div className={styles.confirmBlock}>
              <p className={styles.confirmText}>Everything looks correct.</p>
              <div className={styles.actionRow}>
                <button type="button" className={styles.primaryBtn} onClick={() => proceed('analyze')}>
                  Start Analysis
                </button>
                <button type="button" className={styles.secondaryBtn} onClick={() => proceed('watch')}>
                  Watch Full Game
                </button>
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.linkBtn} onClick={handleSave} disabled={saveStatus === 'saving'}>
                  {saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'saving' ? 'Saving…' : 'Save this game'}
                </button>
                {saveStatus === 'error' && <span className={styles.error}>Couldn&apos;t save — try again.</span>}
                <button type="button" className={styles.linkBtn} onClick={() => router.push(EDIT_HREF)}>
                  Edit Moves
                </button>
              </div>
            </div>
          ) : (
            <p className={styles.pendingNote}>Resolve the flagged move{flagged.length === 1 ? '' : 's'} above to continue.</p>
          )}
        </div>
      </div>
    </>
  )
}
