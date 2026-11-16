import { getSupabaseAdmin } from '@/lib/chess/supabase'
import { galleryEvents as staticEvents, galleryPhotos as staticPhotos, type GalleryEvent, type GalleryPhoto } from '@/lib/chess/galleryPhotos'

// Server-only. Admin-uploaded photos live in the `tournament_photos` table (see
// supabase/migrations/20261116090000_tournament_photos.sql) and are merged with the photos listed in code.

export const PHOTO_BUCKET = 'tournament-photos'

export interface TournamentPhotoRow {
  id: string
  tournament_id: string
  date_key: string
  storage_path: string
  alt: string
  caption: string | null
  sort_order: number
  created_at: string
}

/** Every uploaded photo, oldest first within a tournament. Returns [] when the table does not exist yet (migration not applied) or Supabase is unavailable. */
export async function listUploadedPhotos(tournamentId?: string): Promise<TournamentPhotoRow[]> {
  try {
    let query = getSupabaseAdmin().from('tournament_photos').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    if (tournamentId) query = query.eq('tournament_id', tournamentId)
    const { data, error } = await query
    if (error) {
      console.error('listUploadedPhotos:', error.message)
      return []
    }
    return (data ?? []) as TournamentPhotoRow[]
  } catch (err) {
    console.error('listUploadedPhotos:', err instanceof Error ? err.message : err)
    return []
  }
}

function toGalleryPhoto(row: TournamentPhotoRow): GalleryPhoto {
  return { photoId: row.id, dateKey: row.date_key, alt: row.alt || 'Tournament photo', ...(row.caption ? { caption: row.caption } : {}) }
}

/** Photos for the gallery and the listing preview: code-listed photos plus uploaded ones, newest event first. */
export async function getAllGalleryData(): Promise<{ events: GalleryEvent[]; photos: GalleryPhoto[] }> {
  const rows = await listUploadedPhotos()
  const events = [...staticEvents]
  for (const row of rows) {
    if (!events.some((e) => e.tournamentId === row.tournament_id)) {
      events.push({ dateKey: row.date_key, label: `Tournament photos — ${row.date_key}`, tournamentId: row.tournament_id })
    }
  }
  events.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
  const photos = [...staticPhotos, ...rows.map(toGalleryPhoto)]
  photos.sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0))
  return { events, photos }
}

/** One tournament's photos (code-listed + uploaded) for its detail page. */
export async function getPhotosForTournamentWithUploads(tournamentId: string, staticForTournament: GalleryPhoto[]): Promise<GalleryPhoto[]> {
  const rows = await listUploadedPhotos(tournamentId)
  return [...staticForTournament, ...rows.map(toGalleryPhoto)]
}
