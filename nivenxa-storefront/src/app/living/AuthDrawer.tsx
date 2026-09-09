'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { EASE_OUT_EXPO } from '@/lib/motion'
import { setLivingFlashClient } from '@/lib/living/flashClient'
import { createLivingBrowserClient } from '@/lib/living/supabaseBrowser'
import type { AuthDrawerMode } from './AuthDrawerProvider'
import theme from './LivingTheme.module.scss'
import styles from './AuthDrawer.module.scss'

type Step = 'contact' | 'code' | 'choose' | 'create' | 'join'

/**
 * The compact, in-place equivalent of the storefront's SignInDrawer — email
 * OTP, then (for a brand-new account) a Create-Apartment-or-Join-with-code
 * choice, all without leaving the page. Replaces navigating to a separate
 * /living/login or /living/signup route for the common case; those routes
 * still exist and still work for a direct/bookmarked visit.
 *
 * The Create/Join RPCs are called directly from the browser client
 * (living_create_apartment/living_join_apartment are already
 * security-definer Postgres functions — the old page's Server Actions were
 * just a thin wrapper around the same calls) so nothing here needs a
 * full-page redirect to complete.
 *
 * The outer component owns only the open/close animation; all form state
 * lives in AuthDrawerPanel, which mounts fresh each time the drawer opens
 * (rather than a reset effect fighting its own stale state on re-open).
 */
export default function AuthDrawer({ mode, onClose }: { mode: AuthDrawerMode | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {mode !== null && (
        <>
          <motion.div
            className={styles.backdrop}
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <button className={styles.close} onClick={onClose} aria-label="Close">
              ×
            </button>
            <AuthDrawerPanel mode={mode} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function AuthDrawerPanel({ mode, onClose }: { mode: AuthDrawerMode; onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('contact')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create-apartment fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [adminContact, setAdminContact] = useState('')
  const [flatCount, setFlatCount] = useState(1)
  const [flatSplit, setFlatSplit] = useState<'equal' | 'weighted'>('equal')

  // Join-with-code fields
  const [joinCode, setJoinCode] = useState('')
  const [flatNo, setFlatNo] = useState('')

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function requestCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createLivingBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'signup' } })
    setPending(false)
    if (error) {
      setError(
        mode === 'login' && error.message.toLowerCase().includes('not found')
          ? "We couldn't find an account for that — try Sign Up instead."
          : error.message
      )
      return
    }
    setStep('code')
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createLivingBrowserClient()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    if (error) {
      setPending(false)
      setError(error.message)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: membership } = user
      ? await supabase.from('living_memberships').select('id').eq('user_id', user.id).maybeSingle()
      : { data: null }
    setPending(false)

    if (membership) {
      onClose()
      router.push('/living/home')
      router.refresh()
    } else {
      setStep('choose')
    }
  }

  async function createApartment(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createLivingBrowserClient()
    const { error } = await supabase.rpc('living_create_apartment', {
      p_name: name.trim(),
      p_address: address.trim(),
      p_admin_contact: adminContact.trim(),
      p_flat_split: flatSplit,
      p_flat_count: flatCount,
    })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    onClose()
    router.push('/living/home')
    router.refresh()
  }

  async function joinApartment(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createLivingBrowserClient()
    const { data, error } = await supabase.rpc('living_join_apartment', { p_join_code: joinCode.trim(), p_flat_no: flatNo.trim() })
    setPending(false)
    if (error) {
      setError(error.message)
      return
    }
    onClose()
    const status = (data as { status?: string } | null)?.status
    if (status === 'pending') {
      setLivingFlashClient('notice', 'Request sent — the Admin needs to approve it before you can see your flat.')
    }
    router.push('/living/home')
    router.refresh()
  }

  return (
    <>
      {error && <div className={theme.alert}>{error}</div>}

      {(step === 'contact' || step === 'code') && (
        <>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Account</p>
            <h2 className={styles.title}>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
            <p className={styles.subtitle}>
              {mode === 'login' ? 'Sign in with the email your Apartment has on file.' : "Start with your email — you'll set up or join an Apartment next."}
            </p>
          </header>

          {step === 'contact' ? (
            <form onSubmit={requestCode}>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="drawer-email">
                  Email address
                </label>
                <input
                  id="drawer-email"
                  className={theme.input}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={theme.button} disabled={pending} style={{ width: '100%' }}>
                {pending ? 'Sending…' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <p className={styles.hint}>We sent a code to {email}.</p>
              <div className={theme.field}>
                <label className={theme.label} htmlFor="drawer-code">
                  6-digit code
                </label>
                <input
                  id="drawer-code"
                  className={theme.input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={theme.button} disabled={pending} style={{ width: '100%' }}>
                {pending ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button type="button" className={styles.switchStep} onClick={() => setStep('contact')}>
                ← Use a different email
              </button>
            </form>
          )}
        </>
      )}

      {step === 'choose' && (
        <>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Account</p>
            <h2 className={styles.title}>You&rsquo;re verified</h2>
            <p className={styles.subtitle}>Now create a new Apartment, or join one you already know the code for.</p>
          </header>
          <div className={styles.choiceGrid}>
            <button type="button" className={styles.choiceCard} onClick={() => setStep('create')}>
              <div className={styles.choiceTitle}>Create an Apartment</div>
              <div className={styles.choiceBody}>You&rsquo;re the Admin — set up flats, maintenance, and water billing.</div>
            </button>
            <button type="button" className={styles.choiceCard} onClick={() => setStep('join')}>
              <div className={styles.choiceTitle}>Join with a code</div>
              <div className={styles.choiceBody}>Your Admin shared a join code and your flat number with you.</div>
            </button>
          </div>
        </>
      )}

      {step === 'create' && (
        <>
          <header className={styles.header}>
            <button type="button" className={styles.backLink} onClick={() => setStep('choose')}>
              ← Back
            </button>
            <h2 className={styles.title}>Create an Apartment</h2>
          </header>
          <form onSubmit={createApartment}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="drawer-name">
                Apartment name
              </label>
              <input id="drawer-name" className={theme.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="drawer-address">
                Address
              </label>
              <input id="drawer-address" className={theme.input} value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="drawer-admin-contact">
                Your contact (shown to Owners)
              </label>
              <input
                id="drawer-admin-contact"
                className={theme.input}
                value={adminContact}
                onChange={(e) => setAdminContact(e.target.value)}
                required
              />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="drawer-flat-count">
                Number of flats
              </label>
              <input
                id="drawer-flat-count"
                type="number"
                min={1}
                max={30}
                className={theme.input}
                value={flatCount}
                onChange={(e) => setFlatCount(Number(e.target.value) || 1)}
                required
              />
              <p className={styles.hint}>Up to 30 — you can change this later in Setup.</p>
            </div>
            <div className={theme.field}>
              <span className={theme.label}>Maintenance split</span>
              <div className={styles.radioRow}>
                <label>
                  <input type="radio" name="drawer_flat_split" checked={flatSplit === 'equal'} onChange={() => setFlatSplit('equal')} /> Equal (default)
                </label>
                <label>
                  <input type="radio" name="drawer_flat_split" checked={flatSplit === 'weighted'} onChange={() => setFlatSplit('weighted')} /> Weighted by
                  sq ft
                </label>
              </div>
            </div>
            <button type="submit" className={theme.button} disabled={pending} style={{ width: '100%' }}>
              {pending ? 'Creating…' : 'Create Apartment'}
            </button>
          </form>
        </>
      )}

      {step === 'join' && (
        <>
          <header className={styles.header}>
            <button type="button" className={styles.backLink} onClick={() => setStep('choose')}>
              ← Back
            </button>
            <h2 className={styles.title}>Join with a code</h2>
          </header>
          <form onSubmit={joinApartment}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="drawer-join-code">
                Apartment join code
              </label>
              <input
                id="drawer-join-code"
                className={theme.input}
                placeholder="RVK-4F2K"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
              <p className={styles.hint}>Ask your Admin for this — it&rsquo;s shown on their Setup page.</p>
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="drawer-flat-no">
                Your flat number
              </label>
              <input id="drawer-flat-no" className={theme.input} placeholder="205" value={flatNo} onChange={(e) => setFlatNo(e.target.value)} required />
            </div>
            <button type="submit" className={theme.button} disabled={pending} style={{ width: '100%' }}>
              {pending ? 'Joining…' : 'Join Apartment'}
            </button>
            <p className={styles.hint}>
              If your flat&rsquo;s contact on file matches this account, you&rsquo;re in immediately. Otherwise the Admin approves it first.
            </p>
          </form>
        </>
      )}
    </>
  )
}
