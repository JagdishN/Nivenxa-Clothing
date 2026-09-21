import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLivingSession } from '@/lib/living/auth'
import OtpForm from '../_auth/OtpForm'
import styles from '../_auth/AuthForm.module.scss'

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
