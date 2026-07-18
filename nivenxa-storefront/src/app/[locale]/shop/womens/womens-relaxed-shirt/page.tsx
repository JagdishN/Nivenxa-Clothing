import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function WomensRelaxedShirtPage() {
  const product = getProductByHandle('womens-relaxed-shirt')
  return <ProductColourPage product={product} />
}
