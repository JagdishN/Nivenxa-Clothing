import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function UnisexLoungeSetsPage() {
  const product = getProductByHandle('women-lounge-sets')
  return (
    <ProductColourPage
      product={product}
      collectionName="Unisex"
      collectionSlug="unisex"
      backHref="/shop/unisex"
    />
  )
}
