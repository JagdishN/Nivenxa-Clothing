import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatCurrency, formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import theme from '../../../LivingTheme.module.scss'
import homeStyles from '../../Home.module.scss'

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
  if (error) redirect('/living/app/settings/tankers?tab=private&error=' + encodeURIComponent(error.message))
  redirect('/living/app/settings/tankers?tab=private&notice=' + encodeURIComponent('Saved — applies from ' + effectiveFrom + ' onward.'))
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
  if (error) redirect('/living/app/settings/tankers?tab=govt&error=' + encodeURIComponent(error.message))
  redirect('/living/app/settings/tankers?tab=govt&notice=' + encodeURIComponent('Saved — applies from ' + effectiveFrom + ' onward.'))
}

async function deleteRateAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const { error } = await supabase.from('living_tanker_rates').delete().eq('id', String(formData.get('id'))).eq('apartment_id', apartment.id)
  if (error) redirect('/living/app/settings/tankers?tab=history&error=' + encodeURIComponent(error.message))
  redirect('/living/app/settings/tankers?tab=history&notice=' + encodeURIComponent('Removed.'))
}

export default async function LivingTankerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; notice?: string; error?: string }>
}) {
  const { tab, notice, error } = await searchParams
  const activeTab = tab === 'govt' ? 'govt' : tab === 'history' ? 'history' : 'private'
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
      {notice && <div className={theme.alertInfo}>{notice}</div>}
      {error && <div className={theme.alert}>{error}</div>}

      <div className={theme.tabRow}>
        <Link href="/living/app/settings/tankers?tab=private" className={activeTab === 'private' ? theme.tabActive : theme.tab}>
          Private Tankers
        </Link>
        <Link href="/living/app/settings/tankers?tab=govt" className={activeTab === 'govt' ? theme.tabActive : theme.tab}>
          Government Tankers
        </Link>
        <Link href="/living/app/settings/tankers?tab=history" className={activeTab === 'history' ? theme.tabActive : theme.tab}>
          History
        </Link>
      </div>

      {activeTab === 'private' && (
        <div className={theme.card}>
          <form action={savePrivateRatesAction}>
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
              <label className={theme.label} htmlFor="rate_small_5000l">
                Small (5,000L)
              </label>
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
            <div className={theme.field}>
              <label className={theme.label} htmlFor="rate_large_10000l">
                Large (10,000L)
              </label>
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
            <div className={theme.field}>
              <label className={theme.label} htmlFor="rate_xlarge_25000l">
                Extra-large (25,000L)
              </label>
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
            <button type="submit" className={theme.button}>
              Save
            </button>
          </form>
        </div>
      )}

      {activeTab === 'govt' && (
        <div className={theme.card}>
          <form action={saveGovtRatesAction}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="effective_from_govt">
                Effective from
              </label>
              <input id="effective_from_govt" name="effective_from" type="date" className={theme.input} defaultValue={month} required />
              <p className={theme.muted} style={{ marginTop: '0.3rem' }}>
                Past bills are never rewritten by this change.
              </p>
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="rate_govt_small_5000l">
                Small (5,000L)
              </label>
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
            <div className={theme.field}>
              <label className={theme.label} htmlFor="rate_govt_large_10000l">
                Large (10,000L)
              </label>
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
            <button type="submit" className={theme.button}>
              Save
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className={theme.card}>
          <h2 className={homeStyles.sectionTitle}>History — private &amp; government</h2>
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
                        <form action={deleteRateAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className={theme.buttonGhost}>
                            Delete
                          </button>
                        </form>
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
      )}
    </>
  )
}
