import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatMonthLabel } from '@/lib/living/format'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import type { SlabTier } from '@/lib/living/types'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'
import Tabs from '../../Tabs'
import BillingMethodEditor, { type TierRow } from './BillingMethodEditor'

async function saveSlabAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])

  const { error } = await supabase.from('living_slab_configs').upsert(
    {
      apartment_id: apartment.id,
      effective_from: String(formData.get('effective_from')),
      grace_period_days: Number(formData.get('grace_period_days') ?? 15),
      escalation_cadence: String(formData.get('escalation_cadence') ?? 'monthly'),
      escalation_multiplier: Number(formData.get('escalation_multiplier') ?? 2),
      rise_threshold_percent: Number(formData.get('rise_threshold_percent') ?? 20),
      notify_admin_at_streak: Number(formData.get('notify_admin_at_streak') ?? 3),
    },
    { onConflict: 'apartment_id,effective_from' }
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/settings/slabs')
  }
  await setLivingNotice('Saved — applies from ' + formData.get('effective_from') + ' onward.')
  redirect('/living/settings/slabs')
}

async function saveBillingMethodAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])

  const waterBillingMethod = String(formData.get('water_billing_method') ?? 'standard')
  const slabCalculationMethod = String(formData.get('slab_calculation_method') ?? 'progressive')
  const tierCount = Number(formData.get('tier_count') ?? 0)
  const tiers: SlabTier[] = []
  if (waterBillingMethod === 'slab') {
    for (let i = 0; i < tierCount; i++) {
      const fromRaw = formData.get(`tier_from_${i}`)
      const multiplierRaw = formData.get(`tier_multiplier_${i}`)
      if (fromRaw === null || fromRaw === '' || multiplierRaw === null || multiplierRaw === '') continue
      const toRaw = formData.get(`tier_to_${i}`)
      tiers.push({
        from_liters: Number(fromRaw),
        to_liters: toRaw === null || toRaw === '' ? null : Number(toRaw),
        rate_multiplier: Number(multiplierRaw),
      })
    }
    tiers.sort((a, b) => a.from_liters - b.from_liters)
  }

  const { error } = await supabase.from('living_slab_configs').upsert(
    {
      apartment_id: apartment.id,
      effective_from: String(formData.get('effective_from')),
      water_billing_method: waterBillingMethod,
      slab_calculation_method: slabCalculationMethod,
      slabs: waterBillingMethod === 'slab' ? tiers : null,
    },
    { onConflict: 'apartment_id,effective_from' }
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/settings/slabs')
  }
  await setLivingNotice('Saved — applies from ' + formData.get('effective_from') + ' onward.')
  redirect('/living/settings/slabs')
}

export default async function LivingSlabSettingsPage() {
  const { supabase, apartment } = await requireMembership(['admin'])

  const { data: configs } = await supabase
    .from('living_slab_configs')
    .select('*')
    .eq('apartment_id', apartment.id)
    .order('effective_from', { ascending: false })

  const latest = configs?.[0]

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Water Billing Configuration
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        How water is billed against each flat&rsquo;s own consumption, plus broken-meter fallback escalation and
        sustained-usage-rise alerts. The base rate itself is always live, from actual monthly tanker/Majeera spend — see the{' '}
        <Link href="/living/water">Water</Link> page.
      </p>

      <Tabs
        tabs={[
          {
            id: 'method',
            label: 'Water Billing Configuration',
            content: (
              <BillingMethodEditor
                effectiveFrom={latest?.effective_from ?? new Date().toISOString().slice(0, 10)}
                initialMethod={latest?.water_billing_method ?? 'standard'}
                initialSlabMethod={latest?.slab_calculation_method ?? 'progressive'}
                initialTiers={(latest?.slabs as TierRow[] | null) ?? []}
                save={saveBillingMethodAction}
              />
            ),
          },
          {
            id: 'rates',
            label: 'Meter Exceptions',
            content: (
              <div className={theme.card}>
                <form action={saveSlabAction}>
                  <div className={theme.field}>
                    <label className={theme.label} htmlFor="effective_from">
                      Effective from
                    </label>
                    <input
                      id="effective_from"
                      name="effective_from"
                      type="date"
                      className={theme.input}
                      defaultValue={latest?.effective_from ?? new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </div>

                  <div className={homeStyles.grid} style={{ marginBottom: '1rem' }}>
                    <div>
                      <label className={theme.label} htmlFor="grace_period_days">
                        Broken-meter grace period (days)
                      </label>
                      <input
                        id="grace_period_days"
                        name="grace_period_days"
                        type="number"
                        className={theme.input}
                        defaultValue={latest?.grace_period_days ?? 15}
                      />
                    </div>
                    <div>
                      <label className={theme.label} htmlFor="escalation_cadence">
                        Escalation cadence
                      </label>
                      <select
                        id="escalation_cadence"
                        name="escalation_cadence"
                        className={theme.select}
                        defaultValue={latest?.escalation_cadence ?? 'monthly'}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className={theme.label} htmlFor="escalation_multiplier">
                        Escalation multiplier
                      </label>
                      <input
                        id="escalation_multiplier"
                        name="escalation_multiplier"
                        type="number"
                        step="0.1"
                        className={theme.input}
                        defaultValue={latest?.escalation_multiplier ?? 2}
                      />
                    </div>
                  </div>

                  <div className={homeStyles.grid} style={{ marginBottom: '1.25rem' }}>
                    <div>
                      <label className={theme.label} htmlFor="rise_threshold_percent">
                        Rise threshold (%)
                      </label>
                      <input
                        id="rise_threshold_percent"
                        name="rise_threshold_percent"
                        type="number"
                        className={theme.input}
                        defaultValue={latest?.rise_threshold_percent ?? 20}
                      />
                    </div>
                    <div>
                      <label className={theme.label} htmlFor="notify_admin_at_streak">
                        Notify admin after (consecutive months)
                      </label>
                      <input
                        id="notify_admin_at_streak"
                        name="notify_admin_at_streak"
                        type="number"
                        className={theme.input}
                        defaultValue={latest?.notify_admin_at_streak ?? 3}
                      />
                    </div>
                  </div>

                  <button type="submit" className={theme.button}>
                    Save
                  </button>
                </form>
              </div>
            ),
          },
          {
            id: 'history',
            label: 'History',
            badge: configs?.length ?? 0,
            content: (
              <div className={theme.card}>
                {configs && configs.length > 0 ? (
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Effective from</th>
                          <th>Method</th>
                          <th className={theme.num}>Tiers</th>
                          <th className={theme.num}>Grace (days)</th>
                          <th>Cadence</th>
                          <th className={theme.num}>Multiplier</th>
                          <th className={theme.num}>Rise threshold</th>
                          <th className={theme.num}>Notify after</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configs.map((c) => (
                          <tr key={c.id}>
                            <td>{formatMonthLabel(c.effective_from)}</td>
                            <td>
                              {c.water_billing_method === 'slab'
                                ? `Slab — ${c.slab_calculation_method === 'whole_consumption' ? 'Whole-consumption' : 'Progressive'}`
                                : 'Standard'}
                            </td>
                            <td className={theme.num}>{c.water_billing_method === 'slab' ? (c.slabs?.length ?? 0) : '—'}</td>
                            <td className={theme.num}>{c.grace_period_days}</td>
                            <td>{c.escalation_cadence}</td>
                            <td className={theme.num}>{c.escalation_multiplier}×</td>
                            <td className={theme.num}>{c.rise_threshold_percent}%</td>
                            <td className={theme.num}>{c.notify_admin_at_streak}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={theme.muted}>Nothing configured yet.</p>
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
