'use client'

import { useState } from 'react'
import styles from './NewsletterSection.module.css'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setLoading(true)
    // Simulate async — replace with real API call later
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
      setEmail('')
    }, 600)
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        <div className={styles.left}>
          <h2 className={styles.heading}>
            From The <em>Atelier</em>
          </h2>
          <div className={styles.lines}>
            <p className={styles.line}>Fabric developments.</p>
            <p className={styles.line}>Production notes.</p>
            <p className={styles.line}>New silhouettes.</p>
            <p className={styles.line}>Quiet releases.</p>
          </div>
          <span className={styles.frequency}>
            Delivered occasionally.
          </span>
        </div>

        <div className={styles.right}>
          {submitted ? (
            <p className={styles.confirmation}>
              Noted. We will be in touch.
            </p>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={styles.input}
                required
              />
              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>

      </div>
    </section>
  )
}
