import type { ReactNode } from 'react'
import { requireMembership } from '@/lib/living/auth'
import { formatBalanceMeaning, formatCurrency, formatPaymentMethod, formatPeriodLabel } from '@/lib/living/format'
import { getFlatLedgerHistory, getFlats, getReimbursementBalanceForFlat } from '@/lib/living/queries'
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

  const [history, reimbursementBalance] = await Promise.all([
    getFlatLedgerHistory(supabase, apartment, flat),
    getReimbursementBalanceForFlat(supabase, apartment.id, flat.id),
  ])
  // Two independent accounts, never netted together — what you owe the association (opening/bill/
  // payment) rendered below as usual, and what the association owes YOU for expenses you funded
  // personally, as its own section further down, only when there's anything to show.
  const mainTransactions = history.transactions.filter((t) => t.kind === 'opening' || t.kind === 'bill' || t.kind === 'payment')
  const reimbursementTransactions = history.transactions.filter((t) => t.kind === 'resident_expense' || t.kind === 'reimbursement_settlement')

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
          <div className={homeStyles.statLabel}>Bill Balance</div>
          <div className={homeStyles.statValue} style={{ fontSize: '1.25rem' }}>
            {formatBalanceMeaning(history.closingBalance, reimbursementBalance, { audience: 'resident' })}
          </div>
        </div>
        {reimbursementBalance > 0.005 && (
          <div className={theme.card}>
            <div className={homeStyles.statLabel}>Association owes you</div>
            <div className={homeStyles.statValue} style={{ fontSize: '1.25rem' }}>{formatCurrency(reimbursementBalance)}</div>
          </div>
        )}
      </div>

      <div className={theme.card} style={{ marginBottom: reimbursementTransactions.length > 0 ? '1.5rem' : 0 }}>
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
              {mainTransactions.map((t, i) => (
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
              {mainTransactions.length === 0 && (
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

      {reimbursementTransactions.length > 0 && (
        <div className={theme.card}>
          <h2 className={homeStyles.sectionTitle}>Expenses You&rsquo;ve Funded</h2>
          <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
            A separate account from your Bill Balance above — never netted into it unless a settlement was specifically an
            adjustment against your bill.
          </p>
          <div className={theme.tableScroll}>
            <table className={theme.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className={theme.num}>Owed</th>
                  <th className={theme.num}>Settled</th>
                  <th className={`${theme.num} ${theme.totalCol}`}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {reimbursementTransactions.map((t, i) => (
                  <tr key={i}>
                    <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                    <td>
                      {t.kind === 'resident_expense' && `Paid by you — ${t.description}`}
                      {t.kind === 'reimbursement_settlement' && (t.settlementType === 'cash' ? 'Reimbursed to you' : 'Adjusted against your bill')}
                    </td>
                    <td className={theme.num}>
                      <Amount value={t.kind === 'resident_expense' ? t.amount : 0} variant="warn" />
                    </td>
                    <td className={theme.num}>
                      <Amount value={t.kind === 'reimbursement_settlement' ? t.amount : 0} variant="credit" />
                    </td>
                    <td className={`${theme.num} ${theme.totalCol}`} style={{ fontWeight: 700 }}>
                      {formatCurrency(t.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
