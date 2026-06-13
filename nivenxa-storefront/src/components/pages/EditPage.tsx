'use client'

import { useState, useMemo } from 'react'
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
  // First sub-item (Silhouettes) is always the default tab
  const [activeTab, setActiveTab] = useState<string>(edit.subItems[0]?.slug ?? '')

  // Products for the active tab — filters from the full products prop
  const activeProducts = useMemo(() => {
    if (activeTab === 'all') {
      return products
    }
    const subItem = edit.subItems.find(s => s.slug === activeTab)
    if (!subItem) return []
    return subItem.productHandles
      .map(h => products.find(p => p.handle === h))
      .filter((p): p is Product => p !== undefined)
  }, [activeTab, edit.subItems, products])

  // Active sub-item for editorial intro — null when 'all' tab is selected
  const activeSubItem =
    activeTab === 'all'
      ? null
      : edit.subItems.find(s => s.slug === activeTab) ?? null

  // Hero image — derived from featured product / colour
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

      {/* ── Section 3: Tab navigation strip ───────────────── */}
      <div className={styles.subNavWrap}>
        <nav className={styles.subNav}>

          {edit.subItems.map(sub => (
            <button
              key={sub.slug}
              className={`${styles.subNavItem} ${activeTab === sub.slug ? styles.subNavActive : ''}`}
              onClick={() => setActiveTab(sub.slug)}
              aria-pressed={activeTab === sub.slug}
            >
              {sub.name}
            </button>
          ))}

          {/* View All — always visible, right-aligned */}
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a
            href="#all-products"
            className={styles.viewAllLink}
            onClick={(e) => {
              e.preventDefault()
              setActiveTab('all')
            }}
          >
            View All Products →
          </a>

        </nav>
      </div>

      {/* ── Section 4: Editorial intro (hidden when 'all' tab active) ── */}
      {activeSubItem && (
        <div className={styles.editorialIntro}>
          <p className={styles.editorialText}>
            &ldquo;{activeSubItem.editorial}&rdquo;
          </p>
        </div>
      )}

      {/* ── Section 5: Product grid ────────────────────────── */}
      <section id="all-products" className={styles.productsSection}>
        {activeProducts.length === 1 ? (
          <FeaturedProductCard product={activeProducts[0]} />
        ) : (
          <div className={`${styles.productGrid} ${getGridClass(activeProducts.length)}`}>
            {activeProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                referrer={{
                  from: 'edit',
                  slug: edit.slug,
                  name: edit.name,
                }}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
