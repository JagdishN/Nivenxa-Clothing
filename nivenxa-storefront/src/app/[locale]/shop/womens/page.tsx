import CollectionPage from '@/components/pages/CollectionPage'
import { getProductsByCollection } from '@/data/products'

export default function WomensPage() {
  const products = getProductsByCollection('womens')
  return (
    <CollectionPage
      collectionName="Women's"
      collectionSlug="womens"
      eyebrow="Shop"
      products={products}
    />
  )
}
