'use client'

import { useEffect, useCallback, useRef, useState, type MouseEvent } from 'react'
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

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isOpen = openIndex !== null

  // Focus: move into the dialog when it opens (on Close, the safest control) and hand it back to
  // whatever opened it (the thumbnail) when it closes.
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => opener?.focus?.()
  }, [isOpen])

  // When zoomed, start in the middle of the enlarged photo rather than its top-left corner.
  useEffect(() => {
    const box = scrollRef.current
    if (!box) return
    if (zoomed) {
      box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2
      box.scrollTop = (box.scrollHeight - box.clientHeight) / 2
    } else {
      box.scrollLeft = 0
      box.scrollTop = 0
    }
  }, [zoomed, openIndex])

  useEffect(() => {
    if (openIndex === null) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Tab' && dialogRef.current) {
        // Keep Tab / Shift+Tab inside the dialog.
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (!dialogRef.current.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
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
      ref={dialogRef}
      className={styles.lightboxBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={close}
      onContextMenu={blockContextMenu}
    >
      <button ref={closeRef} type="button" className={styles.lightboxClose} onClick={close} aria-label="Close photo viewer">
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

      <div ref={scrollRef} className={styles.lightboxImageScroll} onClick={(e) => e.stopPropagation()}>
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

      {photos.length > 1 && (
        <p className={styles.lightboxCounter} onClick={(e) => e.stopPropagation()} aria-live="polite">
          Photo {openIndex + 1} of {photos.length}
        </p>
      )}

      {photo.caption && (
        <p className={styles.lightboxCaption} onClick={(e) => e.stopPropagation()}>
          {photo.caption}
        </p>
      )}
    </div>
  )
}
