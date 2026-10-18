export interface GalleryEvent {
  /** Also the folder name under media/chess-tournament-photos/. */
  dateKey: string
  label: string
  /** Links a gallery event back to its tournament detail page — see getPhotosForTournament. */
  tournamentId: string
}

export interface GalleryPhoto {
  /** Opaque id — resolved to a real file by the /api/chess/photos/[photoId] route, never a literal public/ path (see galleryPhotoFiles.ts, server-only). */
  photoId: string
  /** Groups this photo under a GalleryEvent — see galleryEvents below. */
  dateKey: string
  alt: string
  /** Rare — only for a photo that needs its own note beyond the shared event heading (e.g. a press clipping). Most photos don't set this; the event heading covers "what this is." */
  caption?: string
  /** CSS background-position override for this photo's thumbnail crop — defaults to 'center'. Only the full lightbox view ever shows the whole, uncropped photo. */
  focalPosition?: string
}

/** Builds the (cached, access-controlled) URL for a gallery photo — see src/app/api/chess/photos/[photoId]/route.ts. */
export function photoUrl(photoId: string): string {
  return `/api/chess/photos/${photoId}`
}

/**
 * One entry per tournament that has photos — a shared heading/date for its
 * whole set (see gallery/page.tsx), instead of captioning every individual
 * photo with the same repeated event name. Also the link between a
 * tournament's detail page and "its" photos (see getPhotosForTournament).
 */
export const galleryEvents: GalleryEvent[] = [
  {
    dateKey: '2026-10-02',
    // Fallback only — gallery/page.tsx resolves the real heading from this
    // tournament's own title at render time, so this never has to be kept
    // in sync by hand. Only shown if that lookup ever fails.
    label: 'Nivenxa Chess Tournament 2026 — 2 October 2026',
    tournamentId: '18d06431-fa83-4e4d-a9ef-0611b2a8f3bd',
  },
]

/**
 * Nivenxa tournament photos — shown as a short preview slide on
 * /chess/tournaments (see GallerySection.tsx, capped at 5) and in full,
 * grouped by event, on /chess/tournaments/gallery. A plain static list, not
 * Supabase-backed: this is a small, hand-curated set of images an admin
 * adds occasionally, not user-generated content needing a moderation
 * workflow or a database table.
 *
 * To add a photo: drop the file into media/chess-tournament-photos/<date>/
 * (NOT public/ — see galleryPhotoFiles.ts for why), add it to
 * GALLERY_PHOTO_FILES there, run `npx tsx scripts/watermark-tournament-photos.ts
 * <date>`, then add an entry below with a new photoId. For a new event, add
 * a galleryEvents entry too. Newest event first is the display order.
 */
export const galleryPhotos: GalleryPhoto[] = [
  {
    photoId: '2026-10-02-01',
    dateKey: '2026-10-02',
    alt: 'Prize winners of the Nivenxa Chess Tournament 2026 (2 October 2026) on stage with their trophies and certificates.',
  },
  {
    photoId: '2026-10-02-02',
    dateKey: '2026-10-02',
    alt: 'A winner receiving their trophy and certificate from a tournament organiser.',
    // Tall/near-square source (1280x1304) cropped to a 4:3 thumbnail — a
    // centered crop trims into the taller organiser's head. Biased up so
    // both heads stay clear, trading away a little more of the sandals/feet
    // at the bottom instead (the full, uncropped photo is always one click
    // away via the lightbox).
    focalPosition: 'center 25%',
  },
  {
    photoId: '2026-10-02-03',
    dateKey: '2026-10-02',
    alt: 'A winner receiving their trophy from tournament organisers, in front of the Nivenxa State Chess Tournament banner.',
    focalPosition: 'center 22%',
  },
  {
    photoId: '2026-10-02-04',
    dateKey: '2026-10-02',
    alt: 'A winner with their trophy, certificate and family, alongside a tournament organiser.',
    focalPosition: 'center 28%',
  },
  {
    photoId: '2026-10-02-05',
    dateKey: '2026-10-02',
    alt: 'A young player receiving a trophy from two tournament organisers.',
    focalPosition: 'center 28%',
  },
  {
    photoId: '2026-10-02-06',
    dateKey: '2026-10-02',
    alt: 'A young winner receiving her trophy from two tournament organisers.',
    focalPosition: 'center 18%',
  },
  {
    photoId: '2026-10-02-07',
    dateKey: '2026-10-02',
    alt: 'A winner holding their trophy and certificate, flanked by two tournament organisers.',
    // Very tall/narrow source (890x1299) — a 4:3 thumbnail crops away more
    // than half its height. Strongly biased toward the top so all three
    // faces survive; the lightbox still shows the whole photo uncropped.
    focalPosition: 'center 12%',
  },
  {
    photoId: '2026-10-02-08',
    dateKey: '2026-10-02',
    alt: 'A winner receiving their trophy from three tournament organisers.',
    focalPosition: 'center 25%',
  },
  {
    photoId: '2026-10-02-09',
    dateKey: '2026-10-02',
    alt: 'Newspaper coverage headlined "Aasritha wins U-14 Nivenxa chess tournament title," reporting the full results of the Nivenxa Chess Tournament 2026.',
    caption: 'In the news',
  },
]

/** Photos belonging to one tournament, newest galleryPhotos order preserved — powers the "Photos" link on that tournament's own detail page. */
export function getPhotosForTournament(tournamentId: string): GalleryPhoto[] {
  const event = galleryEvents.find((e) => e.tournamentId === tournamentId)
  if (!event) return []
  return galleryPhotos.filter((p) => p.dateKey === event.dateKey)
}
