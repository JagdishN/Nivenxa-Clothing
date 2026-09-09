import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { formatCurrency } from '@/lib/living/format'
import type { InventoryItem } from '@/lib/living/types'
import theme from '../../LivingTheme.module.scss'
import Tabs from '../Tabs'

async function addInventoryItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])

  const itemName = String(formData.get('item_name') ?? '').trim()
  const quantity = Number(formData.get('quantity') ?? 1) || 1
  const unit = String(formData.get('unit') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const value = formData.get('value') ? Number(formData.get('value')) : null
  const purchasedOn = String(formData.get('purchased_on') ?? '').trim()
  const notes = String(formData.get('notes') ?? '').trim()

  if (!itemName) {
    await setLivingError('Name the item.')
    redirect('/living/inventory')
  }

  const { error } = await supabase.from('living_inventory_items').insert({
    apartment_id: apartment.id,
    item_name: itemName,
    quantity,
    unit: unit || null,
    location: location || null,
    value,
    purchased_on: purchasedOn || null,
    notes: notes || null,
    created_by: userId,
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/inventory')
  }
  await setLivingNotice('Added.')
  redirect('/living/inventory')
}

async function deleteInventoryItemAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const id = String(formData.get('id') ?? '')
  const { error } = await supabase.from('living_inventory_items').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) {
    await setLivingError(error.message)
    redirect('/living/inventory')
  }
  await setLivingNotice('Removed.')
  redirect('/living/inventory')
}

export default async function LivingInventoryPage() {
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const { data } = await supabase
    .from('living_inventory_items')
    .select('*')
    .eq('apartment_id', apartment.id)
    .order('item_name')
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
                <div className={theme.tableScroll}>
                  <table className={theme.table}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className={theme.num}>Qty</th>
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
                          <td>{item.item_name}</td>
                          <td className={theme.num}>
                            {item.quantity}
                            {item.unit ? ` ${item.unit}` : ''}
                          </td>
                          <td>{item.location ?? '—'}</td>
                          <td className={theme.num}>{item.value !== null ? formatCurrency(item.value) : '—'}</td>
                          <td>{item.purchased_on ? new Date(item.purchased_on).toLocaleDateString('en-IN') : '—'}</td>
                          <td>{item.notes ?? '—'}</td>
                          <td>
                            <form action={deleteInventoryItemAction}>
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className={theme.buttonGhost}>
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={7} className={theme.muted}>
                            Nothing recorded yet.
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
            label: 'Add Item',
            content: (
              <div className={theme.card}>
                <form action={addInventoryItemAction} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className={theme.field} style={{ marginBottom: 0, flex: 2, minWidth: '12rem' }}>
                    <label className={theme.label} htmlFor="item_name">
                      Item
                    </label>
                    <input id="item_name" name="item_name" className={theme.input} placeholder="e.g. Water motor (backup)" required />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, width: '6rem' }}>
                    <label className={theme.label} htmlFor="quantity">
                      Qty
                    </label>
                    <input id="quantity" name="quantity" type="number" step="1" min="0" className={theme.input} defaultValue={1} />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, width: '6rem' }}>
                    <label className={theme.label} htmlFor="unit">
                      Unit
                    </label>
                    <input id="unit" name="unit" className={theme.input} placeholder="pcs" />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0 }}>
                    <label className={theme.label} htmlFor="location">
                      Location
                    </label>
                    <input id="location" name="location" className={theme.input} placeholder="Terrace store" />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0 }}>
                    <label className={theme.label} htmlFor="value">
                      Value
                    </label>
                    <input id="value" name="value" type="number" step="0.01" min="0" className={theme.input} />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0 }}>
                    <label className={theme.label} htmlFor="purchased_on">
                      Purchased
                    </label>
                    <input id="purchased_on" name="purchased_on" type="date" className={theme.input} />
                  </div>
                  <div className={theme.field} style={{ marginBottom: 0, flex: 1, minWidth: '10rem' }}>
                    <label className={theme.label} htmlFor="notes">
                      Notes
                    </label>
                    <input id="notes" name="notes" className={theme.input} placeholder="Condition, serial no." />
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
