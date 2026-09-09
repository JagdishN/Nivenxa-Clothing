import Link from 'next/link'
import AuthTrigger from './AuthTrigger'
import styles from './LivingNav.module.scss'

export default function LivingNav() {
  return (
    <header className={styles.bar}>
      <Link href="/living" className={styles.logo}>
        Nivenxa <em>Living</em>
      </Link>
      <nav className={styles.actions}>
        <AuthTrigger mode="login" className={styles.link}>
          Login
        </AuthTrigger>
        <AuthTrigger mode="signup" className={styles.linkPrimary}>
          Sign Up
        </AuthTrigger>
      </nav>
    </header>
  )
}
