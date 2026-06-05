'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import { getPrimaryImage } from '@/utils/getProductImages'
import styles from './FeaturedProductCard.module.css'

interface Props {
  product: Product
}

export default function FeaturedProductCard({ product }: Props) {
  const [activeColour, setActiveColour] = useState(product.colours[0])

  const heroImage = getPrimaryImage(activeColour.images)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productHref = `/shop/${product.handle}/${activeColour.slug}` as any

  const fabricLine = product.compositionQuote.split('—')[0].trim()

  return (
    <div className={styles.featuredCard}>

      {/* Left — large image */}
      <Link href={productHref} className={styles.featuredImageWrap}>
        {heroImage.src ? (
          <img
            src={heroImage.src}
            alt={`${product.name} ${activeColour.label}`}
            className={styles.featuredImage}
          />
        ) : (
          <div
            className={styles.featuredPlaceholder}
            style={{ background: activeColour.hex }}
          >
            <span className={styles.placeholderName}>{activeColour.label}</span>
          </div>
        )}
      </Link>

      {/* Right — product info */}
      <div className={styles.featuredInfo}>

        <span className={styles.featuredEyebrow}>Featured piece</span>

        <h2 className={styles.featuredTitle}>{product.name}</h2>

        <p className={styles.featuredFabric}>{fabricLine}</p>

        <div className={styles.featuredDivider} />

        <div className={styles.featuredSwatches}>
          <span className={styles.featuredSwatchLabel}>Available Tones</span>

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

          <div className={styles.featuredColourPrice}>
            <span className={styles.featuredActiveName}>{activeColour.label}</span>
            <span className={styles.featuredPrice}>
              {product.currency}{product.price.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <Link href={productHref} className={styles.featuredCta}>
          View product →
        </Link>

      </div>
    </div>
  )
}
