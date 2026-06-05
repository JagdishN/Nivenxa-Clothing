import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function UnisexCargoPage() {
  const product = getProductByHandle('cargo-pants')
  return (
    <ProductColourPage
      product={product}
      collectionName="Unisex"
      collectionSlug="unisex"
      backHref="/shop/unisex"
    />
  )
}
