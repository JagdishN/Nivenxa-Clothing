'use client'
import { useState } from 'react'
import { formatCurrency, formatPaymentMethod } from '@/lib/living/format'
import type { PaymentMethod } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cheque', 'other']

function Section({ title, first, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', ...(first ? {} : { borderTop: '1px solid var(--living-rule)', paddingTop: '1rem', marginTop: '1rem' }) }}>
      <p className={theme.label} style={{ marginBottom: '0.75rem' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>{children}</div>
}

/**
 * Reading order follows what an admin actually decides, in order: what happened (description,
 * amount, category, date) → who was involved (Paid From — Living's own accounting logic starts
 * here, so Resident/Flat and the "Association owes..." consequence sit immediately under it, never
 * elsewhere in the layout — plus who it was paid to) → evidence (reference, receipt, notes) → what
 * Living should DO with it (Add to Apartment Billing), which is a separate question from anything
 * above and belongs last. "Add to Apartment Billing?" is independent of Paid From — a resident can
 * fund an expense AND the association can still recover it from every flat's bill; reimbursing the
 * resident for what they personally spent is a separate transaction, settled on Reimbursements.
 */
export default function RecordExpenseForm({
  action,
  flats,
  categoryOptionNames,
  todayIso,
}: {
  action: (formData: FormData) => void
  flats: { id: string; flat_no: string; owner_name: string | null }[]
  categoryOptionNames: string[]
  todayIso: string
}) {
  const [paidBy, setPaidBy] = useState<'association' | 'resident'>('association')
  const [residentFlatId, setResidentFlatId] = useState('')
  const [amount, setAmount] = useState('')
  const [addToBilling, setAddToBilling] = useState<'no' | 'yes'>('no')
  const [billingMethod, setBillingMethod] = useState<'next_cycle' | 'spread'>('next_cycle')

  const selectedFlat = flats.find((f) => f.id === residentFlatId)
  const amountNum = Number(amount)

  return (
    <form action={action} style={{ display: 'flex', flexWrap: 'wrap' }}>
      <Section title="Expense Details" first>
        <Row>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="description">
              Description
            </label>
            <input id="description" name="description" className={theme.input} placeholder="e.g. Diesel for generator" required />
          </div>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="amount">
              Amount
            </label>
            <input id="amount" name="amount" type="number" step="0.01" min="0.01" className={theme.input} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
        </Row>
        <Row>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="category">
              Category
            </label>
            <select id="category" name="category" className={theme.select} defaultValue="">
              <option value="">— none —</option>
              {categoryOptionNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="expense_date">
              Expense Date
            </label>
            <input id="expense_date" name="expense_date" type="date" className={theme.input} defaultValue={todayIso} required />
          </div>
        </Row>
      </Section>

      <Section title="Payment Details">
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label}>Paid From</label>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
              <input type="radio" name="paid_by" value="association" checked={paidBy === 'association'} onChange={() => setPaidBy('association')} /> Association
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
              <input type="radio" name="paid_by" value="resident" checked={paidBy === 'resident'} onChange={() => setPaidBy('resident')} /> Resident
            </label>
          </div>
        </div>

        {paidBy === 'resident' && (
          <div style={{ paddingLeft: '0.25rem', borderLeft: '2px solid var(--living-rule)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div className={theme.field} style={{ marginBottom: 0, maxWidth: '22rem' }}>
              <label className={theme.label} htmlFor="resident_flat_id">
                Resident / Flat
              </label>
              <select
                id="resident_flat_id"
                name="resident_flat_id"
                className={theme.select}
                value={residentFlatId}
                onChange={(e) => setResidentFlatId(e.target.value)}
              >
                <option value="">Select resident or flat</option>
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    Flat {f.flat_no}
                    {f.owner_name ? ` — ${f.owner_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedFlat && amountNum > 0 && (
              <p className={theme.muted} style={{ margin: 0 }}>
                Association owes Flat {selectedFlat.flat_no} {formatCurrency(amountNum)}.<br />
                This will be tracked under Reimbursements.
              </p>
            )}
          </div>
        )}

        <Row>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="paid_to">
              Paid To / Vendor
            </label>
            <input id="paid_to" name="paid_to" className={theme.input} placeholder="e.g. Electricity Department, Local Electrician" />
          </div>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="method">
              Payment Method
            </label>
            <select id="method" name="method" className={theme.select} defaultValue="cash">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {formatPaymentMethod(m)}
                </option>
              ))}
            </select>
          </div>
        </Row>
      </Section>

      <Section title="Supporting Information">
        <Row>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="reference_note">
              Reference (optional)
            </label>
            <input id="reference_note" name="reference_note" className={theme.input} placeholder="Receipt / invoice no." />
          </div>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} htmlFor="receipt">
              Receipt / Bill
            </label>
            <input id="receipt" name="receipt" type="file" className={theme.input} accept="image/*,.pdf" />
          </div>
        </Row>
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label} htmlFor="expense_notes">
            Notes (optional)
          </label>
          <textarea id="expense_notes" name="expense_notes" className={theme.textarea} placeholder="Anything else worth recording about this expense" />
        </div>
      </Section>

      <Section title="Billing">
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label}>Add to Apartment Billing?</label>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
              <input type="radio" name="add_to_billing" value="no" checked={addToBilling === 'no'} onChange={() => setAddToBilling('no')} /> No
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
              <input type="radio" name="add_to_billing" value="yes" checked={addToBilling === 'yes'} onChange={() => setAddToBilling('yes')} /> Yes
            </label>
          </div>
        </div>

        {addToBilling === 'yes' && (
          <div style={{ paddingLeft: '0.25rem', borderLeft: '2px solid var(--living-rule)' }}>
            <label className={theme.label}>Billing</label>
            {/* Checkboxes, but only one is ever really "on" — checking either one unchecks the
                other, same single choice as before, just checkbox-styled instead of radio circles. */}
            <input type="hidden" name="billing_method" value={billingMethod} />
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={billingMethod === 'next_cycle'} onChange={() => setBillingMethod('next_cycle')} />
                Next billing cycle
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={billingMethod === 'spread'} onChange={() => setBillingMethod('spread')} />
                Spread across multiple billing cycles
              </label>
              {billingMethod === 'spread' && (
                <input
                  name="split_months"
                  type="number"
                  min="2"
                  step="1"
                  className={theme.input}
                  style={{ width: '11rem' }}
                  placeholder="Number of billing cycles"
                />
              )}
            </div>
          </div>
        )}
      </Section>

      <div style={{ width: '100%', marginTop: '1.25rem' }}>
        <button type="submit" className={theme.button}>
          Record expense
        </button>
      </div>
    </form>
  )
}
