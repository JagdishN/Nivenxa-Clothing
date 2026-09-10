'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import styles from './ConfirmDialog.module.scss'

/**
 * A button that runs a server action after our own confirm dialog — not
 * window.confirm(), and not dependent on living inside a <form>. `formAction`
 * is called directly (Next runs a bound server action just fine outside form
 * submission, redirect() included), which also means this works correctly as
 * a bare list item, not just inside a wrapping <form> for the row.
 *
 * `formAction` must already be bound to whatever row it targets (e.g.
 * `deleteFooAction.bind(null, row.id)`) — any trailing FormData we pass is
 * ignored by every action written against this component.
 */
export default function ConfirmSubmitButton({
  formAction,
  confirmMessage,
  className,
  title,
  children,
}: {
  formAction: (formData: FormData) => void
  confirmMessage: string
  className?: string
  title?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    await formAction(new FormData())
    setOpen(false)
    setPending(false)
  }

  return (
    <>
      <button type="button" title={title} aria-label={title} className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => !pending && setOpen(false)}>
          <div className={styles.dialog} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className={styles.message}>{confirmMessage}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.confirm} disabled={pending} onClick={handleConfirm}>
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
