import CollectionPage from '@/components/pages/CollectionPage'
import { getProductsByCategory } from '@/data/products'

export default function WomensSleepwearCategoryPage() {
  const products = getProductsByCategory('Sleepwear')
  return (
    <CollectionPage
      collectionName="Sleepwear"
      collectionSlug="womens"
      eyebrow="Women's"
      intro="Cotton-Modal sleep sets for every season."
      products={products}
    />
  )
}
