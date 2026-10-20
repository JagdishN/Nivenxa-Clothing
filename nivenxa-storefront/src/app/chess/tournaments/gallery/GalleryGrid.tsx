'use client'

import { useState, type CSSProperties, type MouseEvent } from 'react'
import type { GalleryEvent, GalleryPhoto } from '@/lib/chess/galleryPhotos'
import { photoUrl } from '@/lib/chess/galleryPhotos'
import PhotoLightbox from '../PhotoLightbox'
import styles from '../Tournaments.module.scss'

// Blocks the one-click path to saving a photo — not real protection (see
// the API route's own doc comment), just enough that a casual visitor can't
// right-click > Save Image As.
function blockContextMenu(event: MouseEvent) {
  event.preventDefault()
}

/**
 * The interactive half of the gallery page (grid + lightbox state) — split
 * out from page.tsx so that page.tsx can stay a server component and
 * resolve each event's heading from the tournament's own title (see
 * page.tsx), instead of this file hand-maintaining a second copy of it that
 * can drift out of sync with the archive/detail pages' title.
 */
export default function GalleryGrid({ events, photos }: { events: GalleryEvent[]; photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <section className={styles.groups}>
        {photos.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.groupTitle}>No photos yet</h2>
            <p className={styles.emptyText}>Photos from our tournaments will appear here once they&rsquo;re added.</p>
          </div>
        ) : (
          // One heading per event, not a per-photo caption repeating the
          // same event name on every tile — the whole set shares one
          // date/title instead.
          events.map((event) => {
            const eventPhotos = photos.filter((p) => p.dateKey === event.dateKey)
            if (eventPhotos.length === 0) return null

            return (
              <div key={event.dateKey} className={styles.galleryEventGroup}>
                <h2 id={`event-${event.dateKey}`} className={styles.galleryEventHeading}>
                  {event.label}
                </h2>
                <div className={styles.galleryGrid}>
                  {eventPhotos.map((photo) => {
                    const globalIndex = photos.indexOf(photo)
                    return (
                      <figure
                        key={photo.photoId}
                        className={styles.galleryGridItem}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open photo: ${photo.alt}`}
                        onClick={() => setOpenIndex(globalIndex)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setOpenIndex(globalIndex)
                        }}
                      >
                        <div
                          className={styles.galleryGridImage}
                          style={{ backgroundImage: `url(${photoUrl(photo.photoId)})`, '--focal-position': photo.focalPosition } as CSSProperties}
                          role="img"
                          aria-label={photo.alt}
                          onContextMenu={blockContextMenu}
                        />
                        {photo.caption && <figcaption className={styles.galleryCaption}>{photo.caption}</figcaption>}
                      </figure>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </section>

      <PhotoLightbox photos={photos} openIndex={openIndex} onClose={() => setOpenIndex(null)} onNavigate={setOpenIndex} />
    </>
  )
}
