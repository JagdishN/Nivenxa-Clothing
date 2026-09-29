import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatActivityTimestamp, formatCurrency, formatPaymentMethod } from '@/lib/living/format'
import { getExpenseById, getFlats, getReimbursementDetailForExpense } from '@/lib/living/queries'
import type { ExpenseSource } from '@/lib/living/types'
import ConfirmSubmitButton from '../../ConfirmSubmitButton'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'

const RECEIPT_BUCKET = 'expense-receipts'
const SOURCE_LABELS: Record<ExpenseSource, string> = { manual: 'Manual', maintenance_sync: 'Maintenance', water_sync: 'Water' }

/** Brand-new and unreferenced only — everything else must be Reversed. Mirrors the same gate in expenses/page.tsx's own deleteExpenseAction (each page in this app owns its server actions, no shared actions module). */
async function deleteExpenseAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { data: expense } = await supabase.from('living_expenses').select('*').eq('id', id).eq('apartment_id', apartment.id).maybeSingle()
  if (!expense) {
    await setLivingError('Expense not found.')
    return
  }
  const { count: settlementCount } = await supabase.from('living_reimbursement_settlements').select('id', { count: 'exact', head: true }).eq('expense_id', id)
  const referenced =
    expense.source !== 'manual' ||
    (settlementCount ?? 0) > 0 ||
    (expense.carry_forward_months !== null && (expense.carry_forward_remaining ?? 0) < expense.carry_forward_months)
  if (referenced) {
    await setLivingError('This expense has already been referenced elsewhere — use Reverse instead of Delete.')
    return
  }
  const { error } = await supabase.from('living_expenses').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Expense removed.')
  redirect('/living/expenses')
}

async function reverseExpenseAction(id: string, formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const reason = String(formData.get('void_reason') ?? '').trim()
  if (!reason) {
    await setLivingError('Enter a reason for reversing this expense.')
    return
  }
  const { error } = await supabase
    .from('living_expenses')
    .update({ voided_at: new Date().toISOString(), voided_by: userId, void_reason: reason })
    .eq('id', id)
    .eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Expense reversed.')
}

export default async function LivingExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const expense = await getExpenseById(supabase, apartment.id, id)
  if (!expense) notFound()

  const [flats, { count: settlementCount }, receiptUrl] = await Promise.all([
    getFlats(supabase, apartment.id),
    supabase.from('living_reimbursement_settlements').select('id', { count: 'exact', head: true }).eq('expense_id', id),
    expense.receipt_path
      ? supabase.storage
          .from(RECEIPT_BUCKET)
          .createSignedUrl(expense.receipt_path, 60 * 10)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
  ])
  const flat = expense.resident_flat_id ? flats.find((f) => f.id === expense.resident_flat_id) : undefined
  const reimbursementDetail = expense.paid_by === 'resident' ? await getReimbursementDetailForExpense(supabase, id) : null

  const referenced =
    expense.source !== 'manual' ||
    (settlementCount ?? 0) > 0 ||
    (expense.carry_forward_months !== null && (expense.carry_forward_remaining ?? 0) < expense.carry_forward_months)

  return (
    <>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link href="/living/expenses" className={theme.muted}>
          ← All expenses
        </Link>
      </p>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className={theme.heading} style={{ fontSize: '1.6rem', margin: 0 }}>
          {expense.description}
        </h1>
        <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
          {new Date(expense.expense_date).toLocaleDateString('en-IN')} · {formatCurrency(expense.amount)}
          {expense.voided_at && <span className={theme.warnText}> · Reversed</span>}
        </p>
      </div>

      {expense.voided_at && (
        <div className={theme.alert} style={{ marginBottom: '1.5rem' }}>
          Reversed {formatActivityTimestamp(expense.voided_at)}
          {expense.void_reason && <> — {expense.void_reason}</>}. Excluded from every total; kept here for audit.
        </div>
      )}

      <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: 0 }}>
          <div>
            <dt className={theme.label}>Category</dt>
            <dd style={{ margin: 0 }}>{expense.category ?? '—'}</dd>
          </div>
          <div>
            <dt className={theme.label}>Paid By</dt>
            <dd style={{ margin: 0 }}>
              {expense.paid_by === 'resident' ? `Flat ${flat?.flat_no ?? '—'}${flat?.owner_name ? ` — ${flat.owner_name}` : ''}` : 'Association'}
            </dd>
          </div>
          <div>
            <dt className={theme.label}>Paid To / Vendor</dt>
            <dd style={{ margin: 0 }}>{expense.paid_to ?? '—'}</dd>
          </div>
          <div>
            <dt className={theme.label}>Method</dt>
            <dd style={{ margin: 0 }}>{formatPaymentMethod(expense.method)}</dd>
          </div>
          <div>
            <dt className={theme.label}>Reference</dt>
            <dd style={{ margin: 0 }}>{expense.reference_note ?? '—'}</dd>
          </div>
          <div>
            <dt className={theme.label}>Source</dt>
            <dd style={{ margin: 0 }}>{SOURCE_LABELS[expense.source]}</dd>
          </div>
          <div>
            <dt className={theme.label}>Recovery period</dt>
            <dd style={{ margin: 0 }}>
              {!expense.carry_forward_months
                ? 'One-off, not recovered from residents'
                : expense.carry_forward_months === 1
                  ? expense.carry_forward_remaining
                    ? 'Included in next bill cycle'
                    : 'Applied'
                  : `Spread over ${expense.carry_forward_months} months (${expense.carry_forward_remaining ?? 0} left)`}
            </dd>
          </div>
          <div>
            <dt className={theme.label}>Receipt</dt>
            <dd style={{ margin: 0 }}>
              {receiptUrl ? (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                  View receipt →
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        {expense.expense_notes && <p className={theme.muted} style={{ marginTop: '1rem' }}>{expense.expense_notes}</p>}
      </div>

      {reimbursementDetail && (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <h2 className={homeStyles.sectionTitle}>Reimbursement</h2>
          <p className={theme.muted} style={{ marginBottom: '0.75rem' }}>
            Settled {formatCurrency(reimbursementDetail.totalSettled)} of {formatCurrency(expense.amount)} —{' '}
            {formatCurrency(reimbursementDetail.remaining)} remaining.
          </p>
          {reimbursementDetail.settlements.length > 0 ? (
            <div className={theme.tableScroll}>
              <table className={theme.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Note</th>
                    <th className={theme.num}>Amount</th>
                    <th className={theme.num}>Remaining after</th>
                  </tr>
                </thead>
                <tbody>
                  {reimbursementDetail.settlements.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                      <td>{s.settlement_type === 'cash' ? 'Reimbursed (cash)' : 'Adjusted against bill'}</td>
                      <td>{s.note ?? '—'}</td>
                      <td className={theme.num}>{formatCurrency(s.amount)}</td>
                      <td className={theme.num}>{formatCurrency(s.runningRemaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={theme.muted}>No settlements yet — see the Reimbursements tab on Expenses.</p>
          )}
        </div>
      )}

      <div className={theme.card}>
        <h2 className={homeStyles.sectionTitle}>Actions</h2>
        {expense.voided_at ? (
          <p className={theme.muted}>This expense has been reversed — no further action available.</p>
        ) : referenced ? (
          <form action={reverseExpenseAction.bind(null, expense.id)} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
              <label className={theme.label} htmlFor="void_reason">
                Reason for reversing
              </label>
              <input id="void_reason" name="void_reason" className={theme.input} placeholder="e.g. recorded in error, duplicate of another entry" required />
            </div>
            <button type="submit" className={theme.buttonDanger}>
              Reverse this expense
            </button>
          </form>
        ) : (
          <form>
            <ConfirmSubmitButton
              formAction={deleteExpenseAction.bind(null, expense.id)}
              confirmMessage={`Delete "${expense.description}" (${formatCurrency(expense.amount)})? This can't be undone.`}
              className={theme.buttonDanger}
              title="Delete this expense"
            >
              Delete expense
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
    </>
  )
}
