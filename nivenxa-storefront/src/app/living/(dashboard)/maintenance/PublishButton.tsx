'use client'
import { useState } from 'react'
import theme from '../../LivingTheme.module.scss'
import styles from '../ConfirmDialog.module.scss'

const WARNING =
  "Publishing makes this billing period visible to every flat mate — they'll see their own share immediately. Please recheck line items, water readings, and ledger entries before continuing. Once a Financial Statement is published for this period later, none of it can be edited anymore, by anyone."

/**
 * Own modal, not window.confirm() — same reason as every other confirm in
 * this app (see StartPeriodForm/EditPeriodForm/ConfirmSubmitButton):
 * window.confirm() can be silently auto-rejected in some embedded/sandboxed
 * browser contexts, which would make the button look like it does nothing.
 */
export default function PublishButton({ action }: { action: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    await action()
    setPending(false)
    setOpen(false)
  }

  return (
    <>
      <button type="button" className={theme.button} onClick={() => setOpen(true)}>
        Publish
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => !pending && setOpen(false)}>
          <div className={styles.dialog} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className={styles.message}>{WARNING}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.confirm} disabled={pending} onClick={handleConfirm}>
                {pending ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
