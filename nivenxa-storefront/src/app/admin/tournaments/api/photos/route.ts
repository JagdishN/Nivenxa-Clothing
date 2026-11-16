import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/chess/supabase'
import { watermarkPhoto } from '@/lib/chess/watermark'
import { PHOTO_BUCKET } from '@/lib/chess/tournamentPhotos'
import { ADMIN_TOURNAMENTS_COOKIE, isAdminAuthenticated } from '../../_auth'

// Lives under /admin/tournaments on purpose: the admin cookie is scoped to that path, so it is only sent here.
export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 5.5 * 1024 * 1024 // Netlify functions accept about 6 MB per request; the browser shrinks photos well below this first.

/** Upload ONE photo: validates it, bakes in the watermark, stores it under <tournament id>/<tournament date>/ and records it. */
export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request.cookies.get(ADMIN_TOURNAMENTS_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'The upload could not be read (it may be too large).' }, { status: 413 })
  }
  const tournamentId = String(form.get('tournamentId') ?? '')
  const file = form.get('file')
  if (!tournamentId || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a tournament photo to upload.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: `${file.name} is not an image.` }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB after shrinking).` }, { status: 413 })

  const supabase = getSupabaseAdmin()
  const { data: tournament } = await supabase.from('tournaments').select('id, name, start_date').eq('id', tournamentId).maybeSingle()
  if (!tournament) return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 })

  let output: Buffer
  try {
    output = await watermarkPhoto(Buffer.from(await file.arrayBuffer()))
  } catch {
    return NextResponse.json({ error: `${file.name} could not be read as an image.` }, { status: 400 })
  }

  const dateKey = String(tournament.start_date).slice(0, 10)
  const path = `${tournament.id}/${dateKey}/${crypto.randomUUID()}.webp`
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, output, { contentType: 'image/webp', upsert: false })
  if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })

  const { data: last } = await supabase.from('tournament_photos').select('sort_order').eq('tournament_id', tournament.id).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data: row, error: insertError } = await supabase
    .from('tournament_photos')
    .insert({
      tournament_id: tournament.id,
      date_key: dateKey,
      storage_path: path,
      alt: `Photo from ${tournament.name} (${dateKey})`,
      sort_order: ((last as { sort_order: number } | null)?.sort_order ?? 0) + 1,
    })
    .select('id')
    .single()
  if (insertError || !row) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]) // do not leave an orphaned file behind
    return NextResponse.json({ error: `Could not save the photo: ${insertError?.message ?? 'unknown error'}. Has the tournament_photos migration been applied?` }, { status: 500 })
  }

  revalidatePath('/chess/tournaments')
  revalidatePath('/chess/tournaments/gallery')
  revalidatePath(`/chess/tournaments/${tournament.id}`)
  revalidatePath(`/admin/tournaments/${tournament.id}/edit`)
  return NextResponse.json({ id: row.id })
}
