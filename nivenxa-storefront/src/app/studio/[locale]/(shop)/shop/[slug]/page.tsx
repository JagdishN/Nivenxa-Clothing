import { notFound } from 'next/navigation'
import { redirect } from '@/i18n/routing'
import { products } from '@/data/products'
import ProductTile from '@/components/blocks/ProductTile'
import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from '../ShopPage.module.scss'

// ── Collection config ─────────────────────────────────────────────────────────
// Studio's collections: Unisex, Women, Kids. There is no separate adult men's collection.
// "Shop all" is /shop itself. Kids products live under Kids only, never Unisex.
const COLLECTIONS = [
  {
    slug:        'unisex',
    eyebrow:     'Unisex',
    title:       'Unisex',
    description: 'Designed for all. Sized for movement. Built to last.',
  },
  {
    slug:        'womens',
    eyebrow:     'Women',
    title:       'Women',
    description: 'Contemporary Indian silhouettes in considered fabrics. Designed for daily life.',
  },
  {
    slug:        'kids',
    eyebrow:     'Kids',
    title:       'Kids',
    description: 'Designed for real children. Built to move.',
  },
] as const

export function generateStaticParams() {
  return COLLECTIONS.map(c => ({ slug: c.slug }))
}

export default async function ShopCollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  // /shop/{product-handle} with no colour → the product's first colour
  const product = products.find(p => p.handle === slug)
  if (product) {
    redirect({ href: `/shop/${product.handle}/${product.colours[0].slug}` as never, locale })
  }

  const config = COLLECTIONS.find(c => c.slug === slug)
  if (!config) notFound()

  // Live products first, coming-soon last
  const collectionProducts = products
    .filter(p => p.collectionSlug === slug && !p.archived)
    .sort((a, b) => Number(!!a.comingSoon) - Number(!!b.comingSoon))
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
