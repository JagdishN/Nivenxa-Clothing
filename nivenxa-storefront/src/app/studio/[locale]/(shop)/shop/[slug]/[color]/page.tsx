import { notFound } from 'next/navigation'
import { redirect } from '@/i18n/routing'
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
  params: Promise<{ locale: string; slug: string; color: string }>
}) {
  const { locale, slug, color } = await params

  const product = products.find(p => p.handle === slug)
  if (!product) notFound()

  // A colour that no longer exists (e.g. a retired colourway) lands on the
  // product's first colour rather than a 404.
  if (!product.colours.some(c => c.slug === color)) {
    redirect({ href: `/shop/${product.handle}/${product.colours[0].slug}` as never, locale })
  }

  // ProductPage is a client component — reads slug + color via useParams()
  return <ProductPage />
}
