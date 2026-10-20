'use client'
import { useRef, useState } from 'react'
import theme from '../../LivingTheme.module.scss'
import styles from '../ConfirmDialog.module.scss'

const WARNING = 'This changes the dates on the current billing period — if it’s already published, Owners have seen the old range. Continue?'

/**
 * Same server action either way — this just gates the submit behind a
 * confirm step first, since it edits an ALREADY-EXISTING period's dates in
 * place (as opposed to "Start a new billing period", which is always a
 * fresh row and needs no such warning).
 *
 * Uses our own modal, not window.confirm() — window.confirm() can be
 * silently auto-rejected in some embedded/sandboxed browser contexts (no
 * dialog ever shows, it just returns false), which would preventDefault()
 * the submit and make the button look like it does nothing at all.
 */
export default function EditPeriodForm({
  action,
  defaultStart,
  defaultEnd,
}: {
  action: (formData: FormData) => void
  defaultStart: string
  defaultEnd: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    if (!formRef.current) return
    setPending(true)
    await action(new FormData(formRef.current))
    setPending(false)
    setOpen(false)
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label} htmlFor="edit_period_start">
            From
          </label>
          <input id="edit_period_start" name="period_start" type="date" className={theme.input} defaultValue={defaultStart} required />
        </div>
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label} htmlFor="edit_period_end">
            To
          </label>
          <input id="edit_period_end" name="period_end" type="date" className={theme.input} defaultValue={defaultEnd} required />
        </div>
        <button type="submit" className={theme.buttonGhost}>
          Update dates
        </button>
      </form>

      {open && (
        <div className={styles.overlay} onClick={() => !pending && setOpen(false)}>
          <div className={styles.dialog} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className={styles.message}>{WARNING}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.confirm} disabled={pending} onClick={handleConfirm}>
                {pending ? 'Updating…' : 'Update dates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
