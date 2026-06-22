import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function ShortSleeveSleepSetPage() {
  const product = getProductByHandle('women-sleepwear')
  return (
    <ProductColourPage
      product={product}
      collectionName="Women's"
      collectionSlug="womens"
      backHref="/shop/womens/sleepwear"
    />
  )
}
