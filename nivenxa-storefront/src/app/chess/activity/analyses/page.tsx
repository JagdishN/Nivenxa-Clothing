import type { Metadata } from 'next'
import Link from 'next/link'
import { listSavedAnalyses, type AnalysisFilter } from '@/lib/chess/activityActions'
import { pickFilter } from '@/lib/chess/activityFormat'
import { AnalysisRows } from '../Lists'
import { Empty, Filters, LoadFailed, Pager, requireActivitySession } from '../Parts'
import styles from '../Activity.module.scss'

export const metadata: Metadata = { title: 'My Analyses — My Activity — NIVENXA Chess', robots: { index: false, follow: false } }

const FILTERS = ['all', 'analysed', 'not-analysed'] as const
const OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'analysed', label: 'Analysis complete' },
  { id: 'not-analysed', label: 'Saved, not analysed' },
]
const BASE = '/chess/activity/analyses'


export default async function MyAnalysesPage({ searchParams }: { searchParams: Promise<{ filter?: string; cursor?: string }> }) {
  const sp = await searchParams
  // Old bookmarks used "analyzed" / "not-analyzed" (US spelling) on /chess/analysis/my-games.
  const raw = sp.filter === 'analyzed' ? 'analysed' : sp.filter === 'not-analyzed' ? 'not-analysed' : sp.filter
  const filter = pickFilter(raw, FILTERS, 'all') as AnalysisFilter
  const here = filter === 'all' ? BASE : `${BASE}?filter=${filter}`
  await requireActivitySession(here)
  const res = await listSavedAnalyses({ cursor: sp.cursor, filter })

  return (
    <>
      <Filters base={BASE} current={filter} options={OPTIONS} />
      {!res.ok ? (
        res.reason === 'auth' ? (
          await requireActivitySession(here).then(() => null)
        ) : (
          <LoadFailed what="Analyses" href={here} unavailable={res.reason === 'unavailable'} />
        )
      ) : res.rows.length === 0 ? (
        filter === 'all' && !sp.cursor ? (
          <Empty title="No saved analyses yet" text="Analyse a game you played, import one, or recreate a position. Finished analyses are saved here." cta="Analyse a game" href="/chess/analysis" />
        ) : (
          <Empty title="No analyses match" text="Try a different filter." cta="Show all analyses" href={BASE} />
        )
      ) : (
        <>
          <AnalysisRows rows={res.rows} />
          <Pager base={BASE} filter={filter} cursor={sp.cursor} next={res.next} />
          <p className={styles.note}>
            Analysis runs in your browser, so there is no waiting queue: a saved analysis is either complete or not run yet. Opening a complete one shows
            the saved result and does not run the engine again.
          </p>
          <p className={styles.note}>
            <Link href="/chess/analysis">Start a new analysis</Link>
          </p>
        </>
      )}
    </>
  )
}
