import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlayedGame } from '@/lib/chess/activityActions'
import { replayFens } from '@/lib/chess/gamePgn'
import { shortDate } from '@/lib/chess/activityFormat'
import { LoadFailed, requireActivitySession } from '../../Parts'
import GameReplay from './GameReplay'
import styles from '../../Activity.module.scss'

export const metadata: Metadata = { title: 'Replay — My Games — NIVENXA Chess', robots: { index: false, follow: false } }

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireActivitySession(`/chess/activity/games/${id}`)
  const res = await getPlayedGame(id) // owner-checked on the server
  if (!res.ok) {
    if (res.reason === 'notfound') notFound()
    return <LoadFailed what="Game" href={`/chess/activity/games/${id}`} unavailable={res.reason === 'unavailable'} />
  }
  const replay = replayFens(res.game.movesSan, res.game.startingFen)
  if (!replay) return <LoadFailed what="Game" href="/chess/activity/games" />

  return (
    <>
      <p className={styles.note}>
        <Link href="/chess/activity/games">← My Games</Link>
      </p>
      <h2 className={styles.sectionTitle} style={{ marginTop: '0.4rem' }}>
        vs {res.game.opponent}
      </h2>
      <p className={styles.rowMeta}>
        {shortDate(res.game.startedAt)} · You played {res.game.playerColor === 'w' ? 'White' : 'Black'} · {res.game.moveCount} moves · {res.game.result ?? '*'}
      </p>
      <GameReplay
        fens={replay.fens}
        sans={replay.moves.map((m) => m.san)}
        orientation={res.game.playerColor === 'w' ? 'white' : 'black'}
        id={res.game.id}
        analysisGameId={res.game.analysisGameId}
      />
    </>
  )
}
