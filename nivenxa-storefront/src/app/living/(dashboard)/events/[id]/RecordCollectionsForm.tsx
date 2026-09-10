'use client'

import { useRef } from 'react'
import { formatPaymentMethod } from '@/lib/living/format'
import type { PaymentMethod } from '@/lib/living/types'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other']

/**
 * Bulk collection entry — every flat gets its own row (amount + method,
 * both freely editable) so recording a whole event's contributions is one
 * submit instead of one form per flat. "Decided Amount" is a JS-only
 * convenience: typing a figure there copies it into every row's amount
 * field (via direct DOM writes, not React state, since these stay plain
 * uncontrolled inputs) — rows are still edited individually afterward for
 * anyone paying a different amount.
 */
export default function RecordCollectionsForm({
  flats,
  action,
  defaultDate,
}: {
  flats: { id: string; flat_no: string }[]
  action: (formData: FormData) => void
  defaultDate: string
}) {
  const tableRef = useRef<HTMLDivElement>(null)

  function applyDecidedAmount(value: string) {
    const table = tableRef.current
    if (!table) return
    table.querySelectorAll<HTMLInputElement>('input[data-row-amount]').forEach((el) => {
      el.value = value
    })
  }

  return (
    <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
      <h2 className={homeStyles.sectionTitle}>Record collections — all flats</h2>
      <form action={action}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="decided_amount">
              Decided amount
            </label>
            <input
              id="decided_amount"
              type="number"
              step="0.01"
              min="0"
              className={theme.input}
              placeholder="Same for every flat"
              onChange={(e) => applyDecidedAmount(e.target.value)}
            />
          </div>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="collected_date">
              Date
            </label>
            <input id="collected_date" name="collected_date" type="date" className={theme.input} defaultValue={defaultDate} required />
          </div>
          <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
            <label className={theme.label} htmlFor="reference_note">
              Reference (optional)
            </label>
            <input id="reference_note" name="reference_note" className={theme.input} placeholder="e.g. Collected at society meeting" />
          </div>
        </div>
        <p className={theme.muted} style={{ marginTop: '0.4rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
          Decided amount fills every row below — edit any row afterward for a flat paying differently.
        </p>

        <div className={theme.tableScroll} ref={tableRef}>
          <table className={theme.table}>
            <thead>
              <tr>
                <th>Flat</th>
                <th className={theme.num}>Amount</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {flats.map((flat) => (
                <tr key={flat.id}>
                  <td>{flat.flat_no}</td>
                  <td>
                    <input
                      name={`amount_${flat.id}`}
                      data-row-amount
                      type="number"
                      step="0.01"
                      min="0"
                      className={theme.input}
                      style={{ width: '7rem' }}
                    />
                  </td>
                  <td>
                    <select name={`method_${flat.id}`} className={theme.select} style={{ width: '9rem' }} defaultValue="cash">
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {formatPaymentMethod(m)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {flats.length === 0 && (
                <tr>
                  <td colSpan={3} className={theme.muted}>
                    No flats yet — add them in Setup first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {flats.length > 0 && (
          <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
            Record collections
          </button>
        )}
      </form>
    </div>
  )
}
