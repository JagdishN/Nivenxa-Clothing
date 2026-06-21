import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function KidsRestSleepSetPage() {
  const product = getProductByHandle('kids-rest-sleep-set')
  return (
    <ProductColourPage
      product={product}
      collectionName="Kids Sleepwear"
      collectionSlug="youth-studio/kids-sleepwear"
      backHref="/shop/youth-studio/kids-sleepwear"
    />
  )
}
