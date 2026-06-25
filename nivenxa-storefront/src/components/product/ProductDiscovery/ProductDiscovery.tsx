'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { Link } from '@/i18n/routing'
import { products } from '@/data/products'
import styles from './ProductDiscovery.module.css'

// ─── Hero colourway per product (confirmed by product brief) ─────────────────
// These are the S1 studio-front colourways shown in this section.
// NOTE: spec says a-line-kurta → "Morning Ivory" but no such colour exists in
// products.ts; nearest match is slug 'ivory' (label "Ivory"). Mapped accordingly.
const HERO_SLUG: Record<string, string> = {
  'over-tee-shirts':       'bone',
  'cargo-pants':           'chalk-stone',
  'a-line-kurta':          'ivory',
  'kurta-contrast-pant':   'wild-sage',
  'women-lounge-sets':     'meadow-sage',
  'women-sleepwear':       'morning-cream',
  'women-sleep-set':       'morning-cream',
  'kids-rest-sleep-set':   'cloud',
  'kids-summer-sleep-set': 'cloud',
}

// ─── localStorage ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'nivenxa_viewed'
const MAX_STORED  = 10

function readViewed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function recordView(handle: string): void {
  try {
    const viewed = readViewed()
    const deduped = viewed.filter(h => h !== handle)
    deduped.unshift(handle)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped.slice(0, MAX_STORED)))
  } catch {
    // localStorage unavailable — degrade gracefully to State 1
  }
}

// ─── Card type ────────────────────────────────────────────────────────────────
interface DiscoveryCard {
  handle:     string
  name:       string
  price:      number
  currency:   string
  colourSlug: string
  imageSrc:   string
  imageAlt:   string
}

// ─── Stable catalogue handle order ───────────────────────────────────────────
const CATALOGUE_HANDLES = products.map(p => p.handle)

const MAX_CARDS = 6
const MIN_CARDS = 4

function buildCard(handle: string): DiscoveryCard | null {
  const product = products.find(p => p.handle === handle)
  if (!product) return null

  const wantedSlug = HERO_SLUG[handle] ?? product.colours[0]?.slug
  const colour =
    product.colours.find(c => c.slug === wantedSlug) ?? product.colours[0]
  if (!colour) return null

  const img =
    colour.images.find(i => i.type === 'studio-front') ?? colour.images[0]
  if (!img) return null

  return {
    handle,
    name:       product.name,
    price:      product.price,
    currency:   product.currency,
    colourSlug: colour.slug,
    imageSrc:   img.src,
    imageAlt:   img.alt,
  }
}

function resolveCards(
  currentHandle: string,
  viewedHandles: string[],
): { heading: string; cards: DiscoveryCard[] } {
  // Exclude current product from the viewed list to determine visit state
  const othersViewed = viewedHandles.filter(h => h !== currentHandle)
  const isReturnVisit = othersViewed.length > 0

  if (!isReturnVisit) {
    // ── State 1: You May Also Like ─────────────────────────────────────────
    // All catalogue products minus current, in catalogue order, up to MAX_CARDS
    const handles = CATALOGUE_HANDLES
      .filter(h => h !== currentHandle)
      .slice(0, MAX_CARDS)
    const cards = handles
      .map(buildCard)
      .filter((c): c is DiscoveryCard => c !== null)
    return { heading: 'You May Also Like', cards }
  }

  // ── State 2: Recently Viewed ───────────────────────────────────────────────
  // Take up to MIN_CARDS from recently viewed (excluding current), then fill
  // remaining slots from catalogue to always reach MIN_CARDS, cap at MAX_CARDS.
  const recentSlice = othersViewed.slice(0, MIN_CARDS)
  const seen = new Set<string>([currentHandle, ...recentSlice])
  const filler = CATALOGUE_HANDLES.filter(h => !seen.has(h))
  const combined = [...recentSlice, ...filler].slice(0, MAX_CARDS)

  const cards = combined
    .map(buildCard)
    .filter((c): c is DiscoveryCard => c !== null)
  return { heading: 'Recently Viewed', cards }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  currentHandle: string
}

export default function ProductDiscovery({ currentHandle }: Props) {
  const [heading, setHeading] = useState<string>('')
  const [cards,   setCards]   = useState<DiscoveryCard[]>([])

  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // ── Record view + resolve cards on every product page load ────────────────
  useEffect(() => {
    // 1. Record current visit so future pages see it in "Recently Viewed"
    recordView(currentHandle)
    // 2. Read back (current handle is now at front; othersViewed excludes it)
    const viewed = readViewed()
    const { heading: h, cards: c } = resolveCards(currentHandle, viewed)
    setHeading(h)
    setCards(c)
  }, [currentHandle])

  // ── Scroll state ──────────────────────────────────────────────────────────
  const checkScrollState = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

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
  }, [cards.length, checkScrollState])

  const scrollBy = (dir: 'prev' | 'next') => {
    const el = trackRef.current
    if (!el) return
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 16
      : 300
    el.scrollBy({ left: dir === 'next' ? cardWidth : -cardWidth, behavior: 'smooth' })
  }

  // Never render an empty section
  if (cards.length === 0) return null

  return (
    <section className={styles.section}>

      <div className={styles.header}>
        <p className={styles.sectionLabel}>{heading}</p>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Previous"
            onClick={() => scrollBy('prev')}
            disabled={!canScrollLeft}
          >
            <IconArrowLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Next"
            onClick={() => scrollBy('next')}
            disabled={!canScrollRight}
          >
            <IconArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.track} ref={trackRef}>
        {cards.map(card => (
          <Link
            key={card.handle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            href={`/shop/${card.handle}/${card.colourSlug}` as any}
            className={styles.card}
          >
            <div className={styles.imageWrapper}>
              <img
                src={card.imageSrc}
                alt={card.imageAlt}
                className={styles.image}
                loading="lazy"
              />
            </div>
            <p className={styles.name}>{card.name}</p>
            <p className={styles.price}>
              {card.currency}{card.price.toLocaleString('en-IN')}
            </p>
            <p className={styles.viewLink}>VIEW →</p>
          </Link>
        ))}
      </div>

    </section>
  )
}
