'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getPlayedGame, getPlayedGamePgn } from '@/lib/chess/activityActions'
import { normalizedFromStored } from '@/lib/chess/gamePgn'
import { setActiveGame } from '@/lib/chess/analysisSession'
import styles from '../Activity.module.scss'

/**
 * Replay · Analyse (or View analysis when one is saved) · Download PGN for one played game.
 * Opening a SAVED analysis goes straight to it — nothing is recomputed. "Analyse" hands the game to the Analysis
 * Player, which runs the engine only because the player asked for it. Each action ignores repeat clicks while it runs.
 */
export default function GameActions({ id, analysisGameId }: { id: string; analysisGameId: string | null }) {
  const router = useRouter()
  const busy = useRef(false)
  const [working, setWorking] = useState<'analyse' | 'pgn' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'analyse' | 'pgn', fn: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setWorking(kind)
    setError(null)
    try {
      await fn()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      busy.current = false
      setWorking(null)
    }
  }

  const analyse = () =>
    run('analyse', async () => {
      const res = await getPlayedGame(id)
      if (!res.ok) throw new Error(res.reason)
      const game = normalizedFromStored(res.game)
      if (!game) {
        setError('This game’s moves could not be read, so it can’t be analysed.')
        return
      }
      game.playedGameId = id // so the saved analysis is linked back to this game instead of copying it
      setActiveGame(game, 'analyze')
      router.push('/chess/analysis/player')
    })

  const download = () =>
    run('pgn', async () => {
      const res = await getPlayedGamePgn(id)
      if (!res.ok) throw new Error(res.reason)
      const url = URL.createObjectURL(new Blob([res.pgn], { type: 'application/x-chess-pgn' }))
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    })

  return (
    <div>
      <div className={styles.actions}>
        <Link href={`/chess/activity/games/${id}`} className={styles.action}>
          Replay
        </Link>
        {analysisGameId ? (
          <Link href={`/chess/analysis/player?gameId=${analysisGameId}`} className={styles.actionPrimary}>
            View analysis
          </Link>
        ) : (
          <button type="button" className={styles.actionPrimary} onClick={analyse} disabled={working !== null}>
            {working === 'analyse' ? 'Opening…' : 'Analyse'}
          </button>
        )}
        <button type="button" className={styles.action} onClick={download} disabled={working !== null}>
          {working === 'pgn' ? 'Preparing…' : 'Download PGN'}
        </button>
      </div>
      {error && (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
