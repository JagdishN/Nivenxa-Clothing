import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import type { Edit, EditSubItem } from '@/data/edits'
import ProductCard from '@/components/collection/ProductCard/ProductCard'
import FeaturedProductCard from '@/components/collection/ProductCard/FeaturedProductCard'
import styles from './EditSubItemPage.module.css'

// Short descriptor per sub-item slug — explains what unites the products
const DESCRIPTORS: Record<string, string> = {
  'bio-washed-essentials':
    'Every piece here shares one process — bio-enzyme washing for softness from first wear.',
  'heavyweight-canvas':
    '300 GSM enzyme-washed canvas. Heavy enough to hold its shape, soft enough to move.',
  'relaxed-utility':
    'Garments designed for movement and daily use — without compromise on fabric or finish.',
  'everyday-silhouettes':
    'The shapes that work every day — across occasions, temperatures, and wardrobes.',
  'urban-movement':
    'Designed for Indian cities — built for the distance between home and everywhere else.',
  'womens-sleepwear':
    'Ultra-soft fabrications for considered rest.',
  'kids-sleepwear':
    'Organic cotton sleepwear for every season. OEKO-TEX certified. Soft from first wear.',
  'unisex-lounge-sets':
    'Sets designed to be worn together or separately — for everyone.',
  'a-line-kurta':
    'The Indo-Western silhouette for everyday India.',
  'co-ord-set':
    'Relaxed sets that work as a complete look or as separates.',
  'sleepwear':
    'Ultra-soft fabrications for considered rest.',
}

function getGridClass(count: number): string {
  if (count === 2) return styles.gridTwo
  return styles.gridThree
}

interface Props {
  edit: Edit
  subItem: EditSubItem
  products: Product[]
}

export default function EditSubItemPage({ edit, subItem, products }: Props) {
  const descriptor = DESCRIPTORS[subItem.slug] ?? ''

  return (
    <div className={styles.section}>

      {/* Back link */}
      <Link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        href={`/edits/${edit.slug}` as any}
        className={styles.backLink}
      >
        ← {edit.name}
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{subItem.name}</h1>
        <p className={styles.descriptor}>{descriptor}</p>
        <div className={styles.rule} />
      </div>

      {/* Product grid — mixed regardless of gender */}
      {products.length === 1 ? (
        <FeaturedProductCard product={products[0]} />
      ) : (
        <div className={`${styles.productGrid} ${getGridClass(products.length)}`}>
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

    </div>
  )
}
