'use client'
// NOTE: This component lives at src/components/pages/ (not src/pages/) to
// avoid conflicting with Next.js Pages Router. It is rendered by the App
// Router route at src/app/[locale]/shop/[slug]/[color]/page.tsx.

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter, Link } from '@/i18n/routing'
import { useProduct } from '@/hooks/useProduct'
import { useCart } from '@/hooks/useLocalCart'
import type { ProductColour } from '@/types/product'
import { getPrimaryImage, getGalleryImages } from '@/utils/getProductImages'

import ProductInfo from '@/components/product/ProductInfo/ProductInfo'
import MobileCarousel from '@/components/product/MobileCarousel/MobileCarousel'
import MobileStickyBar from '@/components/product/MobileStickyBar/MobileStickyBar'
import FabricStory from '@/components/editorial/FabricStory/FabricStory'
import CollectionCarousel from '@/components/collection/CollectionCarousel/CollectionCarousel'

import styles from './ProductPage.module.css'

// ─── Module-level swatch cache ────────────────────────────────────────────────
// router.replace() changes the [color] segment → Next.js remounts ProductPage,
// resetting useState. A module-level variable survives component remounts.
let _swatchExpanded = false

// ─── Skeleton ────────────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skeletonBlock} ${styles.skeletonImage}`} />
      <div className={styles.skeletonInfo}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonPrice}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonSwatches}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonSizes}`} />
      </div>
    </div>
  )
}

// ─── Error ───────────────────────────────────────────────────────────────────
function ProductError() {
  return (
    <div className={styles.error}>
      <p className={styles.errorMsg}>Product not found</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Link href={'/shop' as any} className={styles.errorLink}>
        ← Back to collection
      </Link>
    </div>
  )
}

// ─── ProductPage ─────────────────────────────────────────────────────────────
export default function ProductPage() {
  const params = useParams<{ slug: string; color: string }>()
  const handle = params?.slug ?? ''
  const colourSlug = params?.color ?? ''

  const { product, activeColour, loading, error } = useProduct(handle, colourSlug)
  const router = useRouter()
  const { addToCart } = useCart()
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [swatchExpanded, setSwatchExpandedState] = useState(_swatchExpanded)

  const setSwatchExpanded = (value: boolean) => {
    _swatchExpanded = value
    setSwatchExpandedState(value)
  }

  if (loading) return <ProductSkeleton />
  if (error || !product || !activeColour) return <ProductError />

  const handleColourChange = (colour: ProductColour) => {
    setSelectedSize(null)
    router.replace(`/shop/${product.handle}/${colour.slug}`)
  }

  const handleAddToBag = () => {
    if (!selectedSize || !activeColour.available) return
    addToCart(product.id, `${activeColour.slug}-${selectedSize}`, 1)
  }

  const isCtaDisabled =
    !selectedSize ||
    !activeColour.available ||
    !product.sizes.find(s => s.label === selectedSize)?.available

  const primaryImage = getPrimaryImage(activeColour.images)
  const galleryImages = getGalleryImages(activeColour.images)

  return (
    <div className={styles.page}>

      {/* ── Mobile carousel (hidden on desktop) ── */}
      <div className={styles.mobileCarousel}>
        <MobileCarousel
          images={activeColour.images}
          productName={product.name}
        />
      </div>

      {/* SECTION 1 — HERO (3 columns) */}
      <section className={styles.heroSection}>

        {/* Col 1 — sticky info panel */}
        <div className={styles.productInfoWrapper}>
          <ProductInfo
            product={product}
            activeColour={activeColour}
            selectedSize={selectedSize}
            onColourChange={handleColourChange}
            onSizeChange={setSelectedSize}
            onAddToBag={handleAddToBag}
            swatchExpanded={swatchExpanded}
            onSwatchExpandedChange={setSwatchExpanded}
          />
        </div>

        {/* Col 2 — sticky hero image */}
        <div className={styles.heroImageWrapper}>
          <img
            className={styles.heroImage}
            src={primaryImage.src}
            alt={`${product.name} — ${activeColour.label}`}
          />
        </div>

        {/* Col 3 — scrollable image stack */}
        <div className={styles.imageStack}>
          {galleryImages
            .slice(1)
            .map((img, i) => (
              <img
                key={img.id}
                className={styles.stackImage}
                src={img.src}
                alt={`${product.name} — ${activeColour.label} — view ${i + 2}`}
                loading="lazy"
              />
            ))}
        </div>

      </section>

      {/* SECTION 2 — EDITORIAL */}
      <section className={styles.editorialSection}>
        <FabricStory product={product} />
      </section>

      {/* SECTION 3 — CROSS-SELL */}
      <section className={styles.carouselSection}>
        <CollectionCarousel
          items={product.collectionItems}
          currentProductId={product.id}
        />
      </section>

      {/* ── Mobile sticky CTA bar ── */}
      <MobileStickyBar
        activeColour={activeColour}
        selectedSize={selectedSize}
        onAddToBag={handleAddToBag}
        currency={product.currency}
        price={product.price}
        isDisabled={isCtaDisabled}
      />

    </div>
  )
}
