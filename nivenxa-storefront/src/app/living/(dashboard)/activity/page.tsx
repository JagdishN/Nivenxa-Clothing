import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatActivityTimestamp, formatCurrency } from '@/lib/living/format'
import { getRecentActivity, type ActivityEntry } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

type Filter = 'all' | 'payments' | 'expenses'

function filterHref(filter: Filter): string {
  return `/living/activity?filter=${filter}`
}

/** Overview's "View All Activity" destination — the same payments+expenses union getRecentActivity feeds there, uncapped and filterable. */
export default async function LivingActivityPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: filterParam } = await searchParams
  const filter: Filter = filterParam === 'payments' || filterParam === 'expenses' ? filterParam : 'all'

  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const activity = await getRecentActivity(supabase, apartment.id, 200)
  const visible = activity.filter((entry) => filter === 'all' || (filter === 'payments' ? entry.kind === 'payment' : entry.kind === 'expense'))

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Activity
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.25rem' }}>Every payment and expense recorded, most recent first.</p>

      <div className={theme.filterBar}>
        <Link href={filterHref('all')} className={filter === 'all' ? theme.filterChipActive : theme.filterChip}>
          All
        </Link>
        <Link href={filterHref('payments')} className={filter === 'payments' ? theme.filterChipActive : theme.filterChip}>
          Payments
        </Link>
        <Link href={filterHref('expenses')} className={filter === 'expenses' ? theme.filterChipActive : theme.filterChip}>
          Expenses
        </Link>
      </div>

      <div className={theme.card}>
        {visible.length === 0 && <p className={theme.muted}>No activity recorded yet.</p>}
        {visible.map((entry, i) => (
          <div key={i} className={homeStyles.activityEntry}>
            <div className={homeStyles.activityTop}>
              <span>{activityTitle(entry)}</span>
              <span>{formatCurrency(entry.amount)}</span>
            </div>
            <div className={homeStyles.activityTime}>{formatActivityTimestamp(entry.createdAt)}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function activityTitle(entry: ActivityEntry): string {
  if (entry.kind === 'payment') return `Payment received · Flat ${entry.flatNo}`
  return `Expense added · ${entry.category ?? entry.description}`
}
