import type { ReactNode } from 'react'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatPaymentMethod, formatPeriodLabel } from '@/lib/living/format'
import { getFlatLedgerHistory, getFlats } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

function Amount({ value, variant }: { value: number; variant?: 'warn' | 'credit' }): ReactNode {
  if (Math.abs(value) < 0.005) return <span className={theme.dash}>—</span>
  return <span className={variant === 'warn' ? theme.warnText : variant === 'credit' ? theme.creditText : undefined}>{formatCurrency(value)}</span>
}

// The owner-facing view of what Admins call the "Flat Ledger" — same data
// (getFlatLedgerHistory), scoped to the signed-in Owner's own flat, worded
// as "Account History" since residents don't think in accounting terms.
export default async function LivingMyAccountPage() {
  const { supabase, membership, apartment } = await requireMembership(['owner'])

  if (!membership.flat_id) {
    return (
      <div className={theme.card}>
        <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
      </div>
    )
  }

  const flats = await getFlats(supabase, apartment.id)
  const flat = flats.find((f) => f.id === membership.flat_id)
  if (!flat) {
    return (
      <div className={theme.card}>
        <p className={theme.muted}>Your account isn&rsquo;t linked to a flat yet — check with your Admin.</p>
      </div>
    )
  }

  const history = await getFlatLedgerHistory(supabase, apartment, flat)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Account History
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Every bill and payment on record for Flat {flat.flat_no}, oldest first, with a running balance.
      </p>

      <div className={homeStyles.grid} style={{ marginBottom: '1.5rem' }}>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Current balance</div>
          <div className={`${homeStyles.statValue} ${history.closingBalance > 0 ? theme.warnText : ''}`}>{formatCurrency(history.closingBalance)}</div>
          <div className={homeStyles.statSub}>{history.closingBalance > 0 ? 'Still owed' : history.closingBalance < 0 ? 'In credit' : 'Settled'}</div>
        </div>
      </div>

      <div className={theme.card}>
        <div className={theme.tableScroll}>
          <table className={theme.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className={theme.num}>Debit</th>
                <th className={theme.num}>Credit</th>
                <th className={`${theme.num} ${theme.totalCol}`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {history.transactions.map((t, i) => (
                <tr key={i}>
                  <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    {t.kind === 'opening' && 'Opening balance'}
                    {t.kind === 'bill' && `Bill — ${formatPeriodLabel(t.periodStart, t.periodEnd)}`}
                    {t.kind === 'payment' && (
                      <>
                        Payment — {formatPaymentMethod(t.method)}
                        {t.referenceNote && <span className={theme.muted}> ({t.referenceNote})</span>}
                      </>
                    )}
                  </td>
                  <td className={theme.num}>
                    <Amount value={t.kind !== 'payment' ? t.amount : 0} variant="warn" />
                  </td>
                  <td className={theme.num}>
                    <Amount value={t.kind === 'payment' ? t.amount : 0} variant="credit" />
                  </td>
                  <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                    {formatCurrency(t.balance)}
                  </td>
                </tr>
              ))}
              {history.transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className={theme.muted}>
                    Nothing on record yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
