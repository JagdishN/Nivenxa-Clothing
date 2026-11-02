import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLivingMembership } from '@/lib/living/auth'
import { recordLivingConsent } from '@/lib/living/consentActions'
import { LIVING_CONSENT_POLICY_VERSION } from '@/lib/living/consentVersion'
import theme from '../LivingTheme.module.scss'
import styles from '../_auth/AuthForm.module.scss'

// Same reasoning as login/signup/privacy — a one-time interstitial, not
// content worth indexing.
export const metadata: Metadata = { robots: { index: false, follow: true } }

async function agree() {
  'use server'
  await recordLivingConsent()
  redirect('/living/home')
}

/**
 * Shown once by requireMembership() — to every existing membership (whose
 * consent_at predates this feature) on their next sign-in, and to a new
 * Owner who joined via a code (the Create Apartment form collects consent
 * at signup itself, so an Admin never lands here). Deliberately NOT under
 * (dashboard) — requireMembership() is what redirects here in the first
 * place, so this page uses the lighter getLivingMembership() check instead,
 * which doesn't itself demand consent, avoiding a redirect loop.
 */
export default async function LivingConsentPage() {
  const ctx = await getLivingMembership()
  if (!ctx) redirect('/living/login')
  if (ctx.membership.consent_at && ctx.membership.consent_policy_version === LIVING_CONSENT_POLICY_VERSION) redirect('/living/home')

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Before you continue</h1>
      <p className={styles.subtitle}>
        Please review our <Link href="/living/terms">Terms of Use</Link> and <Link href="/living/privacy">Privacy Policy</Link> and
        agree to them to continue using Nivenxa Living.
      </p>
      <form action={agree}>
        <button type="submit" className={theme.button} style={{ width: '100%' }}>
          I agree
        </button>
      </form>
    </div>
  )
}
