import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import type { ServiceProvider } from '@/lib/living/types'
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
    redirect('/living/service-providers')
  }
  if (!phone) {
    await setLivingError('Add a phone number.')
    redirect('/living/service-providers')
  }
  if (!serviceType) {
    await setLivingError('What service do they provide?')
    redirect('/living/service-providers')
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
    redirect('/living/service-providers')
  }
  await setLivingNotice('Added.')
  redirect('/living/service-providers')
}

async function deleteProviderAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const id = String(formData.get('id') ?? '')
  const { error } = await supabase.from('living_service_providers').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/service-providers')
  }
  await setLivingNotice('Removed.')
  redirect('/living/service-providers')
}

export default async function LivingServiceProvidersPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { data } = await supabase
    .from('living_service_providers')
    .select('*')
    .eq('apartment_id', apartment.id)
    .order('service_type')
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
                          <td>{p.name}</td>
                          <td>{p.service_type}</td>
                          <td>
                            <a href={`tel:${p.phone}`}>{p.phone}</a>
                          </td>
                          <td>{p.notes ?? '—'}</td>
                          <td>
                            <form action={deleteProviderAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <button type="submit" className={theme.buttonGhost}>
                                Delete
                              </button>
                            </form>
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
                    <input id="service_type" name="service_type" className={theme.input} placeholder="Plumbing" required />
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
              </div>
            ),
          },
        ]}
      />
    </>
  )
}
