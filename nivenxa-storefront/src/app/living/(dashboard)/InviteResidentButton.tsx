'use client'
import { useEffect, useState } from 'react'
import theme from '../LivingTheme.module.scss'
import styles from './InviteResidentButton.module.scss'

/**
 * Demotes the Join Code from a permanent Overview KPI into an on-demand
 * action — most Admin sessions never need to look at it. Same modal shell
 * pattern as FeedbackModal (backdrop + centered card, Escape-to-close).
 */
export default function InviteResidentButton({ apartmentName, joinCode }: { apartmentName: string; joinCode: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied/unavailable — the code is still shown on screen to copy by hand.
    }
  }

  const shareText = `Join ${apartmentName} on Nivenxa Living — use join code ${joinCode} when you sign up.`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <>
      <button type="button" className={theme.buttonGhost} onClick={() => setOpen(true)}>
        + Invite Resident
      </button>

      {open && (
        <div className={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
          <div className={styles.card} role="dialog" aria-modal="true" aria-label="Invite a resident" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
            <h2 className={styles.title}>Invite a resident</h2>
            <p className={styles.subtitle}>Share this code — a new owner enters it when they create their account.</p>

            <div className={styles.codeRow}>
              <span className={styles.code}>{joinCode}</span>
              <button type="button" className={theme.buttonGhost} onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={theme.button} style={{ display: 'block', textAlign: 'center' }}>
              Share on WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  )
}
