import type { Metadata } from 'next'
import Link from 'next/link'
import { listPlayedGames, type GameFilter } from '@/lib/chess/activityActions'
import { pickFilter } from '@/lib/chess/activityFormat'
import { GameRows } from '../Lists'
import { Empty, Filters, LoadFailed, Pager, requireActivitySession } from '../Parts'
import styles from '../Activity.module.scss'

export const metadata: Metadata = { title: 'My Games — My Activity — NIVENXA Chess', robots: { index: false, follow: false } }

const FILTERS = ['all', 'won', 'lost', 'draw', 'analysed'] as const
const OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'draw', label: 'Draws' },
  { id: 'analysed', label: 'Analysed' },
]
const BASE = '/chess/activity/games'


export default async function MyGamesPage({ searchParams }: { searchParams: Promise<{ filter?: string; cursor?: string }> }) {
  const sp = await searchParams
  const filter = pickFilter(sp.filter, FILTERS, 'all') as GameFilter
  const here = filter === 'all' ? BASE : `${BASE}?filter=${filter}`
  await requireActivitySession(here)
  const res = await listPlayedGames({ cursor: sp.cursor, filter })

  return (
    <>
      <Filters base={BASE} current={filter} options={OPTIONS} />
      {!res.ok ? (
        res.reason === 'auth' ? (
          await requireActivitySession(here).then(() => null)
        ) : (
          <LoadFailed what="Games" href={here} unavailable={res.reason === 'unavailable'} />
        )
      ) : res.rows.length === 0 ? (
        filter === 'all' && !sp.cursor ? (
          <Empty title="No games yet" text="Games you play against NIVENXA are saved here when they finish." cta="Play your first game" href="/chess/play" />
        ) : (
          <Empty title="No games match" text="Try a different filter." cta="Show all games" href={BASE} />
        )
      ) : (
        <>
          <GameRows rows={res.rows} />
          <Pager base={BASE} filter={filter} cursor={sp.cursor} next={res.next} />
          <p className={styles.note}>
            Want to analyse a game that isn’t here? <Link href="/chess/analysis">Start an analysis</Link>.
          </p>
        </>
      )}
    </>
  )
}
