import { notFound } from 'next/navigation'
import { products } from '@/lib/products'
import ProductStoryClient from '@/components/product/ProductStoryClient'

const toColorSlug = (colorway: string) =>
  colorway.toLowerCase().replace(/\s+/g, '-')

export function generateStaticParams() {
  return products.map((p) => ({
    slug:  p.category,
    color: toColorSlug(p.colorway),
  }))
}

export default async function ShopProductColorPage({
  params,
}: {
  params: Promise<{ slug: string; color: string }>
}) {
  const { slug, color } = await params
  const product = products.find(
    (p) => p.category === slug && toColorSlug(p.colorway) === color
  )
  if (!product) notFound()

  const variants = products.filter((p) => p.category === slug)
  const related  = [
    ...products.filter((p) => p.id !== product.id && p.category === slug),
    ...products.filter((p) => p.category !== slug),
  ].slice(0, 3)

  return <ProductStoryClient product={product} variants={variants} related={related} />
}
