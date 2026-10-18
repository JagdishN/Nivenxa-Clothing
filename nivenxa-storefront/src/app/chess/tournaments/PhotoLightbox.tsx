'use client'

import { useEffect, useCallback, useState, type MouseEvent } from 'react'
import { photoUrl, type GalleryPhoto } from '@/lib/chess/galleryPhotos'
import styles from './Tournaments.module.scss'

function blockContextMenu(event: MouseEvent) {
  event.preventDefault()
}

/**
 * A thumbnail always crops (see GallerySection.tsx/gallery/page.tsx's fixed
 * aspect-ratio tiles) — this is the "see the whole photograph" escape
 * hatch, opened by clicking any tile. Shows the photo uncropped
 * (background-size: contain, not cover) with Prev/Next between every photo
 * in the same set, not just the one that was clicked.
 */
export default function PhotoLightbox({
  photos,
  openIndex,
  onClose,
  onNavigate,
}: {
  photos: GalleryPhoto[]
  openIndex: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const close = useCallback(() => onClose(), [onClose])
  // Lets a dense image (the newspaper clipping, mainly) be read at full
  // resolution instead of staying capped to "fits the screen" — plain
  // click-to-toggle, no drag/pinch gesture system, with the enlarged image
  // sitting in a scrollable area so an edge that no longer fits on screen
  // is still reachable.
  const [zoomed, setZoomed] = useState(false)
  // Resets zoom when the photo changes — adjusted during render (React's
  // own recommended pattern for "a prop changed, derive new state from it")
  // rather than a useEffect, which would call setState synchronously inside
  // an effect body purely to re-sync it with a prop that already changed.
  const [lastOpenIndex, setLastOpenIndex] = useState(openIndex)
  if (openIndex !== lastOpenIndex) {
    setLastOpenIndex(openIndex)
    setZoomed(false)
  }

  useEffect(() => {
    if (openIndex === null) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') onNavigate((openIndex! + 1) % photos.length)
      if (event.key === 'ArrowLeft') onNavigate((openIndex! - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [openIndex, photos.length, close, onNavigate])

  if (openIndex === null) return null
  const photo = photos[openIndex]

  return (
    <div
      className={styles.lightboxBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={close}
      onContextMenu={blockContextMenu}
    >
      <button type="button" className={styles.lightboxClose} onClick={close} aria-label="Close">
        ✕
      </button>

      <button
        type="button"
        className={styles.lightboxZoom}
        aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
        onClick={(e) => {
          e.stopPropagation()
          setZoomed((z) => !z)
        }}
      >
        {zoomed ? '−' : '+'}
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate((openIndex - 1 + photos.length) % photos.length)
          }}
        >
          ‹
        </button>
      )}

      <div className={styles.lightboxImageScroll} onClick={(e) => e.stopPropagation()}>
        <div
          className={`${styles.lightboxImage} ${zoomed ? styles.lightboxImageZoomed : ''}`}
          style={{ backgroundImage: `url(${photoUrl(photo.photoId)})` }}
          onClick={() => setZoomed((z) => !z)}
        />
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate((openIndex + 1) % photos.length)
          }}
        >
          ›
        </button>
      )}

      {(photo.caption || photos.length > 1) && (
        <p className={styles.lightboxCaption} onClick={(e) => e.stopPropagation()}>
          {photo.caption}
          {photo.caption && photos.length > 1 && ' — '}
          {photos.length > 1 && `${openIndex + 1} / ${photos.length}`}
        </p>
      )}
    </div>
  )
}
