import CollectionPage from '@/components/pages/CollectionPage'
import { getProductsByCollection } from '@/data/products'

export default function MensPage() {
  const products = getProductsByCollection('mens')
  return (
    <CollectionPage
      collectionName="Men's"
      collectionSlug="mens"
      eyebrow="Shop"
      products={products}
    />
  )
}
