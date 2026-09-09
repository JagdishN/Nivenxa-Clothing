'use client'
import theme from '../../LivingTheme.module.scss'

/**
 * Same server action either way — this just gates the submit behind a
 * confirm() first, since it edits an ALREADY-EXISTING period's dates in
 * place (as opposed to "Start a new billing period", which is always a
 * fresh row and needs no such warning).
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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = window.confirm(
          'This changes the dates on the current billing period — if it’s already published, Owners have seen the old range. Continue?'
        )
        if (!ok) e.preventDefault()
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
  )
}
