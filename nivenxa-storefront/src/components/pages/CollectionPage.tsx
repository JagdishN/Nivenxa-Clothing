import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import { getPrimaryImage } from '@/utils/getProductImages'
import FeaturedProductCard from '@/components/collection/ProductCard/FeaturedProductCard'
import styles from './CollectionPage.module.css'

// Maps product handles → the URL sub-segment used under each collection
// e.g. /shop/mens/oversized-tee, /shop/womens/co-ord-set
const PRODUCT_SUBPATH: Record<string, string> = {
  'over-tee-shirts':      'oversized-tee',
  'cargo-pants':          'cargo-pants',
  'a-line-kurta':         'a-line-kurta',
  'kurta-contrast-pant':  'kurta-contrast-pant',
  'women-lounge-sets':    'co-ord-set',
  'women-sleepwear':      'short-sleeve-sleep-set',
  'women-sleep-set':      'sleep-set',
  'kids-rest-sleep-set':  'kids-rest-sleep-set',
  'kids-summer-sleep-set':'kids-summer-sleep-set',
}

function getGridClass(count: number): string {
  if (count === 2) return styles.gridTwo
  return styles.gridThree
}

interface Props {
  collectionName: string
  collectionSlug: string
  eyebrow?: string
  intro?: string
  products: Product[]
}

export default function CollectionPage({
  collectionName,
  collectionSlug,
  eyebrow = 'Shop',
  intro,
  products,
}: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{collectionName}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        <div className={styles.titleRule} />
      </div>

      {products.length === 1 ? (
        <FeaturedProductCard product={products[0]} />
      ) : (
        <div className={`${styles.productGrid} ${getGridClass(products.length)}`}>
          {products.map(product => {
            const firstColour  = product.colours[0]
            const primaryImage = getPrimaryImage(firstColour.images)
            const subpath      = PRODUCT_SUBPATH[product.handle] ?? product.handle
            const href         = `/shop/${collectionSlug}/${subpath}`

            // Fabric line — cardDescriptor when set, else first pillar: "240 GSM" etc.
            const fp0 = product.fabricPillars[0]
            const fabricLine = product.cardDescriptor || (fp0
              ? [fp0.value, fp0.unit].filter(Boolean).join(' ')
              : product.category)

            const toneCount = product.colours.length
            const toneLabel = `${toneCount} ${toneCount === 1 ? 'tone' : 'tones'}`

            // Coming-soon pill — only when every size is unavailable, so this
            // doesn't surface Product.badge on in-stock products (e.g. "New Season").
            const isComingSoon = product.sizes.length > 0 && product.sizes.every(s => !s.available)

            return (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={product.id} href={href as any} className={styles.productCard}>
                <div className={styles.cardImageWrap}>
                  <img
                    src={primaryImage.src}
                    alt={primaryImage.alt}
                    className={styles.cardImage}
                  />
                  {isComingSoon && product.badge && (
                    <span className={styles.cardBadge}>{product.badge}</span>
                  )}
                </div>
                <div className={styles.cardText}>
                  <p className={styles.cardTitle}>{product.name}</p>
                  <p className={styles.cardFabric}>{fabricLine}</p>
                  <p className={styles.cardPrice}>
                    {product.currency}{product.price.toLocaleString('en-IN')}
                  </p>
                  <p className={styles.cardTones}>{toneLabel}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
