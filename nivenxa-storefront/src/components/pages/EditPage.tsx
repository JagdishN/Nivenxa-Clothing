import { Link } from '@/i18n/routing'
import type { Product } from '@/types/product'
import type { Edit } from '@/data/edits'
import { getPrimaryImage } from '@/utils/getProductImages'
import ProductCard from '@/components/collection/ProductCard/ProductCard'
import FeaturedProductCard from '@/components/collection/ProductCard/FeaturedProductCard'
import styles from './EditPage.module.css'

interface Props {
  edit: Edit
  products: Product[]
}

function getGridClass(count: number): string {
  if (count === 2) return styles.gridTwo
  return styles.gridThree
}

export default function EditPage({ edit, products }: Props) {
  // Compute hero image from featured product / colour
  const featuredProduct = products.find(p => p.handle === edit.featuredProductHandle)
  const featuredColour =
    featuredProduct?.colours.find(c => c.slug === edit.featuredColourSlug) ??
    featuredProduct?.colours[0]

  const heroImage = featuredColour ? getPrimaryImage(featuredColour.images) : null
  const heroUrl   = edit.heroImageUrl || heroImage?.src || ''
  const heroFall  = featuredColour?.hex || '#D8C9B0'

  return (
    <div>

      {/* ── Section 1: Hero ───────────────────────────────── */}
      <section className={styles.hero}>
        {heroUrl ? (
          <img src={heroUrl} alt={edit.name} className={styles.heroImage} />
        ) : (
          <div className={styles.heroPlaceholder} style={{ background: heroFall }} />
        )}
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>{edit.name}</p>
          <h1 className={styles.heroHeadline}>{edit.headline}</h1>
        </div>
      </section>

      {/* ── Section 2: Story ──────────────────────────────── */}
      <section className={styles.storySection}>
        <div className={styles.storyLeft}>
          <p className={styles.storyEditName}>{edit.name}</p>
          <div className={styles.storyRule} />
        </div>
        <div className={styles.storyRight}>
          <p className={styles.storyText}>{edit.story}</p>
        </div>
      </section>

      {/* ── Section 3: Sub-item navigation strip ──────────── */}
      <div className={styles.subNavWrap}>
        <nav className={styles.subNav}>
          {edit.subItems.map(sub => (
            <Link
              key={sub.slug}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={`/edits/${edit.slug}/${sub.slug}` as any}
              className={styles.subNavItem}
            >
              {sub.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Section 4: Product cards ───────────────────────── */}
      <section className={styles.productsSection}>
        {products.length === 1 ? (
          <FeaturedProductCard product={products[0]} />
        ) : (
          <div className={`${styles.productGrid} ${getGridClass(products.length)}`}>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
