'use client'
import { useEffect, useRef, useState } from 'react'
import type { ProductImage } from '@/types/product'
import { getGalleryImages } from '@/utils/getProductImages'
import styles from './ImageGallery.module.css'

const MAX_DOTS = 8
const MAX_THUMBS = 5

interface Props {
  images: ProductImage[]
  productName: string
}

export default function ImageGallery({ images, productName }: Props) {
  const ordered = getGalleryImages(images)
  const galleryRef = useRef<HTMLDivElement>(null)
  const imageRefs = useRef<(HTMLImageElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  // Reset active index when images change (colour switch).
  // scrollIntoView targets the nearest scrollable ancestor (.galleryWrapper in
  // ProductPage) — galleryRef.current is no longer a scroll container itself.
  useEffect(() => {
    setActiveIndex(0)
    imageRefs.current[0]?.scrollIntoView({ behavior: 'instant' })
  }, [images])

  // IntersectionObserver — syncs activeIndex with visible image
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = imageRefs.current.findIndex(ref => ref === entry.target)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { threshold: 0.6 }
    )

    imageRefs.current.forEach(ref => { if (ref) observer.observe(ref) })
    return () => observer.disconnect()
  }, [ordered.length])

  const scrollToIndex = (idx: number) => {
    imageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth' })
  }

  const dots = ordered.slice(0, MAX_DOTS)
  const showThumbOverflow = ordered.length > MAX_THUMBS
  const thumbsToShow = showThumbOverflow ? MAX_THUMBS - 1 : MAX_THUMBS
  const overflowCount = ordered.length - thumbsToShow

  return (
    <div className={styles.container} ref={galleryRef} aria-label={`${productName} image gallery`}>
      {/* Scroll snap images */}
      {ordered.map((img, i) => (
        <img
          key={img.id}
          ref={el => { imageRefs.current[i] = el }}
          src={img.src}
          alt={img.alt}
          className={styles.image}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Snap dot indicator */}
      <div className={styles.dots} aria-hidden="true">
        {dots.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${activeIndex === i ? styles.dotActive : ''}`}
            aria-label={`Go to image ${i + 1}`}
            aria-current={activeIndex === i ? 'true' : undefined}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>

      {/* Thumbnail strip */}
      <div className={styles.thumbStrip}>
        {ordered.slice(0, thumbsToShow).map((img, i) => (
          <button
            key={img.id}
            type="button"
            className={`${styles.thumb} ${activeIndex === i ? styles.thumbActive : ''}`}
            aria-label={`View ${img.alt}`}
            onClick={() => scrollToIndex(i)}
          >
            <img
              src={img.src}
              alt=""
              aria-hidden="true"
              className={styles.thumbImg}
              loading="lazy"
            />
          </button>
        ))}
        {showThumbOverflow && (
          <div className={styles.thumbMore} aria-hidden="true">
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  )
}
