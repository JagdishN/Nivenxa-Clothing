import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import { getPrimaryImage } from '@/utils/getProductImages'
import styles from './ProductColourPage.module.css'

interface Props {
  product: Product
  collectionName: string
  collectionSlug: string
  backHref: string
}

export default function ProductColourPage({
  product,
  collectionName,
  backHref,
}: Props) {
  const fp0 = product.fabricPillars[0]
  const fabricLine = fp0
    ? [fp0.value, fp0.unit].filter(Boolean).join(' ')
    : product.category

  return (
    <div className={styles.section}>

      {/* Back link */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={backHref as any} className={styles.backLink}>
        ← {collectionName}
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{product.name}</h1>
        <p className={styles.fabricLine}>{fabricLine}</p>
        <div className={styles.titleRule} />
      </div>

      {/* Colour grid */}
      <div className={styles.colourGrid}>
        {product.colours.map(colour => {
          const primaryImage = getPrimaryImage(colour.images)
          const productHref  = `/shop/${product.handle}/${colour.slug}`

          return (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link key={colour.slug} href={productHref as any} className={styles.colourCard}>
              <div className={styles.cardImageWrap}>
                <img
                  src={primaryImage.src}
                  alt={primaryImage.alt}
                  className={styles.cardImage}
                />
              </div>
              <div className={styles.cardText}>
                <div className={styles.colourNameRow}>
                  <span
                    className={styles.colourDot}
                    style={{ background: colour.hex }}
                  />
                  <span className={styles.colourName}>{colour.label}</span>
                </div>
                <p className={styles.cardPrice}>
                  {product.currency}{product.price.toLocaleString('en-IN')}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
