import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { parseFlatTemplate } from '@/lib/living/apartments'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getFlats, getPendingClaims } from '@/lib/living/queries'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'
import FlatRow from './FlatRow'
import styles from './Setup.module.scss'

// The platform's absolute ceiling on Apartment.flat_count itself (validated
// when that field is set/edited) — NOT the number used for the "X / Y" cap
// on adding flats day-to-day. That's apartment.flat_count, the Admin's own
// configured building size, set at signup and editable below.
const PLATFORM_MAX_FLATS = 30

async function uploadFlatsAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    await setLivingError('Choose a file first.')
    redirect('/living/setup')
  }

  const { rows, errors } = await parseFlatTemplate(await file.arrayBuffer())
  if (rows.length === 0) {
    await setLivingError(errors[0] ?? 'No flats found in that file.')
    redirect('/living/setup')
  }

  const existing = await getFlats(supabase, apartment.id)
  if (existing.length + rows.length > apartment.flat_count) {
    await setLivingError(
      `That would bring this Apartment to ${existing.length + rows.length} flats — it's configured for ${apartment.flat_count}. Update the flat count below if that's wrong.`
    )
    redirect('/living/setup')
  }

  const { error } = await supabase.from('living_flats').insert(
    rows.map((row) => ({
      apartment_id: apartment.id,
      flat_no: row.flat_no,
      owner_name: row.owner_name,
      owner_contact: row.owner_contact,
    }))
  )
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }

  await setLivingNotice(errors.length > 0 ? `Added ${rows.length} flats. ${errors.length} row(s) skipped — see below.` : `Added ${rows.length} flats.`)
  redirect('/living/setup')
}

async function addFlatAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const existing = await getFlats(supabase, apartment.id)
  if (existing.length >= apartment.flat_count) {
    await setLivingError(`This Apartment is already at its configured ${apartment.flat_count}-flat count — update it below if that's wrong.`)
    redirect('/living/setup')
  }

  const { error } = await supabase.from('living_flats').insert({
    apartment_id: apartment.id,
    flat_no: String(formData.get('flat_no') ?? '').trim(),
    owner_name: String(formData.get('owner_name') ?? '').trim() || null,
    owner_contact: String(formData.get('owner_contact') ?? '').trim() || null,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Flat added.')
  redirect('/living/setup')
}

/** Edits exactly one flat — the pencil-icon row edit on the Flats table, not a bulk save. */
async function updateSingleFlatAction(flatId: string, formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])

  const flatNo = String(formData.get('flat_no') ?? '').trim()
  if (!flatNo) {
    await setLivingError('Flat number is required.')
    redirect('/living/setup')
  }
  const ownerName = String(formData.get('owner_name') ?? '').trim()
  const ownerContact = String(formData.get('owner_contact') ?? '').trim()
  const sqFtRaw = formData.get('sq_ft')
  const shareOverrideRaw = formData.get('share_override')
  const excludedFromBilling = formData.get('excluded') === 'on'
  const mergeInto = String(formData.get('merge_into') ?? '').trim()

  const { error } = await supabase
    .from('living_flats')
    .update({
      flat_no: flatNo,
      owner_name: ownerName || null,
      owner_contact: ownerContact || null,
      sq_ft: sqFtRaw === null || sqFtRaw === '' ? null : Number(sqFtRaw),
      share_override: shareOverrideRaw === null || shareOverrideRaw === '' ? null : Number(shareOverrideRaw),
      excluded_from_billing: excludedFromBilling,
      merged_into_flat_id: mergeInto || null,
    })
    .eq('id', flatId)
    .eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Flat updated.')
  redirect('/living/setup')
}

async function updateFlatCountAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const flatCount = Number(formData.get('flat_count') ?? 0)
  if (flatCount < 1 || flatCount > PLATFORM_MAX_FLATS) {
    await setLivingError(`Flat count must be between 1 and ${PLATFORM_MAX_FLATS}.`)
    redirect('/living/setup')
  }

  const existing = await getFlats(supabase, apartment.id)
  if (flatCount < existing.length) {
    await setLivingError(`Can't set the flat count below ${existing.length} — that many flats already exist.`)
    redirect('/living/setup')
  }

  const { error } = await supabase.from('living_apartments').update({ flat_count: flatCount }).eq('id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Flat count updated.')
  redirect('/living/setup')
}

async function updateSharedCostDivisorAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const raw = String(formData.get('shared_cost_divisor') ?? '').trim()
  const divisor = raw === '' ? null : Number(raw)
  if (divisor !== null && (!Number.isFinite(divisor) || divisor <= 0)) {
    await setLivingError('Divisor must be a positive number, or left blank to use the actual flat count.')
    redirect('/living/setup')
  }

  const { error } = await supabase.from('living_apartments').update({ shared_cost_divisor: divisor }).eq('id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Split divisor updated.')
  redirect('/living/setup')
}

async function updateOpeningCashBalanceAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const raw = String(formData.get('opening_cash_balance') ?? '').trim()
  const balance = raw === '' ? null : Number(raw)
  if (balance !== null && !Number.isFinite(balance)) {
    await setLivingError('Opening balance must be a number, or left blank to treat it as zero.')
    redirect('/living/setup')
  }

  const { error } = await supabase.from('living_apartments').update({ opening_cash_balance: balance }).eq('id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Opening balance updated.')
  redirect('/living/setup')
}

async function approveClaimAction(formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['admin'])
  const { error } = await supabase.rpc('living_approve_claim', { p_claim_id: String(formData.get('claim_id')) })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Request approved.')
  redirect('/living/setup')
}

async function rejectClaimAction(formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['admin'])
  const { error } = await supabase.rpc('living_reject_claim', { p_claim_id: String(formData.get('claim_id')) })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/setup')
  }
  await setLivingNotice('Request declined.')
  redirect('/living/setup')
}

export default async function LivingSetupPage() {
  const { supabase, apartment } = await requireMembership(['admin'])
  const [flats, claims] = await Promise.all([getFlats(supabase, apartment.id), getPendingClaims(supabase, apartment.id)])

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        Apartment setup
      </h1>

      <Tabs
        tabs={[
          {
            id: 'flats',
            label: 'Flats',
            content: (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h2 className={homeStyles.sectionTitle} style={{ margin: 0 }}>
                    Flats ({flats.length} / {apartment.flat_count})
                  </h2>
                  <form action={updateFlatCountAction} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label htmlFor="flat_count" className={theme.muted} style={{ fontSize: '0.85rem' }}>
                      Configured flat count
                    </label>
                    <input
                      id="flat_count"
                      name="flat_count"
                      type="number"
                      min={1}
                      max={PLATFORM_MAX_FLATS}
                      className={theme.input}
                      style={{ width: '5rem' }}
                      defaultValue={apartment.flat_count}
                    />
                    <button type="submit" className={theme.buttonGhost}>
                      Update
                    </button>
                  </form>
                </div>

                {/* An action, not a peer view — a <details> disclosure rather than a tab, opened on demand instead of always taking up its own place in the tab row. */}
                <details className={styles.addFlats}>
                  <summary className={`${theme.button} ${styles.addFlatsSummary}`}>
                    <MaterialIcon name="add" size={16} style={{ marginRight: '0.3rem' }} />
                    Add Flats
                  </summary>
                  <div className={styles.addFlatsPanel}>
                    <div className={theme.card}>
                      <h2 className={homeStyles.sectionTitle}>Bulk upload</h2>
                      <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                        Upload an .xlsx file with columns <code>flat_no</code>, <code>owner_name</code>, <code>owner_contact</code>.
                      </p>
                      <form action={uploadFlatsAction}>
                        <div className={theme.field}>
                          <input type="file" name="file" accept=".xlsx" required />
                        </div>
                        <button type="submit" className={theme.button}>
                          Upload
                        </button>
                      </form>
                    </div>

                    <div className={theme.card}>
                      <h2 className={homeStyles.sectionTitle}>Add a flat manually</h2>
                      <form action={addFlatAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className={theme.field} style={{ marginBottom: 0 }}>
                          <label className={theme.label} htmlFor="flat_no">
                            Flat number
                          </label>
                          <input id="flat_no" name="flat_no" className={theme.input} required />
                        </div>
                        <div className={theme.field} style={{ marginBottom: 0 }}>
                          <label className={theme.label} htmlFor="owner_name">
                            Owner name
                          </label>
                          <input id="owner_name" name="owner_name" className={theme.input} />
                        </div>
                        <div className={theme.field} style={{ marginBottom: 0 }}>
                          <label className={theme.label} htmlFor="owner_contact">
                            Owner contact (email or phone)
                          </label>
                          <input id="owner_contact" name="owner_contact" className={theme.input} />
                        </div>
                        <button type="submit" className={theme.button}>
                          <MaterialIcon name="add" size={16} style={{ marginRight: "0.3rem" }} />Add flat
                        </button>
                      </form>
                    </div>
                  </div>
                </details>

                <div className={theme.card}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Flat</th>
                          <th>Owner</th>
                          <th>Contact</th>
                          <th className={theme.num}>sq ft</th>
                          <th className={theme.num}>Split override</th>
                          <th>Water meter</th>
                          <th>Merged into</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {flats.map((flat) => (
                          <FlatRow
                            key={flat.id}
                            flat={flat}
                            otherFlats={flats.filter((other) => other.id !== flat.id)}
                            apartmentName={apartment.name}
                            joinCode={apartment.join_code}
                            action={updateSingleFlatAction.bind(null, flat.id)}
                          />
                        ))}
                        {flats.length === 0 && (
                          <tr>
                            <td colSpan={8} className={theme.muted}>
                              No flats yet — use Add Flats above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className={theme.muted} style={{ marginTop: '0.75rem' }}>
                    Click the pencil to edit a flat. Split override only matters when this Apartment&rsquo;s maintenance split is set
                    to weighted, and only if you don&rsquo;t want to rely on sq ft for that flat. &ldquo;Water meter: Shared/common&rdquo;
                    is for a row that isn&rsquo;t a real resident (e.g. a building-wide common meter) — it never gets a personal bill,
                    and its own water charge auto-fills the Common Water Bill line item on Maintenance instead. &ldquo;Merged
                    into&rdquo; is for a flat with a second meter, same owner as another unit — its water charge adds into the flat
                    you pick, and it drops off the Bills page on its own.
                  </p>
                </div>
              </>
            ),
          },
          {
            id: 'split',
            label: 'Common Split',
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Equal-split common maintenance and the shared water-supply pool (tankers/Majeera) both divide by the actual number
                    of flats by default. Override that here if it shouldn&rsquo;t be — e.g. a flat with two water meters is still one
                    billable unit, or not every row above is really a separate one.
                  </p>
                  <form action={updateSharedCostDivisorAction} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="shared_cost_divisor">
                        Divisor
                      </label>
                      <input
                        id="shared_cost_divisor"
                        name="shared_cost_divisor"
                        type="number"
                        min={1}
                        className={theme.input}
                        style={{ width: '6rem' }}
                        defaultValue={apartment.shared_cost_divisor ?? ''}
                        placeholder={String(flats.length)}
                      />
                    </div>
                    <button type="submit" className={theme.buttonGhost}>
                      Update
                    </button>
                  </form>
                  <p className={theme.muted} style={{ marginTop: '0.5rem' }}>
                    Currently dividing by {apartment.shared_cost_divisor ?? flats.length}
                    {apartment.shared_cost_divisor ? ' (override)' : ` (actual flat count — leave blank to keep this automatic)`}. Leave
                    blank to go back to automatic. When overridden, per-flat shares won&rsquo;t necessarily add back up to the grand
                    total — that&rsquo;s expected.
                  </p>
                </div>

                <div className={theme.card}>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    The association&rsquo;s real cash balance before Living started tracking it — a one-time seed for{' '}
                    <Link href="/living/statements">Financial Statements</Link>&rsquo; running Opening/Closing Balance. Leave blank to
                    start from zero.
                  </p>
                  <form action={updateOpeningCashBalanceAction} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <div className={theme.field} style={{ marginBottom: 0 }}>
                      <label className={theme.label} htmlFor="opening_cash_balance">
                        Opening cash balance
                      </label>
                      <input
                        id="opening_cash_balance"
                        name="opening_cash_balance"
                        type="number"
                        step="0.01"
                        className={theme.input}
                        style={{ width: '10rem' }}
                        defaultValue={apartment.opening_cash_balance ?? ''}
                        placeholder="0"
                      />
                    </div>
                    <button type="submit" className={theme.buttonGhost}>
                      Update
                    </button>
                  </form>
                </div>
              </>
            ),
          },
          {
            id: 'requests',
            label: 'Join Requests',
            badge: claims.length,
            content: (
              <div className={homeStyles.rowList}>
                {claims.map((claim) => (
                  <div key={claim.id} className={homeStyles.row}>
                    <span>
                      Flat {claim.flat.flat_no}
                      <span className={theme.muted}> — {claim.requester_email ?? claim.requester_phone ?? 'no contact on file'}</span>
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <form action={approveClaimAction}>
                        <input type="hidden" name="claim_id" value={claim.id} />
                        <button type="submit" className={theme.buttonGhost}>
                          Approve
                        </button>
                      </form>
                      <form action={rejectClaimAction}>
                        <input type="hidden" name="claim_id" value={claim.id} />
                        <button type="submit" className={theme.buttonGhost}>
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {claims.length === 0 && <p className={theme.muted}>No pending requests.</p>}
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
