import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'
import styles from '../login/Account.module.scss'

export const metadata: Metadata = {
  title: 'Create Account — NIVENXA',
  description: 'Create your NIVENXA account.',
}

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join the NIVENXA wardrobe.</p>

        <RegisterForm />

        <p className={styles.switchText}>
          Already have an account?{' '}
          <a href="/account/login" className={styles.switchLink}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
