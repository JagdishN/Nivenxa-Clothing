import Link from 'next/link'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatPaymentMethod } from '@/lib/living/format'
import { getAllPaymentsForFlat, getFlats } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'

export default async function LivingMyPaymentsPage() {
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

  const payments = await getAllPaymentsForFlat(supabase, apartment.id, flat.id)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Payments
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Every payment recorded against Flat {flat.flat_no}, most recent first. Payments are entered by your Admin/Treasurer once
        received — this page is a record, not a way to pay online.
      </p>

      <div className={theme.card}>
        <div className={theme.tableScroll}>
          <table className={theme.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th className={theme.num}>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                  <td className={theme.num}>{formatCurrency(p.amount)}</td>
                  <td>{formatPaymentMethod(p.method)}</td>
                  <td>{p.reference_note ?? '—'}</td>
                  <td>
                    <Link href={`/living/payments/receipts/${p.id}`}>{p.receipt_no ?? 'View'}</Link>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className={theme.muted}>
                    No payments recorded yet.
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
