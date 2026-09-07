import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import type { TournamentRow } from '@/lib/chess/tournaments'
import { ADMIN_TOURNAMENTS_COOKIE, isAdminAuthenticated, requireAdminAuth } from '../../_auth'
import { uploadPaymentQr } from '../../_qrUpload'
import styles from '../../AdminTournaments.module.scss'

async function updateTournament(id: string, formData: FormData) {
  'use server'
  await requireAdminAuth()

  const supabase = getSupabaseAdmin()

  let paymentQrUrl: string | null | undefined = undefined // undefined = leave column untouched
  if (formData.get('remove_payment_qr') === 'on') {
    paymentQrUrl = null
  } else {
    const qrFile = formData.get('payment_qr_file')
    if (qrFile instanceof File && qrFile.size > 0) {
      try {
        paymentQrUrl = await uploadPaymentQr(qrFile)
      } catch (err) {
        redirect(`/admin/tournaments/${id}/edit?error=` + encodeURIComponent(err instanceof Error ? err.message : 'QR upload failed'))
      }
    }
  }

  const payload: Record<string, unknown> = {
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
    payment_qr_source: formData.get('payment_qr_source') ? String(formData.get('payment_qr_source')).trim() : null,
    payment_note: formData.get('payment_note') ? String(formData.get('payment_note')).trim() : null,
    verified: formData.get('verified') === 'on',
    is_live: formData.get('is_live') === 'on',
    is_nivenxa_organized: formData.get('is_nivenxa_organized') === 'on',
  }
  if (paymentQrUrl !== undefined) payload.payment_qr_url = paymentQrUrl

  const { error } = await supabase.from('tournaments').update(payload).eq('id', id)
  if (error) redirect(`/admin/tournaments/${id}/edit?error=` + encodeURIComponent(error.message))

  revalidatePath('/admin/tournaments')
  revalidatePath(`/admin/tournaments/${id}/edit`)
  revalidatePath('/chess/tournaments')
  redirect('/admin/tournaments')
}

export default async function EditTournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error: errorParam } = await searchParams
  const cookieStore = await cookies()
  if (!isAdminAuthenticated(cookieStore.get(ADMIN_TOURNAMENTS_COOKIE)?.value)) redirect('/admin/tournaments')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle()
  if (error) console.error('EditTournamentPage: failed to load tournament —', error.message)
  if (!data) notFound()
  const t = data as TournamentRow

  const boundUpdate = updateTournament.bind(null, id)

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Edit — {t.name}</h1>
        <Link href="/admin/tournaments" className={styles.secondaryBtn}>
          Back to list
        </Link>
      </div>

      {errorParam && <p className={styles.error}>{errorParam}</p>}

      <section className={styles.section}>
        <form action={boundUpdate} className={styles.form} autoComplete="off" encType="multipart/form-data">
          <label className={styles.field}>
            Name *
            <input type="text" name="name" required defaultValue={t.name} className={styles.input} />
          </label>
          <label className={styles.field}>
            Country *
            <input type="text" name="country" required defaultValue={t.country} className={styles.input} />
          </label>
          <label className={styles.field}>
            Tournament type *
            <select name="tournament_type" defaultValue={t.tournament_type} className={styles.input}>
              <option value="International">International</option>
              <option value="National">National</option>
              <option value="Local">Local</option>
              <option value="Academy">Academy</option>
            </select>
          </label>
          <label className={styles.field}>
            Start date *
            <input type="date" name="start_date" required defaultValue={t.start_date} className={styles.input} />
          </label>
          <label className={styles.field}>
            End date
            <input type="date" name="end_date" defaultValue={t.end_date ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Location name *
            <input type="text" name="location_name" required defaultValue={t.location_name} className={styles.input} />
          </label>
          <label className={styles.field}>
            Latitude
            <input type="number" step="any" name="latitude" defaultValue={t.latitude ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Longitude
            <input type="number" step="any" name="longitude" defaultValue={t.longitude ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Time control *
            <input type="text" name="time_control" required defaultValue={t.time_control} className={styles.input} />
          </label>
          <label className={styles.field}>
            Format *
            <input type="text" name="format" required defaultValue={t.format} className={styles.input} />
          </label>
          <label className={styles.field}>
            Top players (comma-separated)
            <input type="text" name="top_players" defaultValue={t.top_players ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Prize pool
            <input type="text" name="prize_pool" defaultValue={t.prize_pool ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Organizer name *
            <input type="text" name="organizer_name" required defaultValue={t.organizer_name} className={styles.input} />
          </label>
          <label className={styles.field}>
            Register URL
            <input type="url" name="register_url" defaultValue={t.register_url ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Organizer WhatsApp
            <input
              type="text"
              name="organizer_whatsapp"
              placeholder="+91XXXXXXXXXX"
              defaultValue={t.organizer_whatsapp ?? ''}
              className={styles.input}
            />
          </label>

          <div className={styles.field}>
            Payment QR image
            {t.payment_qr_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, admin-only preview */}
                <img src={t.payment_qr_url} alt="Current payment QR" className={styles.qrPreview} />
                <label className={styles.checkboxField}>
                  <input type="checkbox" name="remove_payment_qr" /> Remove current QR
                </label>
              </>
            ) : (
              <span className={styles.mutedNote}>No QR uploaded yet</span>
            )}
            <input type="file" name="payment_qr_file" accept="image/*" className={styles.input} />
          </div>

          <label className={styles.field}>
            Payment QR source note (internal)
            <input type="text" name="payment_qr_source" defaultValue={t.payment_qr_source ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Payment note (shown publicly)
            <input type="text" name="payment_note" defaultValue={t.payment_note ?? ''} className={styles.input} />
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="fide_rated" defaultChecked={t.fide_rated} /> FIDE rated
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="organizer_verified" defaultChecked={t.organizer_verified} /> Organizer verified
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="is_live" defaultChecked={t.is_live} /> Live now
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="verified" defaultChecked={t.verified} /> Verified (shows on public page)
          </label>
          <label className={styles.checkboxField}>
            <input type="checkbox" name="is_nivenxa_organized" defaultChecked={t.is_nivenxa_organized} /> Nivenxa-organized (highlighted on /chess)
          </label>
          <button type="submit" className={styles.primaryBtn}>
            Save changes
          </button>
        </form>
      </section>
    </main>
  )
}
