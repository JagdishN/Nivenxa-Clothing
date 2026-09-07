import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import type { TournamentRow } from '@/lib/chess/tournaments'
import { ADMIN_TOURNAMENTS_COOKIE, hashAdminPassword, isAdminAuthenticated, requireAdminAuth } from './_auth'
import { uploadPaymentQr } from './_qrUpload'
import styles from './AdminTournaments.module.scss'

// See _auth.ts for the shared-password-gate caveats — same gate, same limits.

async function authenticate(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const expected = process.env.ADMIN_TOURNAMENTS_PASSWORD
  if (!expected) redirect('/admin/tournaments?error=' + encodeURIComponent('ADMIN_TOURNAMENTS_PASSWORD is not set on the server.'))
  if (password !== expected) redirect('/admin/tournaments?error=' + encodeURIComponent('Incorrect password.'))

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_TOURNAMENTS_COOKIE, hashAdminPassword(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin/tournaments',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  redirect('/admin/tournaments')
}

async function logout() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_TOURNAMENTS_COOKIE)
  redirect('/admin/tournaments')
}

const REQUIRED_FIELDS = ['name', 'country', 'start_date', 'location_name', 'time_control', 'format', 'organizer_name'] as const

async function addTournament(formData: FormData) {
  'use server'
  await requireAdminAuth()

  for (const field of REQUIRED_FIELDS) {
    if (!String(formData.get(field) ?? '').trim()) {
      redirect('/admin/tournaments?error=' + encodeURIComponent(`Missing required field: ${field}`))
    }
  }

  let paymentQrUrl: string | null = null
  const qrFile = formData.get('payment_qr_file')
  if (qrFile instanceof File && qrFile.size > 0) {
    try {
      paymentQrUrl = await uploadPaymentQr(qrFile)
    } catch (err) {
      redirect('/admin/tournaments?error=' + encodeURIComponent(err instanceof Error ? err.message : 'QR upload failed'))
    }
  }

  const payload = {
    name: String(formData.get('name')).trim(),
    country: String(formData.get('country')).trim(),
    tournament_type: String(formData.get('tournament_type') ?? 'Local'),
    start_date: String(formData.get('start_date')),
    end_date: formData.get('end_date') ? String(formData.get('end_date')) : null,
    location_name: String(formData.get('location_name')).trim(),
    latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
    longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
    fide_rated: formData.get('fide_rated') === 'on',
    time_control: String(formData.get('time_control')).trim(),
    format: String(formData.get('format')).trim(),
    top_players: formData.get('top_players') ? String(formData.get('top_players')).trim() : null,
    prize_pool: formData.get('prize_pool') ? String(formData.get('prize_pool')).trim() : null,
    organizer_name: String(formData.get('organizer_name')).trim(),
    organizer_verified: formData.get('organizer_verified') === 'on',
    register_url: formData.get('register_url') ? String(formData.get('register_url')).trim() : null,
    organizer_whatsapp: formData.get('organizer_whatsapp') ? String(formData.get('organizer_whatsapp')).trim() : null,
    payment_qr_url: paymentQrUrl,
    payment_qr_source: formData.get('payment_qr_source') ? String(formData.get('payment_qr_source')).trim() : null,
    payment_note: formData.get('payment_note') ? String(formData.get('payment_note')).trim() : null,
    source: 'manual' as const,
    verified: formData.get('verified') === 'on',
    is_live: formData.get('is_live') === 'on',
    is_nivenxa_organized: formData.get('is_nivenxa_organized') === 'on',
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('tournaments').insert(payload)
  if (error) redirect('/admin/tournaments?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin/tournaments')
  revalidatePath('/chess/tournaments')
  redirect('/admin/tournaments')
}

async function toggleVerified(formData: FormData) {
  'use server'
  await requireAdminAuth()

  const id = String(formData.get('id'))
  const nextVerified = formData.get('next_verified') === 'true'
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('tournaments').update({ verified: nextVerified }).eq('id', id)
  if (error) redirect('/admin/tournaments?error=' + encodeURIComponent(error.message))

  revalidatePath('/admin/tournaments')
  revalidatePath('/chess/tournaments')
}

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const authed = isAdminAuthenticated(cookieStore.get(ADMIN_TOURNAMENTS_COOKIE)?.value)

  if (!authed) {
    return (
      <main className={styles.page}>
        <div className={styles.loginCard}>
          <h1 className={styles.heading}>Admin — Tournaments</h1>
          {params.error && <p className={styles.error}>{params.error}</p>}
          <form action={authenticate} className={styles.loginForm}>
            <input type="password" name="password" placeholder="Password" required className={styles.input} />
            <button type="submit" className={styles.primaryBtn}>
              Sign in
            </button>
          </form>
        </div>
      </main>
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false })
  if (error) console.error('AdminTournamentsPage: failed to load tournaments —', error.message)
  const tournaments = (data ?? []) as TournamentRow[]

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Admin — Tournaments</h1>
        <form action={logout}>
          <button type="submit" className={styles.secondaryBtn}>
            Sign out
          </button>
        </form>
      </div>

      {params.error && <p className={styles.error}>{params.error}</p>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add tournament</h2>
        {/*
          autoComplete="off" — verified live that without it, Chrome restores
          checkbox states by field `name` after the Server Action's
          redirect() navigates back to this same route, independent of
          anything React does: add a tournament with "Live now" checked, add
          a second one without touching that checkbox, and it silently
          carried "Live now" over onto the second entry. A `key` prop meant
          to force a remount did NOT fix this — it's the browser's own
          autofill layer, not stale React/DOM state.
        */}
        <form action={addTournament} className={styles.form} autoComplete="off" encType="multipart/form-data">
          <label className={styles.field}>
            Name *
            <input type="text" name="name" required className={styles.input} />
          </label>
          <label className={styles.field}>
            Country *
            <input type="text" name="country" required className={styles.input} />
          </label>
          <label className={styles.field}>
            Tournament type *
            <select name="tournament_type" defaultValue="Local" className={styles.input}>
              <option value="International">International</option>
              <option value="National">National</option>
              <option value="Local">Local</option>
              <option value="Academy">Academy</option>
            </select>
          </label>
          <label className={styles.field}>
            Start date *
            <input type="date" name="start_date" required className={styles.input} />
          </label>
          <label className={styles.field}>
            End date
            <input type="date" name="end_date" className={styles.input} />
          </label>
          <label className={styles.field}>
            Location name *
            <input type="text" name="location_name" required className={styles.input} />
          </label>
          <label className={styles.field}>
            Latitude
            <input type="number" step="any" name="latitude" className={styles.input} />
          </label>
          <label className={styles.field}>
            Longitude
            <input type="number" step="any" name="longitude" className={styles.input} />
          </label>
          <label className={styles.field}>
            Time control *
            <input type="text" name="time_control" required placeholder="Classical, Blitz, Rapid..." className={styles.input} />
          </label>
          <label className={styles.field}>
            Format *
            <input type="text" name="format" required placeholder="Swiss, Round Robin..." className={styles.input} />
          </label>
          <label className={styles.field}>
            Top players (comma-separated)
            <input type="text" name="top_players" className={styles.input} />
          </label>
          <label className={styles.field}>
            Prize pool
            <input type="text" name="prize_pool" className={styles.input} />
          </label>
          <label className={styles.field}>
            Organizer name *
            <input type="text" name="organizer_name" required className={styles.input} />
          </label>
          <label className={styles.field}>
            Register URL
            <input type="url" name="register_url" className={styles.input} />
          </label>
          <label className={styles.field}>
            Organizer WhatsApp
            <input type="text" name="organizer_whatsapp" placeholder="+91XXXXXXXXXX" className={styles.input} />
          </label>
          <label className={styles.field}>
            Payment QR image
            <input type="file" name="payment_qr_file" accept="image/*" className={styles.input} />
          </label>
          <label className={styles.field}>
            Payment QR source note (internal)
            <input type="text" name="payment_qr_source" placeholder="Confirmed via WhatsApp on..." className={styles.input} />
          </label>
          <label className={styles.field}>
            Payment note (shown publicly)
            <input type="text" name="payment_note" placeholder="Pay entry fee via UPI, mention your name..." className={styles.input} />
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="fide_rated" /> FIDE rated
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="organizer_verified" /> Organizer verified
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="is_live" /> Live now
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="verified" /> Verified (shows on public page)
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="is_nivenxa_organized" /> Nivenxa-organized (highlighted on /chess)
          </label>
          <button type="submit" className={styles.primaryBtn}>
            Add tournament
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>All tournaments ({tournaments.length})</h2>
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Live</th>
                <th>Verified</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.tournament_type}</td>
                  <td>
                    {t.start_date}
                    {t.end_date ? ` – ${t.end_date}` : ''}
                  </td>
                  <td>{t.is_live ? 'Yes' : 'No'}</td>
                  <td>
                    <span className={t.verified ? styles.verifiedYes : styles.verifiedNo}>{t.verified ? 'Verified' : 'Unverified'}</span>
                  </td>
                  <td>
                    <form action={toggleVerified}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="next_verified" value={String(!t.verified)} />
                      <button type="submit" className={styles.toggleBtn}>
                        {t.verified ? 'Unverify' : 'Verify'}
                      </button>
                    </form>
                  </td>
                  <td>
                    <Link href={`/admin/tournaments/${t.id}/edit`} className={styles.toggleBtn}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>
                    No tournaments yet — add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
