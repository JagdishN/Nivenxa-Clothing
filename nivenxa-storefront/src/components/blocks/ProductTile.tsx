'use client'
import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import { getPrimaryImage } from '@/utils/getProductImages'
import styles from './ProductTile.module.css'

interface Props {
  product: Product
}

export default function ProductTile({ product }: Props) {
  const firstColour = product.colours[0]
  const primaryImage = getPrimaryImage(firstColour.images)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const href = `/shop/${product.handle}/${firstColour.slug}` as any

  return (
    <Link href={href} className={styles.tile}>
      <div className={styles.imageWrap}>
        <img
          src={primaryImage.src}
          alt={primaryImage.alt}
          className={styles.image}
        />
      </div>

      <div className={styles.info}>
        {product.collectionName && (
          <p className={styles.collection}>{product.collectionName}</p>
        )}
        <h3 className={styles.name}>{product.name}</h3>

        <div className={styles.swatches}>
          {product.colours.slice(0, 8).map(c => (
            <span
              key={c.slug}
              className={styles.swatch}
              style={{ background: c.hex }}
              title={c.label}
            />
          ))}
          {product.colours.length > 8 && (
            <span className={styles.more}>+{product.colours.length - 8}</span>
          )}
        </div>

        <p className={styles.price}>
          {product.currency}{product.price.toLocaleString('en-IN')}
        </p>
      </div>
    </Link>
  )
}
