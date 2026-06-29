import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function KidsUnisexTeePage() {
  const product = getProductByHandle('kids-unisex-tee')
  return <ProductColourPage product={product} />
}
