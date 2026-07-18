import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function WomensSleepSetPage() {
  const product = getProductByHandle('women-sleep-set')
  return <ProductColourPage product={product} />
}
