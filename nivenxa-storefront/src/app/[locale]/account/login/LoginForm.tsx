'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import styles from './Account.module.scss'

export default function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const { errors } = await login(email, password)
      if (errors.length > 0) {
        setError(errors[0].message)
      } else {
        router.push('/account')
      }
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={isPending}
      >
        {isPending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
