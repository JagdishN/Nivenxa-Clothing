import { notFound } from 'next/navigation'
import { products } from '@/lib/products'
import ProductStoryClient from '@/components/product/ProductStoryClient'

export default async function ProductStoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = products.find((p) => p.id === id)
  if (!product) notFound()

  const variants = products.filter((p) => p.category === product.category)
  const related  = [
    ...products.filter((p) => p.id !== product.id && p.category === product.category),
    ...products.filter((p) => p.category !== product.category),
  ].slice(0, 3)

  return <ProductStoryClient product={product} variants={variants} related={related} />
}
