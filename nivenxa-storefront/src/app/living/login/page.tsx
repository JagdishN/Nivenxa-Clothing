import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLivingSession } from '@/lib/living/auth'
import OtpForm from '../_auth/OtpForm'
import styles from '../_auth/AuthForm.module.scss'

// Disallow would block crawling but still let the bare URL sit in results
// with no content — noindex is the right instrument for an auth form.
// follow: true since the page still links onward (back to /living).
export const metadata: Metadata = { robots: { index: false, follow: true } }

export default async function LivingLoginPage() {
  const session = await getLivingSession()
  if (session) redirect('/living/home')

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Login</h1>
      <p className={styles.subtitle}>Enter the email registered with your apartment.</p>
      <OtpForm mode="login" />
      <p className={styles.footer}>
        New to Nivenxa Living? <Link href="/living/signup">Create an Apartment</Link>
      </p>
    </div>
  )
}
