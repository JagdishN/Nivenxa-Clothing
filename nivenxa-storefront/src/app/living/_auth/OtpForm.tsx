'use client'
import { useRouter } from 'next/navigation'
import LivingOtpFlow from './LivingOtpFlow'

/**
 * The email-code form on the /living/signup page (shown when someone arrives there without a session). Same behaviour
 * as the sign-in drawer: shared hook, automatic verification, no verify button. After the server confirms the code it
 * goes to /living/home, which sends a brand-new account on to the Create/Join step by itself.
 */
export default function OtpForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  return (
    <LivingOtpFlow
      shouldCreateUser={mode === 'signup'}
      onVerified={() => {
        router.push('/living/home')
        router.refresh()
      }}
    />
  )
}
