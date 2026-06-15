'use client'
import { useRef, useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import type { CollectionItem } from '@/types/product'
import { getCrossSellImage } from '@/utils/getProductImages'
import styles from './CollectionCarousel.module.css'

interface Props {
  items: CollectionItem[]
  currentProductId: string
}

export default function CollectionCarousel({ items, currentProductId }: Props) {
  const filtered = items.filter(item => item.id !== currentProductId)
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScrollState = () => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    checkScrollState()
    el.addEventListener('scroll', checkScrollState, { passive: true })
    const ro = new ResizeObserver(checkScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScrollState)
      ro.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length])

  const scrollBy = (dir: 'prev' | 'next') => {
    const el = trackRef.current
    if (!el) return
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16
      : 300
    el.scrollBy({ left: dir === 'next' ? cardWidth : -cardWidth, behavior: 'smooth' })
  }

  if (filtered.length === 0) return null

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <p className={styles.sectionLabel}>MORE TONES</p>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Previous"
            onClick={() => scrollBy('prev')}
            disabled={!canScrollLeft}
          >
            <IconArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Next"
            onClick={() => scrollBy('next')}
            disabled={!canScrollRight}
          >
            <IconArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.track} ref={trackRef}>
        {filtered.map(item => {
          const img = getCrossSellImage(item.images)
          return (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={item.id} href={`/shop/${item.slug}` as any} className={styles.card}>
              <div className={styles.imageWrapper}>
                <img
                  src={img.src}
                  alt={img.alt}
                  className={styles.image}
                  loading="lazy"
                />
              </div>
              <p className={styles.name}>
                {item.name} / {item.colourLabel}
              </p>
              <p className={styles.price}>
                {item.currency}{item.price.toLocaleString('en-IN')}
              </p>
              <p className={styles.viewLink}>VIEW →</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
