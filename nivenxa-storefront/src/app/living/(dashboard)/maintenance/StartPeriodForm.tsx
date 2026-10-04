'use client'
import { useRef, useState } from 'react'
import theme from '../../LivingTheme.module.scss'
import styles from '../ConfirmDialog.module.scss'

/**
 * Same startPeriodAction either way — this just adds a confirm step first
 * when `warningMessage` is non-null, i.e. the period being superseded hasn't
 * been fully closed out yet (not published to Owners, or published but its
 * Financial Statement hasn't been — see previousPeriodWarning in page.tsx).
 * No warning at all once that period is genuinely finished, so the normal
 * publish-then-start-new flow isn't nagged every time.
 *
 * Uses our own modal, not window.confirm() — window.confirm() can be
 * silently auto-rejected in some embedded/sandboxed browser contexts (no
 * dialog ever shows, it just returns false), which would preventDefault()
 * the submit and make the button look like it does nothing at all. Every
 * other confirm in this app (ConfirmSubmitButton) already avoids this for
 * the same reason — this follows that same pattern instead of window.confirm().
 */
export default function StartPeriodForm({
  action,
  defaultStart,
  defaultEnd,
  warningMessage,
}: {
  action: (formData: FormData) => void
  defaultStart: string
  defaultEnd: string
  warningMessage: string | null
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
          if (!warningMessage) return
          e.preventDefault()
          setOpen(true)
        }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label} htmlFor="period_start">
            From
          </label>
          <input id="period_start" name="period_start" type="date" className={theme.input} defaultValue={defaultStart} required />
        </div>
        <div className={theme.field} style={{ marginBottom: 0 }}>
          <label className={theme.label} htmlFor="period_end">
            To
          </label>
          <input id="period_end" name="period_end" type="date" className={theme.input} defaultValue={defaultEnd} required />
        </div>
        <button type="submit" className={theme.button}>
          Start period
        </button>
      </form>

      {open && (
        <div className={styles.overlay} onClick={() => !pending && setOpen(false)}>
          <div className={styles.dialog} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p className={styles.message}>{warningMessage}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} disabled={pending} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.confirm} disabled={pending} onClick={handleConfirm}>
                {pending ? 'Starting…' : 'Start anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
