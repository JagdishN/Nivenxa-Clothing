import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency } from '@/lib/living/format'
import type { PendingItem } from '@/lib/living/types'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'

async function addPendingItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const description = String(formData.get('description') ?? '').trim()
  const amount = Number(formData.get('amount') ?? 0) || 0
  const reason = String(formData.get('reason') ?? '').trim()
  const raisedAt = String(formData.get('raised_at') ?? '').trim()

  if (!description) {
    await setLivingError('Describe the work or cost.')
    redirect('/living/pending-works')
  }

  const { error } = await supabase.from('living_pending_items').insert({
    apartment_id: apartment.id,
    description,
    amount,
    reason: reason || null,
    raised_at: raisedAt || new Date().toISOString().slice(0, 10),
    created_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/pending-works')
  }
  await setLivingNotice('Added.')
  redirect('/living/pending-works')
}

async function resolvePendingItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const id = String(formData.get('id') ?? '')
  const { error } = await supabase
    .from('living_pending_items')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/pending-works')
  }
  await setLivingNotice('Marked resolved.')
  redirect('/living/pending-works')
}

async function reopenPendingItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const id = String(formData.get('id') ?? '')
  const { error } = await supabase
    .from('living_pending_items')
    .update({ status: 'pending', resolved_at: null })
    .eq('id', id)
    .eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/pending-works')
  }
  await setLivingNotice('Reopened.')
  redirect('/living/pending-works')
}

async function deletePendingItemAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_pending_items').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/pending-works')
  }
  await setLivingNotice('Removed.')
  redirect('/living/pending-works')
}

export default async function LivingPendingWorksPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { data } = await supabase
    .from('living_pending_items')
    .select('*')
    .eq('apartment_id', apartment.id)
    .order('raised_at', { ascending: false })
  const items = (data ?? []) as PendingItem[]

  const pending = items.filter((i) => i.status === 'pending')
  const resolved = items.filter((i) => i.status === 'resolved')
  const totalPending = pending.reduce((sum, i) => sum + i.amount, 0)

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Pending Works
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Work or costs identified but not yet added to any published maintenance cycle — so they don&rsquo;t silently get forgotten.
      </p>

      <div className={homeStyles.grid} style={{ marginBottom: '1.5rem' }}>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Pending items</div>
          <div className={homeStyles.statValue}>{pending.length}</div>
        </div>
        <div className={theme.card}>
          <div className={homeStyles.statLabel}>Pending amount</div>
          <div className={`${homeStyles.statValue} ${totalPending > 0 ? theme.warnText : ''}`}>{formatCurrency(totalPending)}</div>
          <div className={homeStyles.statSub}>Not included in this cycle&rsquo;s maintenance total</div>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: 'pending',
            label: 'Pending',
            badge: pending.length,
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={homeStyles.sectionTitle}>Add a pending item</h2>
                  <form action={addPendingItemAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '12rem' }}>
                      <label className={theme.label} htmlFor="description">
                        Description
                      </label>
                      <input id="description" name="description" className={theme.input} placeholder="e.g. Terrace waterproofing" required />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="amount">
                        Estimated amount
                      </label>
                      <input id="amount" name="amount" type="number" step="0.01" min="0" className={theme.input} />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="raised_at">
                        Date
                      </label>
                      <input id="raised_at" name="raised_at" type="date" className={theme.input} defaultValue={new Date().toISOString().slice(0, 10)} />
                    </div>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '12rem' }}>
                      <label className={theme.label} htmlFor="reason">
                        Why it&rsquo;s not in this cycle
                      </label>
                      <input id="reason" name="reason" className={theme.input} placeholder="e.g. Waiting on quotes" />
                    </div>
                    <button type="submit" className={theme.button}>
                      <MaterialIcon name="add" size={16} style={{ marginRight: "0.3rem" }} />Add
                    </button>
                  </form>
                </div>

                <div className={theme.card}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th className={theme.num}>Amount</th>
                          <th>Reason</th>
                          <th>Raised</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((item) => (
                          <tr key={item.id}>
                            <td>{item.description}</td>
                            <td className={theme.num}>
                              <span className={item.amount > 0 ? theme.warnText : undefined}>{formatCurrency(item.amount)}</span>
                            </td>
                            <td>{item.reason ?? '—'}</td>
                            <td>{new Date(item.raised_at).toLocaleDateString('en-IN')}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <form action={resolvePendingItemAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <button type="submit" className={theme.buttonGhost}>
                                    Mark resolved
                                  </button>
                                </form>
                                <ConfirmSubmitButton
                                  formAction={deletePendingItemAction.bind(null, item.id)}
                                  confirmMessage="Delete this pending item?"
                                  className={theme.iconButtonDanger}
                                  title="Delete"
                                >
                                  <MaterialIcon name="delete" size={18} />
                                </ConfirmSubmitButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pending.length === 0 && (
                          <tr>
                            <td colSpan={5} className={theme.muted}>
                              Nothing pending.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ),
          },
          {
            id: 'resolved',
            label: 'Resolved',
            badge: resolved.length,
            content: (
              <div className={theme.card}>
                <div className={theme.tableScroll}>
                  <table className={theme.table}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className={theme.num}>Amount</th>
                        <th>Resolved</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolved.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td className={theme.num}>{formatCurrency(item.amount)}</td>
                          <td>{item.resolved_at ? new Date(item.resolved_at).toLocaleDateString('en-IN') : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <form action={reopenPendingItemAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <button type="submit" className={theme.buttonGhost}>
                                  Reopen
                                </button>
                              </form>
                              <ConfirmSubmitButton
                                formAction={deletePendingItemAction.bind(null, item.id)}
                                confirmMessage="Delete this pending item?"
                                className={theme.iconButtonDanger}
                                title="Delete"
                              >
                                <MaterialIcon name="delete" size={18} />
                              </ConfirmSubmitButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {resolved.length === 0 && (
                        <tr>
                          <td colSpan={4} className={theme.muted}>
                            Nothing resolved yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
