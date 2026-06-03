'use client'
import { useEffect, useRef, useState } from 'react'
import type { ProductImage } from '@/types/product'
import { getGalleryImages } from '@/utils/getProductImages'
import styles from './MobileCarousel.module.css'

interface Props {
  images: ProductImage[]
  productName: string
}

export default function MobileCarousel({ images, productName }: Props) {
  const ordered = getGalleryImages(images)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLImageElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  // Reset on colour change
  useEffect(() => {
    setActiveIndex(0)
    if (containerRef.current) containerRef.current.scrollLeft = 0
  }, [images])

  // IntersectionObserver threshold 0.5
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = itemRefs.current.findIndex(ref => ref === entry.target)
            if (idx !== -1) setActiveIndex(idx)
          }
        })
      },
      { threshold: 0.5 }
    )

    itemRefs.current.forEach(ref => { if (ref) observer.observe(ref) })
    return () => observer.disconnect()
  }, [ordered.length])

  return (
    <div className={styles.wrapper} aria-label={`${productName} images`}>
      <div className={styles.track} ref={containerRef}>
        {ordered.map((img, i) => (
          <img
            key={img.id}
            ref={el => { itemRefs.current[i] = el }}
            src={img.src}
            alt={img.alt}
            className={styles.slide}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {/* Dot indicator */}
      <div className={styles.dots} aria-hidden="true">
        {ordered.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${activeIndex === i ? styles.dotActive : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
