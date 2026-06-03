import { notFound } from 'next/navigation'

// ── New product system (Shopify-ready types) ────────────────────────────────
import { products as newProducts } from '@/data/products'
import ProductPage from '@/components/pages/ProductPage'

// ── Legacy product system (existing local data) ─────────────────────────────
import { products as oldProducts } from '@/lib/products'
import ProductStoryClient from '@/components/product/ProductStoryClient'

const toColorSlug = (colorway: string) =>
  colorway.toLowerCase().replace(/\s+/g, '-')

// ── Static params — covers both legacy and new products ──────────────────────
export function generateStaticParams() {
  const legacyParams = oldProducts.map(p => ({
    slug:  p.category,
    color: toColorSlug(p.colorway),
  }))

  const newParams = newProducts.flatMap(p =>
    p.colours.map(c => ({ slug: p.handle, color: c.slug }))
  )

  return [...legacyParams, ...newParams]
}

export default async function ShopProductColorPage({
  params,
}: {
  params: Promise<{ slug: string; color: string }>
}) {
  const { slug, color } = await params

  // ── Check new product system first ──────────────────────────────────────
  const newProduct = newProducts.find(p => p.handle === slug)
  if (newProduct) {
    // Verify the colour slug is valid (or fall through to 404)
    const validColour = newProduct.colours.some(c => c.slug === color)
    if (validColour) {
      // ProductPage is a client component — reads params internally via useParams()
      return <ProductPage />
    }
  }

  // ── Fall back to legacy product system ───────────────────────────────────
  const product = oldProducts.find(
    p => p.category === slug && toColorSlug(p.colorway) === color
  )
  if (!product) notFound()

  const variants = oldProducts.filter(p => p.category === slug)
  const related = [
    ...oldProducts.filter(p => p.id !== product.id && p.category === slug),
    ...oldProducts.filter(p => p.category !== slug),
  ].slice(0, 3)

  return <ProductStoryClient product={product} variants={variants} related={related} />
}
