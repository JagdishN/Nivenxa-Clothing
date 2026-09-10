import Link from 'next/link'
import { IconTrash } from '@tabler/icons-react'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency } from '@/lib/living/format'
import { getEventCategories, getEventCollections, getEventExpenses, getEvents, sumEventCollections, sumEventExpenses } from '@/lib/living/queries'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'

async function addEventAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const name = String(formData.get('name') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const eventDate = String(formData.get('event_date') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!name) {
    await setLivingError('Name the event.')
    return
  }

  const { error } = await supabase.from('living_events').insert({
    apartment_id: apartment.id,
    category: category || null,
    name,
    event_date: eventDate || null,
    notes: notes || null,
    created_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Event added.')
}

async function deleteEventAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_events').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Event removed — its collections and expenses went with it.')
}

async function addEventCategoriesAction(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireMembership(['admin', 'treasurer'])
  const raw = String(formData.get('names') ?? '')
  const requested = Array.from(new Set(raw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean)))
  if (requested.length === 0) {
    await setLivingError('Enter at least one category name.')
    return
  }

  const existing = await getEventCategories(supabase)
  const existingLower = new Set(existing.map((c) => c.name.toLowerCase()))
  const toAdd = requested.filter((n) => !existingLower.has(n.toLowerCase()))

  if (toAdd.length === 0) {
    await setLivingError('Those categories already exist.')
    return
  }

  const { error } = await supabase.from('living_event_categories').insert(toAdd.map((name) => ({ name, created_by: userId })))
  if (error) {
    await setLivingError(error.message)
    return
  }
  const skipped = requested.length - toAdd.length
  await setLivingNotice(
    skipped > 0
      ? `Added ${toAdd.length} categor${toAdd.length === 1 ? 'y' : 'ies'} (${skipped} already existed).`
      : `Added ${toAdd.length} categor${toAdd.length === 1 ? 'y' : 'ies'}.`
  )
}

async function deleteEventCategoryAction(id: string) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_event_categories').delete().eq('id', id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

export default async function LivingEventsPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const [events, categories] = await Promise.all([getEvents(supabase, apartment.id), getEventCategories(supabase)])

  const rows = await Promise.all(
    events.map(async (event) => {
      const [collections, expenses] = await Promise.all([getEventCollections(supabase, event.id), getEventExpenses(supabase, event.id)])
      const collected = sumEventCollections(collections)
      const spent = sumEventExpenses(expenses)
      return { event, collected, spent, net: collected - spent }
    })
  )

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Events
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        Ganesh Puja, Durga Puja, and every other community event — what was collected, what was spent, and the net, kept separate
        from the regular Maintenance billing cycle.
      </p>

      <Tabs
        tabs={[
          {
            id: 'events',
            label: 'Events',
            badge: events.length,
            content: (
              <div className={theme.card}>
                <div className={theme.tableScroll}>
                  <table className={theme.table}>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th className={theme.num}>Collected</th>
                        <th className={theme.num}>Spent</th>
                        <th className={theme.num}>Net</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ event, collected, spent, net }) => (
                        <tr key={event.id}>
                          <td>
                            <Link href={`/living/events/${event.id}`}>{event.name}</Link>
                          </td>
                          <td>{event.category ?? '—'}</td>
                          <td>{event.event_date ? new Date(event.event_date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className={theme.num}>{formatCurrency(collected)}</td>
                          <td className={theme.num}>{formatCurrency(spent)}</td>
                          <td className={net >= 0 ? theme.creditText : theme.warnText} style={{ textAlign: 'right' }}>
                            {formatCurrency(net)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                              <Link href={`/living/events/${event.id}`} className={theme.buttonGhost}>
                                Open
                              </Link>
                              <ConfirmSubmitButton
                                formAction={deleteEventAction.bind(null, event.id)}
                                confirmMessage={`Delete "${event.name}"? This removes its collections and expenses too — this can't be undone.`}
                                className={theme.iconButtonDanger}
                                title="Delete this event"
                              >
                                <IconTrash size={20} stroke={1.75} />
                              </ConfirmSubmitButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={7} className={theme.muted}>
                            No events yet — add one in the Add Event tab.
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
            label: 'Add Event',
            content: (
              <div className={theme.card}>
                <form action={addEventAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                    <label className={theme.label} htmlFor="name">
                      Event name
                    </label>
                    <input id="name" name="name" className={theme.input} placeholder="e.g. Ganesh Puja 2026" required />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, minWidth: '9rem' }}>
                    <label className={theme.label} htmlFor="category">
                      Category
                    </label>
                    {categories.length > 0 ? (
                      <select id="category" name="category" className={theme.select} defaultValue="">
                        <option value="">— none —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input id="category" name="category" className={theme.input} placeholder="Ganesh Puja" />
                    )}
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0 }}>
                    <label className={theme.label} htmlFor="event_date">
                      Date
                    </label>
                    <input id="event_date" name="event_date" type="date" className={theme.input} />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                    <label className={theme.label} htmlFor="notes">
                      Notes (optional)
                    </label>
                    <input id="notes" name="notes" className={theme.input} placeholder="Anything worth noting" />
                  </div>
                  <button type="submit" className={theme.button}>
                    Add event
                  </button>
                </form>
                {categories.length === 0 && (
                  <p className={theme.muted} style={{ marginTop: '0.75rem' }}>
                    No categories set up yet — add some in the Categories tab and they&rsquo;ll appear here as a dropdown.
                  </p>
                )}
              </div>
            ),
          },
          {
            id: 'categories',
            label: 'Categories',
            badge: categories.length,
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={homeStyles.sectionTitle}>Add categories</h2>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Master list used by the Category dropdown above — e.g. Ganesh Puja, Durga Puja, Diwali. Shared across every
                    apartment on the platform, so anything added here shows up for everyone. Comma or newline separated, add as many
                    as you like at once.
                  </p>
                  <form action={addEventCategoriesAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
                      <label className={theme.label} htmlFor="names">
                        Category names
                      </label>
                      <input id="names" name="names" className={theme.input} placeholder="Ganesh Puja, Durga Puja, Diwali" required />
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
                          <th>Category</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((c) => (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>
                              <form>
                                <ConfirmSubmitButton
                                  formAction={deleteEventCategoryAction.bind(null, c.id)}
                                  confirmMessage={`Delete category "${c.name}"?`}
                                  className={theme.iconButtonDanger}
                                  title="Delete category"
                                >
                                  <IconTrash size={20} stroke={1.75} />
                                </ConfirmSubmitButton>
                              </form>
                            </td>
                          </tr>
                        ))}
                        {categories.length === 0 && (
                          <tr>
                            <td colSpan={2} className={theme.muted}>
                              No categories yet.
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
