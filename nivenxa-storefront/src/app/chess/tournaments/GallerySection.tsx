'use client'

import { useState, type CSSProperties, type MouseEvent } from 'react'
import Link from 'next/link'
import { photoUrl, type GalleryPhoto } from '@/lib/chess/galleryPhotos'
import PhotoLightbox from './PhotoLightbox'
import styles from './Tournaments.module.scss'

// Blocks the one-click path to saving a photo — not real protection (see
// the route's own doc comment), just enough that a casual visitor can't
// right-click > Save Image As.
function blockContextMenu(event: MouseEvent) {
  event.preventDefault()
}

/** The Tournaments page's own preview slide — always capped at 5 photos. Click any photo to see it uncropped; "View all" in the header goes to the full /chess/tournaments/gallery grid. */
export default function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const preview = photos.slice(0, 5)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className={styles.gallerySection} aria-labelledby="gallery-heading">
      <div className={styles.galleryHeaderRow}>
        <h2 id="gallery-heading" className={styles.groupTitle}>
          Tournament Gallery
        </h2>
        {preview.length > 0 && (
          <Link href="/chess/tournaments/gallery" className={styles.gallerySlideViewAll}>
            View all →
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
                if (e.key === 'Enter' || e.key === ' ') setOpenIndex(index)
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

      <PhotoLightbox photos={preview} openIndex={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
    </section>
  )
}
