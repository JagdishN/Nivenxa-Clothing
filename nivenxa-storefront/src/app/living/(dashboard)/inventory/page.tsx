import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { parseInventoryTemplate } from '@/lib/living/inventory'
import { getInventoryCategories, getInventoryUnits } from '@/lib/living/queries'
import type { InventoryItem } from '@/lib/living/types'
import ConfirmSubmitButton from '../ConfirmSubmitButton'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'
import Tabs from '../Tabs'

// Blank rows offered on the "Add Items" manual grid — leaving a row's Item
// field empty just skips it, so this is a convenience count, not a cap.
const ADD_ROWS = 5

async function addInventoryItemsAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const rows: {
    item_name: string
    quantity: number
    unit: string | null
    category: string | null
    location: string | null
    value: number | null
    purchased_on: string | null
    notes: string | null
  }[] = []

  for (let i = 0; i < ADD_ROWS; i++) {
    const itemName = String(formData.get(`item_name_${i}`) ?? '').trim()
    if (!itemName) continue
    const quantityRaw = formData.get(`quantity_${i}`)
    const valueRaw = formData.get(`value_${i}`)
    rows.push({
      item_name: itemName,
      quantity: quantityRaw ? Number(quantityRaw) || 1 : 1,
      unit: String(formData.get(`unit_${i}`) ?? '').trim() || null,
      category: String(formData.get(`category_${i}`) ?? '').trim() || null,
      location: String(formData.get(`location_${i}`) ?? '').trim() || null,
      value: valueRaw ? Number(valueRaw) : null,
      purchased_on: String(formData.get(`purchased_on_${i}`) ?? '').trim() || null,
      notes: String(formData.get(`notes_${i}`) ?? '').trim() || null,
    })
  }

  if (rows.length === 0) {
    await setLivingError('Fill in at least one item name.')
    return
  }

  const { error } = await supabase.from('living_inventory_items').insert(
    rows.map((row) => ({ apartment_id: apartment.id, created_by: userId, ...row }))
  )
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice(rows.length === 1 ? 'Added 1 item.' : `Added ${rows.length} items.`)
}

async function uploadInventoryTemplateAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    await setLivingError('Choose a file first.')
    return
  }

  const { rows, errors } = await parseInventoryTemplate(await file.arrayBuffer())
  if (rows.length === 0) {
    await setLivingError(errors[0] ?? 'No items found in that file.')
    return
  }

  const { error } = await supabase.from('living_inventory_items').insert(
    rows.map((row) => ({ apartment_id: apartment.id, created_by: userId, ...row }))
  )
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice(errors.length > 0 ? `Added ${rows.length} items. ${errors.length} row(s) skipped — see below.` : `Added ${rows.length} items.`)
}

/** Shared by the row-level Save icon and the bulk "Save changes" button — both post the same field names, just for a different set of ids. */
async function applyInventoryItemUpdate(supabase: SupabaseClient, id: string, formData: FormData) {
  const itemName = String(formData.get(`item_name_${id}`) ?? '').trim()
  if (!itemName) return { error: null, itemName: null }
  const quantityRaw = formData.get(`quantity_${id}`)
  const valueRaw = formData.get(`value_${id}`)
  const { error } = await supabase
    .from('living_inventory_items')
    .update({
      item_name: itemName,
      quantity: quantityRaw ? Number(quantityRaw) || 1 : 1,
      unit: String(formData.get(`unit_${id}`) ?? '').trim() || null,
      category: String(formData.get(`category_${id}`) ?? '').trim() || null,
      location: String(formData.get(`location_${id}`) ?? '').trim() || null,
      value: valueRaw ? Number(valueRaw) : null,
      purchased_on: String(formData.get(`purchased_on_${id}`) ?? '').trim() || null,
      notes: String(formData.get(`notes_${id}`) ?? '').trim() || null,
    })
    .eq('id', id)
  return { error, itemName }
}

async function updateInventoryItemsAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { data } = await supabase.from('living_inventory_items').select('id').eq('apartment_id', apartment.id)
  const ids = (data ?? []).map((row) => row.id as string)

  for (const id of ids) {
    const { error, itemName } = await applyInventoryItemUpdate(supabase, id, formData)
    if (error) {
      await setLivingError(`${itemName}: ${error.message}`)
      return
    }
  }
  await setLivingNotice('Items updated.')
}

async function updateSingleInventoryItemAction(id: string, formData: FormData) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error, itemName } = await applyInventoryItemUpdate(supabase, id, formData)
  if (error) {
    await setLivingError(`${itemName}: ${error.message}`)
    return
  }
  await setLivingNotice('Saved.')
}

async function deleteInventoryItemAction(id: string) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_inventory_items').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

async function addCategoriesAction(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireMembership(['admin', 'treasurer'])
  const raw = String(formData.get('names') ?? '')
  const requested = Array.from(new Set(raw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean)))
  if (requested.length === 0) {
    await setLivingError('Enter at least one category name.')
    return
  }

  const existing = await getInventoryCategories(supabase)
  const existingLower = new Set(existing.map((c) => c.name.toLowerCase()))
  const toAdd = requested.filter((n) => !existingLower.has(n.toLowerCase()))

  if (toAdd.length === 0) {
    await setLivingError('Those categories already exist.')
    return
  }

  const { error } = await supabase.from('living_inventory_categories').insert(toAdd.map((name) => ({ name, created_by: userId })))
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

async function deleteCategoryAction(id: string) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_inventory_categories').delete().eq('id', id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

async function addUnitsAction(formData: FormData) {
  'use server'
  const { supabase, userId } = await requireMembership(['admin', 'treasurer'])
  const raw = String(formData.get('names') ?? '')
  const requested = Array.from(new Set(raw.split(/[,\n]/).map((n) => n.trim()).filter(Boolean)))
  if (requested.length === 0) {
    await setLivingError('Enter at least one unit name.')
    return
  }

  const existing = await getInventoryUnits(supabase)
  const existingLower = new Set(existing.map((u) => u.name.toLowerCase()))
  const toAdd = requested.filter((n) => !existingLower.has(n.toLowerCase()))

  if (toAdd.length === 0) {
    await setLivingError('Those units already exist.')
    return
  }

  const { error } = await supabase.from('living_inventory_units').insert(toAdd.map((name) => ({ name, created_by: userId })))
  if (error) {
    await setLivingError(error.message)
    return
  }
  const skipped = requested.length - toAdd.length
  await setLivingNotice(skipped > 0 ? `Added ${toAdd.length} unit(s) (${skipped} already existed).` : `Added ${toAdd.length} unit(s).`)
}

async function deleteUnitAction(id: string) {
  'use server'
  const { supabase } = await requireMembership(['admin', 'treasurer'])
  const { error } = await supabase.from('living_inventory_units').delete().eq('id', id)
  if (error) {
    await setLivingError(error.message)
    return
  }
  await setLivingNotice('Removed.')
}

/** Option list for a master-data <select> — includes the row's current value even if it's since been removed from the master list, so saving without touching this field never silently changes it. */
function optionsWithCurrent(master: { name: string }[], currentValue: string | null) {
  const names = master.map((m) => m.name)
  const extra = currentValue && !names.includes(currentValue) ? [currentValue] : []
  return [...names, ...extra]
}

export default async function LivingInventoryPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const [{ data }, categories, units] = await Promise.all([
    supabase.from('living_inventory_items').select('*').eq('apartment_id', apartment.id).order('item_name'),
    getInventoryCategories(supabase),
    getInventoryUnits(supabase),
  ])
  const items = (data ?? []) as InventoryItem[]

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>
        Inventory
      </h1>
      <p className={theme.muted} style={{ marginBottom: '1.5rem' }}>
        What the apartment owns — equipment, tools, spares — one register instead of scattered memory.
      </p>

      <Tabs
        tabs={[
          {
            id: 'items',
            label: 'Items',
            badge: items.length,
            content: (
              <div className={theme.card}>
                <form action={updateInventoryItemsAction}>
                  <div className={theme.tableScroll}>
                    <table className={theme.table}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Category</th>
                          <th className={theme.num}>Qty</th>
                          <th>Unit</th>
                          <th>Location</th>
                          <th className={theme.num}>Value</th>
                          <th>Purchased</th>
                          <th>Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <input name={`item_name_${item.id}`} className={theme.input} defaultValue={item.item_name} />
                            </td>
                            <td>
                              <select name={`category_${item.id}`} className={theme.select} defaultValue={item.category ?? ''}>
                                <option value="">— none —</option>
                                {optionsWithCurrent(categories, item.category).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                name={`quantity_${item.id}`}
                                type="number"
                                step="1"
                                min="0"
                                className={theme.input}
                                style={{ width: '4.5rem' }}
                                defaultValue={item.quantity}
                              />
                            </td>
                            <td>
                              <select name={`unit_${item.id}`} className={theme.select} style={{ width: '6rem' }} defaultValue={item.unit ?? ''}>
                                <option value="">— none —</option>
                                {optionsWithCurrent(units, item.unit).map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input name={`location_${item.id}`} className={theme.input} defaultValue={item.location ?? ''} />
                            </td>
                            <td>
                              <input
                                name={`value_${item.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                className={theme.input}
                                style={{ width: '6rem' }}
                                defaultValue={item.value ?? ''}
                              />
                            </td>
                            <td>
                              <input
                                name={`purchased_on_${item.id}`}
                                type="date"
                                className={theme.input}
                                defaultValue={item.purchased_on ?? ''}
                              />
                            </td>
                            <td>
                              <input name={`notes_${item.id}`} className={theme.input} defaultValue={item.notes ?? ''} />
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button
                                  type="submit"
                                  formAction={updateSingleInventoryItemAction.bind(null, item.id)}
                                  className={theme.iconButton}
                                  title="Save this row"
                                >
                                  <IconDeviceFloppy size={20} stroke={1.75} />
                                </button>
                                <ConfirmSubmitButton
                                  formAction={deleteInventoryItemAction.bind(null, item.id)}
                                  confirmMessage={`Delete "${item.item_name}"? This can't be undone.`}
                                  className={theme.iconButtonDanger}
                                  title="Delete this item"
                                >
                                  <IconTrash size={20} stroke={1.75} />
                                </ConfirmSubmitButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={9} className={theme.muted}>
                              Nothing recorded yet — add some in the Add Items tab.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {items.length > 0 && (
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
            label: 'Add Items',
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={homeStyles.sectionTitle}>Bulk upload</h2>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Upload an .xlsx file with columns <code>item_name</code>, <code>quantity</code>, <code>unit</code>,{' '}
                    <code>category</code>, <code>location</code>, <code>value</code>, <code>purchased_on</code>, <code>notes</code>. Only{' '}
                    <code>item_name</code> is required.
                  </p>
                  <form action={uploadInventoryTemplateAction}>
                    <div className={theme.field}>
                      <input type="file" name="file" accept=".xlsx" required />
                    </div>
                    <button type="submit" className={theme.button}>
                      Upload
                    </button>
                  </form>
                </div>

                <div className={theme.card}>
                  <h2 className={homeStyles.sectionTitle}>Add items</h2>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Fill in as many rows as you need — blank rows are skipped. Submitting keeps you on this tab, so add another batch
                    right after.
                  </p>
                  <form action={addInventoryItemsAction}>
                    <div className={theme.tableScroll}>
                      <table className={theme.table}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th className={theme.num}>Qty</th>
                            <th>Unit</th>
                            <th>Location</th>
                            <th className={theme.num}>Value</th>
                            <th>Purchased</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: ADD_ROWS }).map((_, i) => (
                            <tr key={i}>
                              <td>
                                <input name={`item_name_${i}`} className={theme.input} placeholder="e.g. Water motor (backup)" />
                              </td>
                              <td>
                                <select name={`category_${i}`} className={theme.select} defaultValue="">
                                  <option value="">— none —</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.name}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input name={`quantity_${i}`} type="number" step="1" min="0" className={theme.input} style={{ width: '4.5rem' }} defaultValue={1} />
                              </td>
                              <td>
                                <select name={`unit_${i}`} className={theme.select} style={{ width: '6rem' }} defaultValue="">
                                  <option value="">— none —</option>
                                  {units.map((u) => (
                                    <option key={u.id} value={u.name}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input name={`location_${i}`} className={theme.input} placeholder="Terrace store" />
                              </td>
                              <td>
                                <input name={`value_${i}`} type="number" step="0.01" min="0" className={theme.input} style={{ width: '6rem' }} />
                              </td>
                              <td>
                                <input name={`purchased_on_${i}`} type="date" className={theme.input} />
                              </td>
                              <td>
                                <input name={`notes_${i}`} className={theme.input} placeholder="Condition, serial no." />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button type="submit" className={theme.button} style={{ marginTop: '1rem' }}>
                      Add items
                    </button>
                  </form>
                </div>
              </>
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
                    Master list used by the Category dropdown above — e.g. Motors, General, Puja Items. Shared across every apartment
                    on the platform, so anything added here shows up for everyone. Comma or newline separated, add as many as you like
                    at once.
                  </p>
                  <form action={addCategoriesAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
                      <label className={theme.label} htmlFor="names">
                        Category names
                      </label>
                      <input id="names" name="names" className={theme.input} placeholder="Motors, General, Puja Items" required />
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
                                  formAction={deleteCategoryAction.bind(null, c.id)}
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
          {
            id: 'units',
            label: 'Units',
            badge: units.length,
            content: (
              <>
                <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
                  <h2 className={homeStyles.sectionTitle}>Add units</h2>
                  <p className={theme.muted} style={{ marginBottom: '1rem' }}>
                    Master list used by the Unit dropdown above — e.g. Pieces, Metres, KG. Shared across every apartment on the
                    platform, so anything added here shows up for everyone. Comma or newline separated, add as many as you like at
                    once.
                  </p>
                  <form action={addUnitsAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '16rem' }}>
                      <label className={theme.label} htmlFor="unit_names">
                        Unit names
                      </label>
                      <input id="unit_names" name="names" className={theme.input} placeholder="Pieces, Metres, KG" required />
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
                          <th>Unit</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {units.map((u) => (
                          <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>
                              <form>
                                <ConfirmSubmitButton
                                  formAction={deleteUnitAction.bind(null, u.id)}
                                  confirmMessage={`Delete unit "${u.name}"?`}
                                  className={theme.iconButtonDanger}
                                  title="Delete unit"
                                >
                                  <IconTrash size={20} stroke={1.75} />
                                </ConfirmSubmitButton>
                              </form>
                            </td>
                          </tr>
                        ))}
                        {units.length === 0 && (
                          <tr>
                            <td colSpan={2} className={theme.muted}>
                              No units yet.
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
