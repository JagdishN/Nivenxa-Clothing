import Link from 'next/link'
import { redirect } from 'next/navigation'
import { setLivingError, setLivingNotice } from '@/lib/living/flash'
import { createLivingServerClient } from '@/lib/living/supabaseServer'
import OtpForm from '../_auth/OtpForm'
import theme from '../LivingTheme.module.scss'
import styles from '../_auth/AuthForm.module.scss'

async function createApartment(formData: FormData) {
  'use server'
  const supabase = await createLivingServerClient()
  const { error } = await supabase.rpc('living_create_apartment', {
    p_name: String(formData.get('name') ?? '').trim(),
    p_address: String(formData.get('address') ?? '').trim(),
    p_admin_contact: String(formData.get('admin_contact') ?? '').trim(),
    p_flat_split: String(formData.get('flat_split') ?? 'equal'),
    p_flat_count: Number(formData.get('flat_count') ?? 1),
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/signup?tab=create')
  }
  redirect('/living/home')
}

async function joinApartment(formData: FormData) {
  'use server'
  const supabase = await createLivingServerClient()
  const { data, error } = await supabase.rpc('living_join_apartment', {
    p_join_code: String(formData.get('join_code') ?? '').trim(),
    p_flat_no: String(formData.get('flat_no') ?? '').trim(),
  })
  if (error) {
    await setLivingError(error.message)
    redirect('/living/signup?tab=join')
  }
  const status = (data as { status?: string } | null)?.status
  if (status === 'duplicate') {
    // Same email + flat already has a pending invite (living_flat_claims_pending_flat_email_idx).
    // Redirect to the plain signup path, not ?tab=join: if this is the
    // original requester, that route already renders their "Request sent"
    // page (keyed on their own pending claim) — the notice just reinforces
    // it. If it's a different account hitting the same flat, that page has
    // no claim of theirs to show, so the notice is the only explanation.
    await setLivingNotice('An Invitation is pending for Approval.')
    redirect('/living/signup')
  }
  if (status === 'pending') {
    redirect('/living/signup')
  }
  redirect('/living/home')
}

export default async function LivingSignupPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams

  const supabase = await createLivingServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: membership } = await supabase.from('living_memberships').select('id').eq('user_id', user.id).maybeSingle()
    if (membership) redirect('/living/home')

    // If the Admin already put this exact email/phone on a flat (Setup →
    // Flats), there's nothing left to ask — no join code, no approval wait.
    // Only fires when exactly one unclaimed flat across the whole platform
    // matches; anything ambiguous falls through to the ordinary flow below.
    const { data: autoClaim } = await supabase.rpc('living_auto_claim_by_contact')
    if ((autoClaim as { status?: string } | null)?.status === 'attached') redirect('/living/home')

    // Already asked to join a flat, still waiting on the Admin — without
    // this check, a pending requester bounces straight back to the
    // Create/Join tabs on every reload (no membership yet is the only
    // signal this page otherwise has), with nothing telling them their
    // request actually went through.
    const { data: pendingClaim } = await supabase
      .from('living_flat_claims')
      .select('*, flat:living_flats(flat_no), apartment:living_apartments(name)')
      .eq('requested_by', user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .maybeSingle()

    if (pendingClaim) {
      const flat = (pendingClaim as unknown as { flat: { flat_no: string } | null }).flat
      const apartment = (pendingClaim as unknown as { apartment: { name: string } | null }).apartment
      return (
        <div className={styles.shell}>
          <h1 className={styles.title}>Request sent</h1>
          <p className={styles.subtitle}>
            {apartment ? `Your request to join ${apartment.name}` : 'Your request'}
            {flat ? ` as Flat ${flat.flat_no}` : ''} has been sent to the Admin. We&rsquo;ll let you know once it&rsquo;s approved.
          </p>
          <p className={styles.hint}>Nothing else to do here for now — you can close this page and check back later.</p>
        </div>
      )
    }
  }

  if (!user) {
    return (
      <div className={styles.shell}>
        <h1 className={styles.title}>Sign Up</h1>
        <p className={styles.subtitle}>Start with your email or phone — you&rsquo;ll set up or join an Apartment next.</p>
        <OtpForm mode="signup" />
      </div>
    )
  }

  const activeTab = tab === 'join' ? 'join' : 'create'

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Set up your account</h1>
      <p className={styles.subtitle}>You&rsquo;re verified — now create a new Apartment, or join one you already know the code for.</p>

      <div className={styles.tabRow}>
        <Link href="/living/signup?tab=create" className={activeTab === 'create' ? styles.tabActive : styles.tab}>
          Create an Apartment
        </Link>
        <Link href="/living/signup?tab=join" className={activeTab === 'join' ? styles.tabActive : styles.tab}>
          Join with a code
        </Link>
      </div>

      {activeTab === 'create' ? (
        <form action={createApartment}>
          <div className={theme.field}>
            <label className={theme.label} htmlFor="name">
              Apartment name
            </label>
            <input id="name" name="name" className={theme.input} required />
          </div>
          <div className={theme.field}>
            <label className={theme.label} htmlFor="address">
              Address
            </label>
            <input id="address" name="address" className={theme.input} required />
          </div>
          <div className={theme.field}>
            <label className={theme.label} htmlFor="admin_contact">
              Your contact (shown to Owners)
            </label>
            <input id="admin_contact" name="admin_contact" className={theme.input} required />
          </div>
          <div className={theme.field}>
            <label className={theme.label} htmlFor="flat_count">
              Number of flats
            </label>
            <input id="flat_count" name="flat_count" type="number" min={1} max={30} className={theme.input} defaultValue={1} required />
            <p className={styles.hint}>Up to 30 — you can change this later in Setup.</p>
          </div>
          <div className={theme.field}>
            <span className={theme.label}>Maintenance split</span>
            <div className={styles.radioRow}>
              <label>
                <input type="radio" name="flat_split" value="equal" defaultChecked /> Equal (default)
              </label>
              <label>
                <input type="radio" name="flat_split" value="weighted" /> Weighted by sq ft
              </label>
            </div>
            <p className={styles.hint}>You can change this later — it applies from the next month&rsquo;s bill, not past ones.</p>
          </div>
          <button type="submit" className={theme.button} style={{ width: '100%' }}>
            Create Apartment
          </button>
        </form>
      ) : (
        <form action={joinApartment}>
          <div className={theme.field}>
            <label className={theme.label} htmlFor="join_code">
              Apartment join code
            </label>
            <input id="join_code" name="join_code" className={theme.input} placeholder="RVK-4F2K" required />
            <p className={styles.hint}>Ask your Admin for this — it&rsquo;s shown on their setup page.</p>
          </div>
          <div className={theme.field}>
            <label className={theme.label} htmlFor="flat_no">
              Your flat number
            </label>
            <input id="flat_no" name="flat_no" className={theme.input} placeholder="205" required />
          </div>
          <button type="submit" className={theme.button} style={{ width: '100%' }}>
            Join Apartment
          </button>
          <p className={styles.hint}>
            If your flat&rsquo;s contact on file matches this account, you&rsquo;re in immediately. Otherwise the Admin approves it first.
          </p>
        </form>
      )}
    </div>
  )
}
