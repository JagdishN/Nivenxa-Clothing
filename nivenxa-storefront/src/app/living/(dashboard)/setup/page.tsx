import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { parseFlatTemplate } from '@/lib/living/apartments'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getFlats, getPendingClaims } from '@/lib/living/queries'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'

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

async function updateFlatsAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin'])
  const flats = await getFlats(supabase, apartment.id)

  for (const flat of flats) {
    const flatNo = String(formData.get(`flat_no_${flat.id}`) ?? '').trim()
    const ownerName = String(formData.get(`owner_name_${flat.id}`) ?? '').trim()
    const ownerContact = String(formData.get(`owner_contact_${flat.id}`) ?? '').trim()
    const sqFtRaw = formData.get(`sq_ft_${flat.id}`)
    const shareOverrideRaw = formData.get(`share_override_${flat.id}`)
    const excludedFromBilling = formData.get(`excluded_${flat.id}`) === 'on'
    const mergeInto = String(formData.get(`merge_into_${flat.id}`) ?? '').trim()

    const { error } = await supabase
      .from('living_flats')
      .update({
        flat_no: flatNo || flat.flat_no,
        owner_name: ownerName || null,
        owner_contact: ownerContact || null,
        sq_ft: sqFtRaw === null || sqFtRaw === '' ? null : Number(sqFtRaw),
        share_override: shareOverrideRaw === null || shareOverrideRaw === '' ? null : Number(shareOverrideRaw),
        excluded_from_billing: excludedFromBilling,
        merged_into_flat_id: mergeInto || null,
      })
      .eq('id', flat.id)
    if (error) {
      await setLivingError(`Flat ${flat.flat_no}: ${error.message}`)
      redirect('/living/setup')
    }
  }
  await setLivingNotice('Flats updated.')
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
                <div className={theme.card}>
                  <form action={updateFlatsAction}>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Flat</th>
                            <th>Owner</th>
                            <th>Contact</th>
                            <th className={theme.num}>sq ft</th>
                            <th className={theme.num}>Share override</th>
                            <th>Shared/common meter</th>
                            <th>Merge water into</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flats.map((flat) => (
                            <tr key={flat.id}>
                              <td>
                                <input name={`flat_no_${flat.id}`} className={theme.input} defaultValue={flat.flat_no} />
                              </td>
                              <td>
                                <input name={`owner_name_${flat.id}`} className={theme.input} defaultValue={flat.owner_name ?? ''} />
                              </td>
                              <td>
                                <input name={`owner_contact_${flat.id}`} className={theme.input} defaultValue={flat.owner_contact ?? ''} />
                              </td>
                              <td>
                                <input name={`sq_ft_${flat.id}`} className={theme.input} type="number" step="0.01" defaultValue={flat.sq_ft ?? ''} />
                              </td>
                              <td>
                                <input
                                  name={`share_override_${flat.id}`}
                                  className={theme.input}
                                  type="number"
                                  step="0.01"
                                  defaultValue={flat.share_override ?? ''}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" name={`excluded_${flat.id}`} defaultChecked={flat.excluded_from_billing} />
                              </td>
                              <td>
                                <select name={`merge_into_${flat.id}`} className={theme.select} defaultValue={flat.merged_into_flat_id ?? ''}>
                                  <option value="">— none —</option>
                                  {flats
                                    .filter((other) => other.id !== flat.id)
                                    .map((other) => (
                                      <option key={other.id} value={other.id}>
                                        {other.flat_no}
                                      </option>
                                    ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                          {flats.length === 0 && (
                            <tr>
                              <td colSpan={7} className={theme.muted}>
                                No flats yet — add them in the Add Flats tab.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {flats.length > 0 && (
                      <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
                        Save changes
                      </button>
                    )}
                  </form>
                  <p className={theme.muted} style={{ marginTop: '0.75rem' }}>
                    Share override only matters when this Apartment&rsquo;s maintenance split is set to weighted, and only if you
                    don&rsquo;t want to rely on sq ft for that flat. &ldquo;Shared/common meter&rdquo; is for a row that isn&rsquo;t a
                    real resident (e.g. a building-wide common meter) — it never gets a personal bill, and its own water charge
                    auto-fills the Common Water Bill line item on Maintenance instead. &ldquo;Merge water into&rdquo; is for a flat
                    with a second meter, same owner as another unit — its water charge adds into the flat you pick, and it drops off
                    the Bills page on its own.
                  </p>
                </div>
              </>
            ),
          },
          {
            id: 'add',
            label: 'Add Flats',
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
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
                  <form action={addFlatAction}>
                    <div className={theme.field}>
                      <label className={theme.label} htmlFor="flat_no">
                        Flat number
                      </label>
                      <input id="flat_no" name="flat_no" className={theme.input} required />
                    </div>
                    <div className={theme.field}>
                      <label className={theme.label} htmlFor="owner_name">
                        Owner name
                      </label>
                      <input id="owner_name" name="owner_name" className={theme.input} />
                    </div>
                    <div className={theme.field}>
                      <label className={theme.label} htmlFor="owner_contact">
                        Owner contact (email or phone)
                      </label>
                      <input id="owner_contact" name="owner_contact" className={theme.input} />
                    </div>
                    <button type="submit" className={theme.button}>
                      Add flat
                    </button>
                  </form>
                </div>
              </>
            ),
          },
          {
            id: 'split',
            label: 'Common Split',
            content: (
              <div className={theme.card}>
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
            ),
          },
          {
            id: 'requests',
            label: 'Requests',
            badge: claims.length,
            content: (
              <div className={homeStyles.rowList}>
                {claims.map((claim) => (
                  <div key={claim.id} className={homeStyles.row}>
                    <span>Flat {claim.flat.flat_no}</span>
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
