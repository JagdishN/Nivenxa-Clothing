import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function ALineKurtaPage() {
  const product = getProductByHandle('a-line-kurta')
  return <ProductColourPage product={product} />
}
