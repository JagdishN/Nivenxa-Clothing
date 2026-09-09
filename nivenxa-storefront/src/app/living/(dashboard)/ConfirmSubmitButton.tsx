'use client'

import type { ReactNode } from 'react'

/**
 * A submit button that lives inside a Server Component <form> but still needs
 * a client-side confirm() before it's allowed to fire — e.g. Delete buttons
 * using formAction to target a different server action than the form's own.
 *
 * `formAction` must already be bound to whatever row it targets (e.g.
 * `deleteFooAction.bind(null, row.id)`), not passed a raw `name`/`value` pair
 * on this button — React encodes a hidden action-id field onto a formAction
 * button itself, and giving it our own `name` collides with that, producing
 * a server/client hydration mismatch on the `name` attribute.
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
  return (
    <button
      type="submit"
      formAction={formAction}
      title={title}
      aria-label={title}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
