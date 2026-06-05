import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function CoOrdSetPage() {
  const product = getProductByHandle('women-lounge-sets')
  return (
    <ProductColourPage
      product={product}
      collectionName="Women's"
      collectionSlug="womens"
      backHref="/shop/womens"
    />
  )
}
