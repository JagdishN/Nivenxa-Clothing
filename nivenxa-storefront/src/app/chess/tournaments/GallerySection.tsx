'use client'

import { useState, type CSSProperties, type MouseEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { photoUrl, type GalleryPhoto } from '@/lib/chess/galleryPhotos'
import PhotoLightbox from './PhotoLightbox'
import styles from './Tournaments.module.scss'

// Blocks the one-click path to saving a photo — not real protection (see
// the route's own doc comment), just enough that a casual visitor can't
// right-click > Save Image As.
function blockContextMenu(event: MouseEvent) {
  event.preventDefault()
}

/** A short preview strip (5 photos by default; 3 on a tournament's page). Click any photo to see it uncropped and use Prev/Next to browse EVERY photo in `photos`, not just the thumbnails shown; "View all" in the header goes to the full /chess/tournaments/gallery grid. */
export default function GallerySection({
  photos,
  limit = 5,
  title = 'Tournament Gallery',
  viewAllHref = '/chess/tournaments/gallery',
  viewAllLabel = 'View all →',
  embedded = false,
  carryParams = [],
}: {
  photos: GalleryPhoto[]
  /** How many photos to preview (the rest are behind the link). */
  limit?: number
  title?: string
  viewAllHref?: string
  viewAllLabel?: string
  /** True when sitting inside another page's own column (the tournament detail page), so it drops its own max-width and side padding. */
  embedded?: boolean
  /** Query parameters of the CURRENT page to copy onto the "view all" link (e.g. the selected results category). */
  carryParams?: string[]
}) {
  const current = useSearchParams()
  const [path, query = ''] = viewAllHref.split('#')[0].split('?')
  const hash = viewAllHref.includes('#') ? `#${viewAllHref.split('#')[1]}` : ''
  const qs = new URLSearchParams(query)
  for (const key of carryParams) {
    const value = current.get(key)
    if (value) qs.set(key, value)
  }
  const href = `${path}${qs.toString() ? `?${qs.toString()}` : ''}${hash}`
  const preview = photos.slice(0, limit)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className={`${styles.gallerySection} ${embedded ? styles.gallerySectionEmbedded : ''}`} aria-labelledby="gallery-heading">
      <div className={styles.galleryHeaderRow}>
        <h2 id="gallery-heading" className={embedded ? styles.detailSectionTitle : styles.groupTitle}>
          {title}
        </h2>
        {preview.length > 0 && (
          <Link href={href} className={styles.gallerySlideViewAll}>
            {viewAllLabel}
          </Link>
        )}
      </div>

      {preview.length === 0 ? (
        <div className={styles.groupEmpty}>
          <p>Photos from our tournaments will appear here soon.</p>
        </div>
      ) : (
        <div className={styles.gallerySlide}>
          {preview.map((photo, index) => (
            <div
              key={photo.photoId}
              className={styles.gallerySlideItem}
              role="button"
              tabIndex={0}
              aria-label={`Open photo: ${photo.alt}`}
              onClick={() => setOpenIndex(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setOpenIndex(index)
                }
              }}
            >
              <div
                className={styles.gallerySlideImage}
                style={{ backgroundImage: `url(${photoUrl(photo.photoId)})`, '--focal-position': photo.focalPosition } as CSSProperties}
                role="img"
                aria-label={photo.alt}
                onContextMenu={blockContextMenu}
              />
            </div>
          ))}
        </div>
      )}

      <PhotoLightbox photos={photos} openIndex={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
    </section>
  )
}
