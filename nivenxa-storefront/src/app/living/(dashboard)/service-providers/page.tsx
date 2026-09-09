import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { getServiceTypes } from '@/lib/living/queries'
import type { ServiceProvider, ServiceType } from '@/lib/living/types'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import theme from '../../LivingTheme.module.scss'
import Tabs from '../Tabs'

async function addProviderAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const serviceType = String(formData.get('service_type') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!name) {
    await setLivingError('Name the provider.')
    return
  }
  if (!phone) {
    await setLivingError('Add a phone number.')
    return
  }
  if (!serviceType) {
    await setLivingError('What service do they provide?')
    return
  }

  const { error } = await supabase.from('living_service_providers').insert({
    apartment_id: apartment.id,
    name,
    phone,
    service_type: serviceType,
    notes: notes || null,
    created_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Added.')
}

/** Shared by the row-level Save icon and the bulk "Save changes" button. */
async function applyProviderUpdate(supabase: SupabaseClient, id: string, formData: FormData) {
  const name = String(formData.get(`name_${id}`) ?? '').trim()
  const phone = String(formData.get(`phone_${id}`) ?? '').trim()
  const serviceType = String(formData.get(`service_type_${id}`) ?? '').trim()
  if (!name || !phone || !serviceType) return { error: null, name: null }
  const { error } = await supabase
    .from('living_service_providers')
    .update({
      name,
      phone,
      service_type: serviceType,
      notes: String(formData.get(`notes_${id}`) ?? '').trim() || null,
    })
    .eq('id', id)
  return { error, name }
}

async function updateProvidersAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { data } = await supabase.from('living_service_providers').select('id').eq('apartment_id', apartment.id)
  const ids = (data ?? []).map((row) => row.id as string)

  for (const id of ids) {
    const { error, name } = await applyProviderUpdate(supabase, id, formData)
    if (error) {
      await setLivingError(`${name}: ${error.message}`)
      return
    }
  }
  await setLivingNotice('Providers updated.')
}

async function updateSingleProviderAction(id: string, formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error, name } = await applyProviderUpdate(supabase, id, formData)
  if (error) {
    await setLivingError(`${name}: ${error.message}`)
    return
  }
  await setLivingNotice('Saved.')
}

async function deleteProviderAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_service_providers').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

async function addServiceTypesAction(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireMembership(['admin', 'treasurer'])
  const raw = String(formData.get('names') ?? '')
  const requested = Array.from(new Set(raw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean)))
  if (requested.length === 0) {
    await setLivingError('Enter at least one service name.')
    return
  }

  const existing = await getServiceTypes(supabase)
  const existingLower = new Set(existing.map((c) => c.name.toLowerCase()))
  const toAdd = requested.filter((n) => !existingLower.has(n.toLowerCase()))

  if (toAdd.length === 0) {
    await setLivingError('Those services already exist.')
    return
  }

  const { error } = await supabase.from('living_service_types').insert(toAdd.map((name) => ({ name, created_by: userId })))
  if (error) {
    await setLivingError(error.message)
    return
  }
  const skipped = requested.length - toAdd.length
  await setLivingNotice(
    skipped > 0 ? `Added ${toAdd.length} service(s) (${skipped} already existed).` : `Added ${toAdd.length} service(s).`
  )
}

async function deleteServiceTypeAction(id: string) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_service_types').delete().eq('id', id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

/** Same "keep the current value even if it's since fallen off the master list" guard as Inventory's category select. */
function serviceOptions(types: ServiceType[], currentValue: string) {
  const names = types.map((t) => t.name)
  const extra = currentValue && !names.includes(currentValue) ? [currentValue] : []
  return [...names, ...extra]
}

export default async function LivingServiceProvidersPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const [{ data }, serviceTypes] = await Promise.all([
    supabase.from('living_service_providers').select('*').eq('apartment_id', apartment.id).order('service_type'),
    getServiceTypes(supabase),
  ])
  const providers = (data ?? []) as ServiceProvider[]

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Service Providers
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Plumbers, electricians, lift AMC, pest control — whoever gets called, and their number, in one place.
      </p>

      <Tabs
        tabs={[
          {
            id: 'providers',
            label: 'Providers',
            badge: providers.length,
            content: (
              <div className={theme.card}>
                <form action={updateProvidersAction}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Service</th>
                          <th>Phone</th>
                          <th>Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {providers.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <input name={`name_${p.id}`} className={theme.input} defaultValue={p.name} />
                            </td>
                            <td>
                              <select name={`service_type_${p.id}`} className={theme.select} defaultValue={p.service_type}>
                                {serviceOptions(serviceTypes, p.service_type).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input name={`phone_${p.id}`} type="tel" className={theme.input} defaultValue={p.phone} />
                            </td>
                            <td>
                              <input name={`notes_${p.id}`} className={theme.input} defaultValue={p.notes ?? ''} />
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  type="submit"
                                  formAction={updateSingleProviderAction.bind(null, p.id)}
                                  className={theme.iconButton}
                                  title="Save this row"
                                >
                                  <IconDeviceFloppy size={20} stroke={1.75} />
                                </button>
                                <ConfirmSubmitButton
                                  formAction={deleteProviderAction.bind(null, p.id)}
                                  confirmMessage={`Delete "${p.name}"? This can't be undone.`}
                                  className={theme.iconButtonDanger}
                                  title="Delete this provider"
                                >
                                  <IconTrash size={20} stroke={1.75} />
                                </ConfirmSubmitButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {providers.length === 0 && (
                          <tr>
                            <td colSpan={5} className={theme.muted}>
                              No providers saved yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {providers.length > 0 && (
                    <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
                      Save all changes
                    </button>
                  )}
                </form>
              </div>
            ),
          },
          {
            id: 'add',
            label: 'Add Provider',
            content: (
              <div className={theme.card}>
                <form action={addProviderAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                    <label className={theme.label} htmlFor="name">
                      Name
                    </label>
                    <input id="name" name="name" className={theme.input} placeholder="e.g. Ramesh" required />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, minWidth: '9rem' }}>
                    <label className={theme.label} htmlFor="phone">
                      Phone
                    </label>
                    <input id="phone" name="phone" type="tel" className={theme.input} placeholder="98765 43210" required />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, minWidth: '9rem' }}>
                    <label className={theme.label} htmlFor="service_type">
                      Service
                    </label>
                    {serviceTypes.length > 0 ? (
                      <select id="service_type" name="service_type" className={theme.select} defaultValue="" required>
                        <option value="" disabled>
                          Choose a service
                        </option>
                        {serviceTypes.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input id="service_type" name="service_type" className={theme.input} placeholder="Plumbing" required />
                    )}
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                    <label className={theme.label} htmlFor="notes">
                      Notes
                    </label>
                    <input id="notes" name="notes" className={theme.input} placeholder="Available weekends, etc." />
                  </div>
                  <button type="submit" className={theme.button}>
                    Add
                  </button>
                </form>
                {serviceTypes.length === 0 && (
                  <p className={theme.muted} style={{ marginTop: '0.75rem' }}>
                    No services set up yet — add some in the Service Types tab and they&rsquo;ll appear here as a dropdown.
                  </p>
                )}
              </div>
            ),
          },
          {
            id: 'service-types',
            label: 'Service Types',
            badge: serviceTypes.length,
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={theme.label} style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Add services
                  </h2>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Master list used by the Service dropdown above — e.g. Plumbing, Electrical, Lift AMC. Shared across every
                    apartment on the platform, so anything added here shows up for everyone. Comma or newline separated, add as many
                    as you like at once.
                  </p>
                  <form action={addServiceTypesAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
                      <label className={theme.label} htmlFor="names">
                        Service names
                      </label>
                      <input id="names" name="names" className={theme.input} placeholder="Plumbing, Electrical, Lift AMC" required />
                    </div>
                    <button type="submit" className={theme.button}>
                      Add
                    </button>
                  </form>
                </div>

                <div className={theme.card}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceTypes.map((t) => (
                          <tr key={t.id}>
                            <td>{t.name}</td>
                            <td>
                              <form>
                                <ConfirmSubmitButton
                                  formAction={deleteServiceTypeAction.bind(null, t.id)}
                                  confirmMessage={`Delete service "${t.name}"?`}
                                  className={theme.iconButtonDanger}
                                  title="Delete service"
                                >
                                  <IconTrash size={20} stroke={1.75} />
                                </ConfirmSubmitButton>
                              </form>
                            </td>
                          </tr>
                        ))}
                        {serviceTypes.length === 0 && (
                          <tr>
                            <td colSpan={2} className={theme.muted}>
                              No services yet.
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
        ]}
      />
    </>
  )
}
