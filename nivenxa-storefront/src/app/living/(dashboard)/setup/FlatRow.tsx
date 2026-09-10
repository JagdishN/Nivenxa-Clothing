'use client'

import { useState } from 'react'
import { IconPencil } from '@tabler/icons-react'
import type { Flat } from '@/lib/living/types'
import MaterialIcon from '../../MaterialIcon'
import theme from '../../LivingTheme.module.scss'
import styles from './Setup.module.scss'

/**
 * Read-only by default — a whole table of always-editable inputs looked
 * like a spreadsheet and invited accidental edits. Clicking the pencil
 * swaps this one row into a form; saving (or cancelling) swaps it back.
 * Saving redirects the whole page (see updateSingleFlatAction), which
 * naturally remounts this component back to view mode with fresh data —
 * no need to reset local state after a successful save.
 */
export default function FlatRow({
  flat,
  otherFlats,
  action,
  apartmentName,
  joinCode,
}: {
  flat: Flat
  otherFlats: { id: string; flat_no: string }[]
  action: (formData: FormData) => void
  apartmentName: string
  joinCode: string
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    const contactIsEmail = flat.owner_contact?.includes('@')
    const mailBody = [
      `Hi ${flat.owner_name ?? 'there'},`,
      '',
      `You're invited to join ${apartmentName} on Nivenxa Living for Flat ${flat.flat_no}.`,
      '',
      `Join code: ${joinCode}`,
      '',
      `Open Nivenxa Living, choose "Join with a code" on sign up, and enter this code with your flat number.`,
    ].join('\n')
    const mailHref = `mailto:${flat.owner_contact}?subject=${encodeURIComponent(`Join ${apartmentName} on Nivenxa Living`)}&body=${encodeURIComponent(mailBody)}`

    return (
      <tr className={styles.flatRowView}>
        <td>{flat.flat_no}</td>
        <td>{flat.owner_name ?? '—'}</td>
        <td>{flat.owner_contact ?? '—'}</td>
        <td className={theme.num}>{flat.sq_ft ?? '—'}</td>
        <td className={theme.num}>{flat.share_override ?? '—'}</td>
        <td>{flat.excluded_from_billing ? 'Shared/common' : '—'}</td>
        <td>{otherFlats.find((f) => f.id === flat.merged_into_flat_id)?.flat_no ?? '—'}</td>
        <td>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {contactIsEmail && (
              <a href={mailHref} className={theme.iconButton} title={`Email the join code to ${flat.owner_contact}`}>
                <MaterialIcon name="mail" size={18} />
              </a>
            )}
            <button type="button" className={theme.iconButton} title={`Edit flat ${flat.flat_no}`} onClick={() => setEditing(true)}>
              <IconPencil size={18} stroke={1.75} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={8}>
        <form action={action} className={styles.editForm}>
          <div className={theme.field} style={{ marginBottom: 0, width: '6rem' }}>
            <label className={theme.label}>Flat</label>
            <input name="flat_no" className={theme.input} defaultValue={flat.flat_no} required />
          </div>
          <div className={theme.field} style={{ marginBottom: 0, width: '10rem' }}>
            <label className={theme.label}>Owner</label>
            <input name="owner_name" className={theme.input} defaultValue={flat.owner_name ?? ''} />
          </div>
          <div className={theme.field} style={{ marginBottom: 0, width: '10rem' }}>
            <label className={theme.label}>Contact</label>
            <input name="owner_contact" className={theme.input} defaultValue={flat.owner_contact ?? ''} />
          </div>
          <div className={theme.field} style={{ marginBottom: 0, width: '6rem' }}>
            <label className={theme.label}>sq ft</label>
            <input name="sq_ft" className={theme.input} type="number" step="0.01" defaultValue={flat.sq_ft ?? ''} />
          </div>
          <div className={theme.field} style={{ marginBottom: 0, width: '7rem' }}>
            <label className={theme.label}>Split override</label>
            <input name="share_override" className={theme.input} type="number" step="0.01" defaultValue={flat.share_override ?? ''} />
          </div>
          <div className={theme.field} style={{ marginBottom: 0 }}>
            <label className={theme.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input type="checkbox" name="excluded" defaultChecked={flat.excluded_from_billing} />
              Shared/common meter
            </label>
          </div>
          <div className={theme.field} style={{ marginBottom: 0, width: '9rem' }}>
            <label className={theme.label}>Merge water into</label>
            <select name="merge_into" className={theme.select} defaultValue={flat.merged_into_flat_id ?? ''}>
              <option value="">— none —</option>
              {otherFlats.map((other) => (
                <option key={other.id} value={other.id}>
                  {other.flat_no}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={theme.button}>
            Save
          </button>
          <button type="button" className={theme.buttonGhost} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      </td>
    </tr>
  )
}
