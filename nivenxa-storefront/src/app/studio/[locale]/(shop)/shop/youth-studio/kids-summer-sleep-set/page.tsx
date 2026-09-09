import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function KidsSummerSleepSetPage() {
  const product = getProductByHandle('kids-summer-sleep-set')
  return <ProductColourPage product={product} />
}
