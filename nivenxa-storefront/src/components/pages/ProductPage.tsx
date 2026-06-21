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
import ProductDiscovery from '@/components/product/ProductDiscovery/ProductDiscovery'
import ImageZoom from '@/components/product/ImageZoom/ImageZoom'

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

// ZoomableImage removed — hero/stack images are now plain <button> triggers that call openZoom().

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
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoomStartIndex, setZoomStartIndex] = useState(0)

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

  // Called when zoom overlay closes — applies any colour the user browsed to
  const handleZoomColourClose = (colour: ProductColour) => {
    if (colour.slug !== activeColour.slug) {
      setSelectedSize(null)
      router.replace(`/shop/${product.handle}/${colour.slug}`)
    }
  }

  const openZoom = (index: number) => {
    setZoomStartIndex(index)
    setZoomOpen(true)
  }

  const isCtaDisabled =
    !selectedSize ||
    !activeColour.available ||
    !product.sizes.find(s => s.label === selectedSize)?.available

  const primaryImage = getPrimaryImage(activeColour.images)
  const galleryImages = getGalleryImages(activeColour.images)

  // Index of the primary image in the sorted gallery order (almost always 0)
  const heroZoomIndex = galleryImages.findIndex(img => img.id === primaryImage.id)

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
          <button
            type="button"
            className={styles.heroImageBtn}
            onClick={() => openZoom(heroZoomIndex >= 0 ? heroZoomIndex : 0)}
            aria-label="Open image zoom viewer"
          >
            <img
              className={styles.heroImage}
              src={primaryImage.src}
              alt={`${product.name} — ${activeColour.label}`}
            />
          </button>
        </div>

        {/* Col 3 — scrollable image stack */}
        <div className={styles.imageStack}>
          {galleryImages.slice(1).map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={styles.stackImageBtn}
              onClick={() => openZoom(i + 1)}
              aria-label={`Open image ${i + 2} in zoom viewer`}
            >
              <img
                src={img.src}
                alt={`${product.name} — ${activeColour.label} — view ${i + 2}`}
                className={styles.stackImage}
                loading="lazy"
              />
            </button>
          ))}
        </div>

      </section>

      {/* SECTION 2 — EDITORIAL */}
      <section className={styles.editorialSection}>
        <FabricStory product={product} />
      </section>

      {/* SECTION 3 — SMART DISCOVERY */}
      <section className={styles.carouselSection}>
        <ProductDiscovery currentHandle={product.handle} />
      </section>

      {/* ── Image zoom overlay ── */}
      <ImageZoom
        isOpen={zoomOpen}
        onClose={() => setZoomOpen(false)}
        images={activeColour.images}
        activeIndex={zoomStartIndex}
        product={product}
        activeColour={activeColour}
        allColours={product.colours}
        onColourClose={handleZoomColourClose}
      />

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
