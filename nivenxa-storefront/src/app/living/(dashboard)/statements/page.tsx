import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency, formatPeriodLabel } from '@/lib/living/format'
import { computeFinancialStatements, getPublishedStatements } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

async function publishStatementAction(periodId: string) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const statements = await computeFinancialStatements(supabase, apartment)
  const match = statements.find((s) => s.period.id === periodId)
  if (!match) {
    await setLivingError('That billing period could not be found.')
    redirect('/living/statements')
  }

  const { error } = await supabase.from('living_financial_statements').upsert(
    {
      apartment_id: apartment.id,
      maintenance_month_id: periodId,
      opening_balance: match.openingBalance,
      collections: match.collections,
      expenses: match.expenses,
      closing_balance: match.closingBalance,
      outstanding_dues: match.outstandingDues,
      published_by: userId,
      published_at: new Date().toISOString(),
    },
    { onConflict: 'maintenance_month_id' }
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/statements')
  }
  await setLivingNotice('Published — residents can now view this statement.')
  redirect('/living/statements')
}

export default async function LivingStatementsPage() {
  const { supabase, membership, apartment } = await requireMembership()
  const canManage = membership.role === 'admin' || membership.role === 'treasurer'

  if (!canManage) {
    const statements = await getPublishedStatements(supabase, apartment.id)
    return (
      <>
        <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
          Financial Statements
        </h1>
        <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
          What the association collected and spent, and what&rsquo;s still owed — published by the Admin/Treasurer at the end of each
          billing period.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {statements.map((s) => (
            <StatementCard
              key={s.id}
              periodLabel={formatPeriodLabel(s.period.month, s.period.period_end)}
              openingBalance={s.opening_balance}
              collections={s.collections}
              expenses={s.expenses}
              closingBalance={s.closing_balance}
              outstandingDues={s.outstanding_dues}
              footer={`Published ${new Date(s.published_at).toLocaleDateString('en-IN')}`}
            />
          ))}
          {statements.length === 0 && (
            <div className={theme.card}>
              <p className={theme.muted}>Nothing published yet.</p>
            </div>
          )}
        </div>
      </>
    )
  }

  const [computed, published] = await Promise.all([computeFinancialStatements(supabase, apartment), getPublishedStatements(supabase, apartment.id)])
  const publishedByPeriod = new Map(published.map((s) => [s.maintenance_month_id, s]))

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Financial Statements
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Computed live from Payments/Expenses/Bills for every published billing period. Publish a period to make it visible to
        residents under Community — republish any time the numbers change.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {computed.map((s) => {
          const existing = publishedByPeriod.get(s.period.id)
          return (
            <StatementCard
              key={s.period.id}
              periodLabel={formatPeriodLabel(s.period.month, s.period.period_end)}
              openingBalance={s.openingBalance}
              collections={s.collections}
              expenses={s.expenses}
              closingBalance={s.closingBalance}
              outstandingDues={s.outstandingDues}
              footer={
                existing ? (
                  <span className={theme.pillOk}>Published {new Date(existing.published_at).toLocaleDateString('en-IN')}</span>
                ) : (
                  <span className={theme.pillBrass}>Not published</span>
                )
              }
              action={
                <form action={publishStatementAction.bind(null, s.period.id)}>
                  <button type="submit" className={theme.buttonGhost}>
                    {existing ? 'Republish' : 'Publish'}
                  </button>
                </form>
              }
            />
          )
        })}
        {computed.length === 0 && (
          <div className={theme.card}>
            <p className={theme.muted}>No published billing periods yet — Financial Statements start once the first one is published on Maintenance.</p>
          </div>
        )}
      </div>
    </>
  )
}

function StatementCard({
  periodLabel,
  openingBalance,
  collections,
  expenses,
  closingBalance,
  outstandingDues,
  footer,
  action,
}: {
  periodLabel: string
  openingBalance: number
  collections: number
  expenses: number
  closingBalance: number
  outstandingDues: number
  footer: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={theme.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
        <strong>{periodLabel}</strong>
        {footer}
      </div>
      <div className={homeStyles.billSummary}>
        <div className={homeStyles.billLine}>
          <span>Opening balance</span>
          <span className={theme.num}>{formatCurrency(openingBalance)}</span>
        </div>
        <div className={homeStyles.billLine}>
          <span>Collections</span>
          <span className={`${theme.num} ${theme.creditText}`}>{formatCurrency(collections)}</span>
        </div>
        <div className={homeStyles.billLine}>
          <span>Expenses</span>
          <span className={`${theme.num} ${theme.warnText}`}>{formatCurrency(expenses)}</span>
        </div>
        <div className={homeStyles.billTotal}>
          <span>Closing balance</span>
          <span className={theme.num}>{formatCurrency(closingBalance)}</span>
        </div>
        <div className={homeStyles.billLine}>
          <span>Outstanding apartment dues</span>
          <span className={theme.num}>{formatCurrency(outstandingDues)}</span>
        </div>
      </div>
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  )
}
