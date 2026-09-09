'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registerCustomer } from '@/lib/shopify-auth'
import { useAuth } from '@/context/AuthContext'
import styles from '../login/Account.module.scss'

export default function RegisterForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const { errors } = await registerCustomer({ firstName, lastName, email, password })

      if (errors.length > 0) {
        setError(errors[0].message)
        return
      }

      // Auto-login after successful registration
      const { errors: loginErrors } = await login(email, password)
      if (loginErrors.length === 0) {
        router.push('/account')
      } else {
        router.push('/account/login')
      }
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.nameRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            className={styles.input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            className={styles.input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={isPending}
      >
        {isPending ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  )
}
