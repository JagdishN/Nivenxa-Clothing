import { redirect } from 'next/navigation'
import { daysInMonth, formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { suggestedBaseRatePer1000L } from '@/lib/living/billing'
import { getEffectiveTankerRates, getWaterSupplyCost } from '@/lib/living/queries'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'
import Tabs from '../../Tabs'

async function saveSlabAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])

  const baseRate = Number(formData.get('base_rate_per_1000l') ?? 0)
  const tier1To = Number(formData.get('tier1_to') ?? 5000)
  const tier2To = Number(formData.get('tier2_to') ?? 10000)
  const tier2Mult = Number(formData.get('tier2_mult') ?? 1.2)
  const tier3Mult = Number(formData.get('tier3_mult') ?? 1.5)

  const { error } = await supabase.from('living_slab_configs').upsert(
    {
      apartment_id: apartment.id,
      effective_from: String(formData.get('effective_from')),
      base_rate_per_1000l: baseRate,
      slabs: [
        { from_liters: 0, to_liters: tier1To, rate_multiplier: 1 },
        { from_liters: tier1To, to_liters: tier2To, rate_multiplier: tier2Mult },
        { from_liters: tier2To, to_liters: null, rate_multiplier: tier3Mult },
      ],
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

export default async function LivingSlabSettingsPage() {
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())

  const [{ data: configs }, supplyCost, tankerRates] = await Promise.all([
    supabase.from('living_slab_configs').select('*').eq('apartment_id', apartment.id).order('effective_from', { ascending: false }),
    getWaterSupplyCost(supabase, apartment.id, month),
    getEffectiveTankerRates(supabase, apartment.id, month),
  ])

  const latest = configs?.[0]
  const suggestedRate = supplyCost && tankerRates ? suggestedBaseRatePer1000L(supplyCost, tankerRates, daysInMonth(month)) : null
  const tier1 = latest?.slabs?.[0]
  const tier2 = latest?.slabs?.[1]
  const tier3 = latest?.slabs?.[2]

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        Slab rates &amp; escalation
      </h1>

      <Tabs
        tabs={[
          {
            id: 'rates',
            label: 'Rates',
            content: (
              <div className={theme.card}>
                <form action={saveSlabAction}>
                  <div className={theme.field}>
                    <label className={theme.label} htmlFor="effective_from">
                      Effective from
                    </label>
                    <input id="effective_from" name="effective_from" type="date" className={theme.input} defaultValue={month} required />
                    <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
                      Past bills are never rewritten by this change.
                    </p>
                  </div>

                  <div className={theme.field}>
                    <label className={theme.label} htmlFor="base_rate_per_1000l">
                      Base rate per 1,000L
                    </label>
                    <input
                      id="base_rate_per_1000l"
                      name="base_rate_per_1000l"
                      type="number"
                      step="0.01"
                      className={theme.input}
                      defaultValue={latest?.base_rate_per_1000l ?? suggestedRate ?? 8}
                      required
                    />
                    {suggestedRate !== null && (
                      <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
                        Suggested from this month&rsquo;s tanker/Majeera cost: {formatCurrency(suggestedRate)} per 1,000L — pre-filled
                        above, edit freely.
                      </p>
                    )}
                  </div>

                  <div className={homeStyles.grid} style={{ marginBottom: '1rem' }}>
                    <div>
                      <p className={theme.label}>0 – X litres (base rate)</p>
                      <input name="tier1_to" type="number" className={theme.input} defaultValue={tier1?.to_liters ?? 5000} />
                    </div>
                    <div>
                      <p className={theme.label}>X – Y litres, rate ×</p>
                      <input name="tier2_to" type="number" className={theme.input} defaultValue={tier2?.to_liters ?? 10000} />
                      <input
                        name="tier2_mult"
                        type="number"
                        step="0.01"
                        className={theme.input}
                        style={{ marginTop: '0.4rem' }}
                        defaultValue={tier2?.rate_multiplier ?? 1.2}
                      />
                    </div>
                    <div>
                      <p className={theme.label}>Y+ litres, rate ×</p>
                      <input name="tier3_mult" type="number" step="0.01" className={theme.input} defaultValue={tier3?.rate_multiplier ?? 1.5} />
                    </div>
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
                          <th className={theme.num}>Base rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configs.map((c) => (
                          <tr key={c.id}>
                            <td>{formatMonthLabel(c.effective_from)}</td>
                            <td className={theme.num}>{c.base_rate_per_1000l}</td>
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
