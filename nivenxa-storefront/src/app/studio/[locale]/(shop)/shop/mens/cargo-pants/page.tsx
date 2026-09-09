import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function MensCargoPage() {
  const product = getProductByHandle('cargo-pants')
  return <ProductColourPage product={product} />
}
