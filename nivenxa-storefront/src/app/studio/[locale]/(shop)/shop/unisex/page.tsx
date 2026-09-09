import CollectionPage from '@/components/pages/CollectionPage'
import { getProductsByCollection } from '@/data/products'

export default function UnisexPage() {
  const products = getProductsByCollection('unisex')
  return (
    <CollectionPage
      collectionName="Unisex"
      collectionSlug="unisex"
      eyebrow="Shop"
      products={products}
    />
  )
}
