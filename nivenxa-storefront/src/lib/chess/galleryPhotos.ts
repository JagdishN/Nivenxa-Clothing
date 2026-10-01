export interface GalleryPhoto {
  src: string
  alt: string
  caption?: string
}

/**
 * Nivenxa tournament photos — shown as a short preview slide on
 * /chess/tournaments (see GallerySection.tsx, capped at 5) and in full on
 * /chess/tournaments/gallery. A plain static list, not Supabase-backed: this
 * is a small, hand-curated set of images an admin adds occasionally, not
 * user-generated content needing a moderation workflow or a database table.
 *
 * To add a photo: drop the image file into
 * public/images/Chess/gallery/ and add an entry below pointing at it, e.g.
 *   { src: '/images/Chess/gallery/2026-10-tournament-award.jpg', alt: '...', caption: '...' }
 * Newest first is the display order — most recent tournament's photos lead.
 */
export const galleryPhotos: GalleryPhoto[] = []
