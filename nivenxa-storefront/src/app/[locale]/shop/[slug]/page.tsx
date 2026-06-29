import { notFound } from 'next/navigation'
import { products } from '@/data/products'
import ProductTile from '@/components/blocks/ProductTile'
import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from '../ShopPage.module.scss'

// ── Collection config ─────────────────────────────────────────────────────────
const COLLECTIONS = [
  {
    slug:        'mens-essentials',
    eyebrow:     "Men's Essentials",
    title:       'Essentials for Men',
    description: 'Minimal construction, maximum wearability. Designed for the everyday Indian wardrobe.',
  },
  {
    slug:        'unisex',
    eyebrow:     'Unisex',
    title:       'Unisex',
    description: 'Designed for all. Sized for movement. Built to last.',
  },
  {
    slug:        'womens',
    eyebrow:     "Women's",
    title:       "Women's",
    description: 'Contemporary Indian silhouettes in considered fabrics. Designed for daily life.',
  },
  {
    slug:        'youth-studio',
    eyebrow:     'Youth Studio',
    title:       'Youth Studio',
    description: 'Designed for real children. Certified safe. Built to move.',
  },
] as const

type CollectionSlug = typeof COLLECTIONS[number]['slug']

export function generateStaticParams() {
  return COLLECTIONS.map(c => ({ slug: c.slug }))
}

export default async function ShopCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const config = COLLECTIONS.find(c => c.slug === (slug as CollectionSlug))
  if (!config) notFound()

  const collectionProducts = products.filter(p => p.collectionSlug === slug && !p.archived)
  if (collectionProducts.length === 0) notFound()

  return (
    <div className={styles.page}>
      <AnimatedSection className={styles.pageHeader}>
        <p className={styles.eyebrow}>{config.eyebrow}</p>
        <h1 className={styles.title}>{config.title}</h1>
        <p className={styles.description}>{config.description}</p>
        <div className={styles.divider} />
      </AnimatedSection>

      <div className={styles.grid}>
        {collectionProducts.map((product, i) => (
          <AnimatedSection key={product.id} delay={i * 0.1}>
            <ProductTile product={product} />
          </AnimatedSection>
        ))}
      </div>
    </div>
  )
}
