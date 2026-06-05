import { notFound } from 'next/navigation'
import { products } from '@/data/products'
import ProductPage from '@/components/pages/ProductPage'

// ── Static params — one entry per product × colour ────────────────────────────
export function generateStaticParams() {
  return products.flatMap(p =>
    p.colours.map(c => ({ slug: p.handle, color: c.slug }))
  )
}

export default async function ShopProductColorPage({
  params,
}: {
  params: Promise<{ slug: string; color: string }>
}) {
  const { slug, color } = await params

  const product = products.find(p => p.handle === slug)
  if (!product) notFound()

  const validColour = product.colours.some(c => c.slug === color)
  if (!validColour) notFound()

  // ProductPage is a client component — reads slug + color via useParams()
  return <ProductPage />
}
