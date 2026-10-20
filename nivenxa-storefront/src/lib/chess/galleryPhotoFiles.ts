import { join } from 'node:path'

/**
 * Server-only. Maps an opaque photoId (what galleryPhotos.ts and the public
 * API route deal in) to the real file on disk. Never import this from a
 * 'use client' component — it would either fail to bundle (node:path) or,
 * worse, ship the real directory layout to the browser, defeating the whole
 * point of routing photo requests through /api/chess/photos/[photoId]
 * instead of a literal /images/... path under public/.
 *
 * The files themselves live outside public/ entirely (media/, a sibling of
 * public/ and src/) — anything under public/ is served directly by Next.js
 * regardless of what this map says, so keeping them there would let anyone
 * bypass the route (and its cache headers, referer check, etc.) by just
 * guessing the static path.
 */
// Serves the watermarked copies (see scripts/watermark-tournament-photos.ts),
// never the pristine source files sitting one level up — a lifted copy
// should read as Nivenxa's even after someone works around the other
// deterrents (no right-click, opaque URL, etc.).
const PHOTOS_DIR = join(process.cwd(), 'media', 'chess-tournament-photos', '2026-10-02', 'watermarked')

export const GALLERY_PHOTO_FILES: Record<string, string> = {
  '2026-10-02-01': join(PHOTOS_DIR, '01.webp'),
  '2026-10-02-02': join(PHOTOS_DIR, '02.webp'),
  '2026-10-02-03': join(PHOTOS_DIR, '03.webp'),
  '2026-10-02-04': join(PHOTOS_DIR, '04.webp'),
  '2026-10-02-05': join(PHOTOS_DIR, '05.webp'),
  '2026-10-02-06': join(PHOTOS_DIR, '06.webp'),
  '2026-10-02-07': join(PHOTOS_DIR, '07.webp'),
  '2026-10-02-08': join(PHOTOS_DIR, '08.webp'),
  '2026-10-02-09': join(PHOTOS_DIR, '09.webp'),
}
