'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import { getPrimaryImage } from '@/utils/getProductImages'
import { writeNavSource } from '@/lib/navSource'
import styles from './ProductCard.module.css'

interface ProductCardProps {
  product: Product
  defaultColourSlug?: string
  navLabel?: string   // label shown on the next page's back link, e.g. an Edit name
}

export default function ProductCard({
  product,
  defaultColourSlug,
  navLabel,
}: ProductCardProps) {
  const defaultColour =
    product.colours.find(c => c.slug === defaultColourSlug) ||
    product.colours[0]

  const [activeColour, setActiveColour] = useState(defaultColour)

  const heroImage = getPrimaryImage(activeColour.images)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productHref = `/shop/${product.handle}/${activeColour.slug}` as any

  const handleNavigate = () => {
    if (navLabel) writeNavSource(navLabel, window.location.pathname)
  }

  // First segment of compositionQuote up to the first em dash
  const fabricLine = product.compositionQuote.split('—')[0].trim()

  return (
    <div className={styles.card}>

      <Link href={productHref} className={styles.imageWrap} onClick={handleNavigate}>
        {heroImage.src ? (
          <img
            src={heroImage.src}
            alt={`${product.name} ${activeColour.label}`}
            className={styles.image}
          />
        ) : (
          <div
            className={styles.placeholder}
            style={{ background: activeColour.hex }}
          >
            <span className={styles.placeholderName}>{activeColour.label}</span>
          </div>
        )}
      </Link>

      <div className={styles.info}>

        <div className={styles.titleRow}>
          <span className={styles.title}>{product.name}</span>
        </div>

        <span className={styles.fabric}>{fabricLine}</span>

        <div className={styles.swatchRow}>
          {product.colours.map(colour => (
            <button
              key={colour.slug}
              className={`${styles.swatch} ${colour.slug === activeColour.slug ? styles.swatchActive : ''}`}
              style={{ background: colour.hex }}
              onClick={() => setActiveColour(colour)}
              title={colour.label}
              aria-label={colour.label}
            />
          ))}
        </div>

        <div className={styles.colourPriceStack}>
          <span className={styles.activeName}>{activeColour.label}</span>
          <span className={styles.price}>
            {product.currency}{product.price.toLocaleString('en-IN')}
          </span>
        </div>

        <Link href={productHref} className={styles.viewCta} onClick={handleNavigate}>
          View product →
        </Link>

      </div>
    </div>
  )
}
