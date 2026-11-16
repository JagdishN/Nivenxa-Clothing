import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import type { TournamentRow } from '@/lib/chess/tournaments'
import { requireAdminAuth } from '../../../_auth'
import { uploadPaymentQr } from '../../../_qrUpload'
import { listUploadedPhotos, PHOTO_BUCKET } from '@/lib/chess/tournamentPhotos'
import { parseResults } from '@/lib/chess/tournamentResultsInput'
import PhotoUploader from './PhotoUploader'
import ResultsEditor from './ResultsEditor'
import styles from '../../../AdminTournaments.module.scss'

function refreshPublicPages(id: string) {
  revalidatePath('/chess/tournaments')
  revalidatePath('/chess/tournaments/archive')
  revalidatePath('/chess/tournaments/gallery')
  revalidatePath(`/chess/tournaments/${id}`)
  revalidatePath(`/admin/tournaments/${id}/edit`)
}

async function saveResults(id: string, formData: FormData) {
  'use server'
  await requireAdminAuth()
  const parsed = parseResults(String(formData.get('results_json') ?? '[]'))
  if ('error' in parsed) redirect(`/admin/tournaments/${id}/edit?error=` + encodeURIComponent(parsed.error) + '#results')
  const { error } = await getSupabaseAdmin()
    .from('tournaments')
    .update({ results: parsed.results.length ? parsed.results : null })
    .eq('id', id)
  if (error) redirect(`/admin/tournaments/${id}/edit?error=` + encodeURIComponent(`Could not save the results: ${error.message}`) + '#results')
  refreshPublicPages(id)
  redirect(`/admin/tournaments/${id}/edit?saved=results#results`)
}

async function deletePhoto(id: string, formData: FormData) {
  'use server'
  await requireAdminAuth()
  const photoId = String(formData.get('photo_id') ?? '')
  const supabase = getSupabaseAdmin()
  const { data: row } = await supabase.from('tournament_photos').select('storage_path').eq('id', photoId).eq('tournament_id', id).maybeSingle()
  if (row) {
    await supabase.storage.from(PHOTO_BUCKET).remove([(row as { storage_path: string }).storage_path])
    await supabase.from('tournament_photos').delete().eq('id', photoId).eq('tournament_id', id)
  }
  refreshPublicPages(id)
  redirect(`/admin/tournaments/${id}/edit?saved=photos#photos`)
}

async function updatePhoto(id: string, formData: FormData) {
  'use server'
  await requireAdminAuth()
  const photoId = String(formData.get('photo_id') ?? '')
  const alt = String(formData.get('alt') ?? '').trim()
  const caption = String(formData.get('caption') ?? '').trim()
  await getSupabaseAdmin()
    .from('tournament_photos')
    .update({ alt: alt || 'Tournament photo', caption: caption || null })
    .eq('id', photoId)
    .eq('tournament_id', id)
  refreshPublicPages(id)
  redirect(`/admin/tournaments/${id}/edit?saved=photos#photos`)
}

async function movePhoto(id: string, formData: FormData) {
  'use server'
  await requireAdminAuth()
  const photoId = String(formData.get('photo_id') ?? '')
  const direction = String(formData.get('direction')) === 'up' ? -1 : 1
  const photos = await listUploadedPhotos(id)
  const index = photos.findIndex((p) => p.id === photoId)
  const other = photos[index + direction]
  if (index >= 0 && other) {
    // Re-number the whole list so the swap is exact even when two photos share a sort_order.
    const order = photos.map((p) => p.id)
    ;[order[index], order[index + direction]] = [order[index + direction], order[index]]
    const supabase = getSupabaseAdmin()
    await Promise.all(order.map((pid, n) => supabase.from('tournament_photos').update({ sort_order: n + 1 }).eq('id', pid)))
  }
  refreshPublicPages(id)
  redirect(`/admin/tournaments/${id}/edit?saved=photos#photos`)
}

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
    entry_fee: formData.get('entry_fee') ? String(formData.get('entry_fee')).trim() : null,
    categories: formData.get('categories') ? String(formData.get('categories')).trim() : null,
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
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { id } = await params
  const { error: errorParam, saved } = await searchParams

  // Auth is enforced once, above, by (protected)/layout.tsx.
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle()
  if (error) console.error('EditTournamentPage: failed to load tournament —', error.message)
  if (!data) notFound()
  const t = data as TournamentRow

  const boundUpdate = updateTournament.bind(null, id)
  const boundResults = saveResults.bind(null, id)
  const boundDelete = deletePhoto.bind(null, id)
  const boundUpdatePhoto = updatePhoto.bind(null, id)
  const boundMove = movePhoto.bind(null, id)
  const photos = await listUploadedPhotos(id)

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Edit — {t.name}</h1>
        <Link href="/admin/tournaments" className={styles.secondaryBtn}>
          Back to list
        </Link>
      </div>

      <nav className={styles.headerRow} aria-label="Jump to section">
        <a href="#results" className={styles.secondaryBtn}>
          Jump to Results ↓
        </a>
        <a href="#photos" className={styles.secondaryBtn}>
          Jump to Photos ↓
        </a>
      </nav>

      {errorParam && <p className={styles.error}>{errorParam}</p>}
      {saved && (
        <p className={styles.notice} role="status">
          {saved === 'results' ? 'Results saved. They are now on the tournament page.' : 'Photos updated.'}
        </p>
      )}

      <section className={styles.section}>
        <form action={boundUpdate} className={styles.form} autoComplete="off">
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
            Entry fee
            <input type="text" name="entry_fee" placeholder="₹650" defaultValue={t.entry_fee ?? ''} className={styles.input} />
          </label>
          <label className={styles.field}>
            Categories (comma-separated)
            <input type="text" name="categories" placeholder="U7, U9, U11, U14" defaultValue={t.categories ?? ''} className={styles.input} />
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

      <section className={styles.section} id="results">
        <h2 className={styles.subheading}>Results</h2>
        <p className={styles.mutedNote}>Enter the final standings for each category, in finishing order. Saving replaces the results shown on the public tournament page.</p>
        <form action={boundResults} className={styles.form}>
          <ResultsEditor initial={t.results ?? []} />
          <button type="submit" className={styles.primaryBtn}>
            Save results
          </button>
        </form>
      </section>

      <section className={styles.section} id="photos">
        <h2 className={styles.subheading}>Photos</h2>
        <p className={styles.mutedNote}>
          Photos are saved under this tournament&apos;s start date ({String(t.start_date).slice(0, 10)}) and appear in the public gallery and on its results page.
        </p>
        <PhotoUploader tournamentId={t.id} />
        {photos.length === 0 ? (
          <p className={styles.mutedNote}>No photos uploaded yet.</p>
        ) : (
          <ul className={styles.photoList}>
            {photos.map((p, index) => (
              <li key={p.id} className={styles.photoItem}>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an access-controlled route */}
                <img src={`/api/chess/photos/${p.id}`} alt={p.alt} className={styles.photoThumb} />
                <div className={styles.photoBody}>
                  <form action={boundUpdatePhoto} className={styles.photoForm}>
                    <input type="hidden" name="photo_id" value={p.id} />
                    <label className={styles.field}>
                      Description (for screen readers)
                      <input type="text" name="alt" defaultValue={p.alt} className={styles.input} />
                    </label>
                    <label className={styles.field}>
                      Caption (optional, shown with the photo)
                      <input type="text" name="caption" defaultValue={p.caption ?? ''} className={styles.input} />
                    </label>
                    <button type="submit" className={styles.secondaryBtn}>
                      Save text
                    </button>
                  </form>
                  <div className={styles.photoActions}>
                    <form action={boundMove}>
                      <input type="hidden" name="photo_id" value={p.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className={styles.secondaryBtn} disabled={index === 0} aria-label={`Move photo ${index + 1} earlier`}>
                        ↑ Earlier
                      </button>
                    </form>
                    <form action={boundMove}>
                      <input type="hidden" name="photo_id" value={p.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" className={styles.secondaryBtn} disabled={index === photos.length - 1} aria-label={`Move photo ${index + 1} later`}>
                        ↓ Later
                      </button>
                    </form>
                    <form action={boundDelete}>
                      <input type="hidden" name="photo_id" value={p.id} />
                      <button type="submit" className={styles.dangerBtn}>
                        Delete photo
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
