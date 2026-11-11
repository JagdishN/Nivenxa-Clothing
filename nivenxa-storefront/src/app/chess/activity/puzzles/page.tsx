import type { Metadata } from 'next'
import Link from 'next/link'
import { listPuzzleHistory, type PuzzleFilter } from '@/lib/chess/activityActions'
import { pickFilter } from '@/lib/chess/activityFormat'
import { PuzzleRows } from '../Lists'
import { Empty, Filters, LoadFailed, Pager, requireActivitySession } from '../Parts'
import SavedPositions from './SavedPositions'
import styles from '../Activity.module.scss'

export const metadata: Metadata = { title: 'My Puzzles — My Activity — NIVENXA Chess', robots: { index: false, follow: false } }

const FILTERS = ['all', 'solved', 'assisted', 'skipped'] as const
const OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'solved', label: 'Solved' },
  { id: 'assisted', label: 'Needed help' },
  { id: 'skipped', label: 'Skipped' },
]
const BASE = '/chess/activity/puzzles'


export default async function MyPuzzlesPage({ searchParams }: { searchParams: Promise<{ filter?: string; cursor?: string }> }) {
  const sp = await searchParams
  const filter = pickFilter(sp.filter, FILTERS, 'all') as PuzzleFilter
  const here = filter === 'all' ? BASE : `${BASE}?filter=${filter}`
  await requireActivitySession(here)
  const res = await listPuzzleHistory({ cursor: sp.cursor, filter })

  return (
    <>
      <Filters base={BASE} current={filter} options={OPTIONS} />
      {!res.ok ? (
        res.reason === 'auth' ? (
          await requireActivitySession(here).then(() => null)
        ) : (
          <LoadFailed what="Puzzles" href={here} unavailable={res.reason === 'unavailable'} />
        )
      ) : res.rows.length === 0 ? (
        filter === 'all' && !sp.cursor ? (
          <Empty title="No puzzles yet" text="Puzzles you solve, skip or reveal are listed here." cta="Try a puzzle" href="/chess/puzzles" />
        ) : (
          <Empty title="No puzzles match" text="Try a different filter." cta="Show all puzzles" href={BASE} />
        )
      ) : (
        <>
          <PuzzleRows rows={res.rows} />
          <Pager base={BASE} filter={filter} cursor={sp.cursor} next={res.next} />
          <p className={styles.note}>
            Each row is your result at the time. Practising a puzzle again after solving it doesn’t change this record, so your first result stays.
          </p>
        </>
      )}

      <h2 className={styles.sectionTitle}>Positions saved from your games</h2>
      <p className={styles.note}>
        Positions you chose to practise from your own analysed games. <Link href="/chess/analysis">Start an analysis</Link> to find more.
      </p>
      <SavedPositions />
    </>
  )
}
