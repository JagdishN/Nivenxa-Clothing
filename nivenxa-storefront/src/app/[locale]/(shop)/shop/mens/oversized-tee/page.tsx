import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function OversizedTeePage() {
  const product = getProductByHandle('over-tee-shirts')
  return <ProductColourPage product={product} />
}
