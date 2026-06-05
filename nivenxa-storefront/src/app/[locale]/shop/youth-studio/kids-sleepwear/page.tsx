import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function KidsSleepwearPage() {
  const product = getProductByHandle('kids-sleepwear')
  return (
    <ProductColourPage
      product={product}
      collectionName="Youth Studio"
      collectionSlug="youth-studio"
      backHref="/shop/youth-studio"
    />
  )
}
