import type { Metadata } from 'next'
import LoginForm from './LoginForm'
import styles from './Account.module.scss'

export const metadata: Metadata = {
  title: 'Sign In — NIVENXA',
  description: 'Sign in to your NIVENXA account.',
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>Welcome back to NIVENXA.</p>

        <LoginForm />

        <p className={styles.switchText}>
          New to NIVENXA?{' '}
          <a href="/account/register" className={styles.switchLink}>
            Create an account
          </a>
        </p>
      </div>
    </div>
  )
}
