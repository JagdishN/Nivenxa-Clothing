import Link from 'next/link'
import styles from './LivingNav.module.scss'

export default function LivingNav() {
  return (
    <header className={styles.bar}>
      <Link href="/living" className={styles.logo}>
        Nivenxa <em>Living</em>
      </Link>
      <nav className={styles.actions}>
        <Link href="/living/login" className={styles.link}>
          Login
        </Link>
        <Link href="/living/signup" className={styles.linkPrimary}>
          Sign Up
        </Link>
      </nav>
    </header>
  )
}
