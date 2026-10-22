'use client'
import { useState, type FormEvent } from 'react'
import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import BackLink from '@/components/global/BackLink/BackLink'
import infoStyles from '../ProductInfo/ProductInfo.module.css'
import styles from './NotifyPanel.module.css'

type Status = 'idle' | 'sending' | 'done' | 'error'

/**
 * PDP panel for a coming-soon product: name, one short line and a
 * notify-me form. Deliberately no price, sizes, swatches or add-to-bag.
 */
export default function NotifyPanel({ product }: { product: Product }) {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('') // honeypot — hidden from people
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setMessage('')
    try {
      const res = await fetch('/api/studio/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, productId: product.id, company }),
      })
      if (res.ok) {
        setStatus('done')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setMessage(data?.error ?? 'Something went wrong. Please try again.')
      setStatus('error')
    } catch {
      setMessage('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className={infoStyles.panel}>
      <BackLink />
      <p className={infoStyles.badge}>Coming soon</p>
      <h1 className={infoStyles.title}>{product.name}</h1>
      <p className={styles.line}>{product.comingSoonLine}</p>

      {status === 'done' ? (
        <p className={styles.thanks} role="status">
          Thank you. We&rsquo;ll let you know.
        </p>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label htmlFor="notify-email" className={styles.srOnly}>
            Email address
          </label>
          <input
            id="notify-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="Email address"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="notify-help"
          />
          {/* Honeypot: off-screen, not focusable, ignored by assistive tech. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className={styles.honeypot}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <button type="submit" className={styles.button} disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Notify me'}
          </button>
          {status === 'error' && (
            <p className={styles.error} role="alert">
              {message}
            </p>
          )}
          <p id="notify-help" className={styles.help}>
            We&rsquo;ll email you once when it launches. No other emails unless you choose to sign up.{' '}
            <Link href="/privacy" className={styles.helpLink}>
              Privacy Policy
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}
