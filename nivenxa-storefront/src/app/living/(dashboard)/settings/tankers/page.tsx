import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import ConfirmSubmitButton from '../../ConfirmSubmitButton'
import MaterialIcon from '../../../MaterialIcon'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'
import Tabs from '../../Tabs'
import styles from './Tankers.module.scss'

/** Fetches the row for `effectiveFrom` if one already exists, so a save from one tab never blanks the other tab's fields. */
async function getExistingRate(supabase: Awaited<ReturnType<typeof requireMembership>>['supabase'], apartmentId: string, effectiveFrom: string) {
  const { data } = await supabase
    .from('living_tanker_rates')
    .select('*')
    .eq('apartment_id', apartmentId)
    .eq('effective_from', effectiveFrom)
    .maybeSingle()
  return data
}

async function savePrivateRatesAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const effectiveFrom = String(formData.get('effective_from'))
  const existing = await getExistingRate(supabase, apartment.id, effectiveFrom)

  const { error } = await supabase.from('living_tanker_rates').upsert(
    {
      apartment_id: apartment.id,
      effective_from: effectiveFrom,
      rate_small_5000l: Number(formData.get('rate_small_5000l') ?? 0),
      rate_large_10000l: Number(formData.get('rate_large_10000l') ?? 0),
      rate_xlarge_25000l: Number(formData.get('rate_xlarge_25000l') ?? 0),
      rate_govt_small_5000l: existing?.rate_govt_small_5000l ?? 0,
      rate_govt_large_10000l: existing?.rate_govt_large_10000l ?? 0,
    },
    { onConflict: 'apartment_id,effective_from' }
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/settings/tankers')
  }
  await setLivingNotice('Saved — applies from ' + effectiveFrom + ' onward.')
  redirect('/living/settings/tankers')
}

async function saveGovtRatesAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const effectiveFrom = String(formData.get('effective_from'))
  const existing = await getExistingRate(supabase, apartment.id, effectiveFrom)

  const { error } = await supabase.from('living_tanker_rates').upsert(
    {
      apartment_id: apartment.id,
      effective_from: effectiveFrom,
      rate_small_5000l: existing?.rate_small_5000l ?? 0,
      rate_large_10000l: existing?.rate_large_10000l ?? 0,
      rate_xlarge_25000l: existing?.rate_xlarge_25000l ?? 0,
      rate_govt_small_5000l: Number(formData.get('rate_govt_small_5000l') ?? 0),
      rate_govt_large_10000l: Number(formData.get('rate_govt_large_10000l') ?? 0),
    },
    { onConflict: 'apartment_id,effective_from' }
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/settings/tankers')
  }
  await setLivingNotice('Saved — applies from ' + effectiveFrom + ' onward.')
  redirect('/living/settings/tankers')
}

async function deleteRateAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const { error } = await supabase.from('living_tanker_rates').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/settings/tankers')
  }
  await setLivingNotice('Removed.')
  redirect('/living/settings/tankers')
}

export default async function LivingTankerSettingsPage() {
  const { supabase, apartment } = await requireMembership(['admin'])
  const month = monthKeyFor(new Date())

  const { data: rates } = await supabase
    .from('living_tanker_rates')
    .select('*')
    .eq('apartment_id', apartment.id)
    .order('effective_from', { ascending: false })

  const latest = rates?.[0]

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Tanker rates
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Configured once here — the Water page just asks how many of each, and multiplies automatically. Majeera has no rate; its
        amount is entered directly each month on the Water page.
      </p>

      <Tabs
        tabs={[
          {
            id: 'private',
            label: 'Private Tankers',
            content: (
              <div className={theme.card}>
                <form action={savePrivateRatesAction}>
                  <div className={styles.effectiveField}>
                    <label className={theme.label} htmlFor="effective_from">
                      Effective from
                    </label>
                    <input id="effective_from" name="effective_from" type="date" className={theme.input} defaultValue={month} required />
                    <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
                      Past bills are never rewritten by this change.
                    </p>
                  </div>

                  <h2 className={styles.subheading}>Private tanker rates</h2>
                  <div className={styles.rateGrid}>
                    <div className={styles.rateField}>
                      <label className={styles.rateLabel} htmlFor="rate_small_5000l">
                        <span className={styles.rateName}>Small</span>
                        <span className={styles.rateCapacity}>5,000 L</span>
                      </label>
                      <div className={styles.amountWrap}>
                        <span className={styles.currencySign}>₹</span>
                        <input
                          id="rate_small_5000l"
                          name="rate_small_5000l"
                          type="number"
                          step="0.01"
                          className={theme.input}
                          defaultValue={latest?.rate_small_5000l ?? 0}
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.rateField}>
                      <label className={styles.rateLabel} htmlFor="rate_large_10000l">
                        <span className={styles.rateName}>Large</span>
                        <span className={styles.rateCapacity}>10,000 L</span>
                      </label>
                      <div className={styles.amountWrap}>
                        <span className={styles.currencySign}>₹</span>
                        <input
                          id="rate_large_10000l"
                          name="rate_large_10000l"
                          type="number"
                          step="0.01"
                          className={theme.input}
                          defaultValue={latest?.rate_large_10000l ?? 0}
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.rateField}>
                      <label className={styles.rateLabel} htmlFor="rate_xlarge_25000l">
                        <span className={styles.rateName}>Extra Large</span>
                        <span className={styles.rateCapacity}>25,000 L</span>
                      </label>
                      <div className={styles.amountWrap}>
                        <span className={styles.currencySign}>₹</span>
                        <input
                          id="rate_xlarge_25000l"
                          name="rate_xlarge_25000l"
                          type="number"
                          step="0.01"
                          className={theme.input}
                          defaultValue={latest?.rate_xlarge_25000l ?? 0}
                          required
                        />
                      </div>
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
            id: 'govt',
            label: 'Government Tankers',
            content: (
              <div className={theme.card}>
                <form action={saveGovtRatesAction}>
                  <div className={styles.effectiveField}>
                    <label className={theme.label} htmlFor="effective_from_govt">
                      Effective from
                    </label>
                    <input id="effective_from_govt" name="effective_from" type="date" className={theme.input} defaultValue={month} required />
                    <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
                      Past bills are never rewritten by this change.
                    </p>
                  </div>

                  <h2 className={styles.subheading}>Government tanker rates</h2>
                  <div className={styles.rateGrid}>
                    <div className={styles.rateField}>
                      <label className={styles.rateLabel} htmlFor="rate_govt_small_5000l">
                        <span className={styles.rateName}>Small</span>
                        <span className={styles.rateCapacity}>5,000 L</span>
                      </label>
                      <div className={styles.amountWrap}>
                        <span className={styles.currencySign}>₹</span>
                        <input
                          id="rate_govt_small_5000l"
                          name="rate_govt_small_5000l"
                          type="number"
                          step="0.01"
                          className={theme.input}
                          defaultValue={latest?.rate_govt_small_5000l ?? 0}
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.rateField}>
                      <label className={styles.rateLabel} htmlFor="rate_govt_large_10000l">
                        <span className={styles.rateName}>Large</span>
                        <span className={styles.rateCapacity}>10,000 L</span>
                      </label>
                      <div className={styles.amountWrap}>
                        <span className={styles.currencySign}>₹</span>
                        <input
                          id="rate_govt_large_10000l"
                          name="rate_govt_large_10000l"
                          type="number"
                          step="0.01"
                          className={theme.input}
                          defaultValue={latest?.rate_govt_large_10000l ?? 0}
                          required
                        />
                      </div>
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
            label: 'Rate History',
            badge: rates?.length ?? 0,
            content: (
              <div className={theme.card}>
                <h2 className={homeStyles.sectionTitle}>Rate History — private &amp; government</h2>
                {rates && rates.length > 0 ? (
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Effective from</th>
                          <th className={theme.num}>Private small</th>
                          <th className={theme.num}>Private large</th>
                          <th className={theme.num}>Private x-large</th>
                          <th className={theme.num}>Govt small</th>
                          <th className={theme.num}>Govt large</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rates.map((r) => (
                          <tr key={r.id}>
                            <td>{formatMonthLabel(r.effective_from)}</td>
                            <td className={theme.num}>{formatCurrency(r.rate_small_5000l)}</td>
                            <td className={theme.num}>{formatCurrency(r.rate_large_10000l)}</td>
                            <td className={theme.num}>{formatCurrency(r.rate_xlarge_25000l)}</td>
                            <td className={theme.num}>{formatCurrency(r.rate_govt_small_5000l)}</td>
                            <td className={theme.num}>{formatCurrency(r.rate_govt_large_10000l)}</td>
                            <td>
                              <ConfirmSubmitButton
                                formAction={deleteRateAction.bind(null, r.id)}
                                confirmMessage={`Delete the rate effective ${formatMonthLabel(r.effective_from)}? Past bills already using it are unaffected.`}
                                className={theme.iconButtonDanger}
                                title="Delete rate"
                              >
                                <MaterialIcon name="delete" size={18} />
                              </ConfirmSubmitButton>
                            </td>
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
