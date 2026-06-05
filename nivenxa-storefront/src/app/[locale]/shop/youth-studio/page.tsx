import CollectionPage from '@/components/pages/CollectionPage'
import { getProductsByCollection } from '@/data/products'

export default function YouthStudioPage() {
  const products = getProductsByCollection('youth-studio')
  return (
    <CollectionPage
      collectionName="Youth Studio"
      collectionSlug="youth-studio"
      eyebrow="Shop"
      products={products}
    />
  )
}
