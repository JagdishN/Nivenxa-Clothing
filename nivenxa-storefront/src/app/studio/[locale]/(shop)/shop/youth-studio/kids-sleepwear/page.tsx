import CollectionPage from '@/components/pages/CollectionPage'
import { getProductsByCategory } from '@/data/products'

export default function KidsSleepwearCategoryPage() {
  const products = getProductsByCategory('Kids Sleepwear')
  return (
    <CollectionPage
      collectionName="Kids Sleepwear"
      collectionSlug="youth-studio"
      eyebrow="Youth Studio"
      intro="Relaxed sleepwear for every season."
      products={products}
    />
  )
}
