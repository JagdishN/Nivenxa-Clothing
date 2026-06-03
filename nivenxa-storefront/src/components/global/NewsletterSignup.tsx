'use client'
import { useState } from 'react'
import styles from './Footer.module.scss'

export default function NewsletterSignup() {
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className={styles.newsletterThanks}>
        Thank you — we&#39;ll be in touch.
      </p>
    )
  }

  return (
    <form className={styles.newsletterForm} onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className={styles.newsletterInput}
        autoComplete="email"
      />
      <button type="submit" className={styles.newsletterBtn}>Send My Way</button>
    </form>
  )
}
