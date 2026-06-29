import ProductColourPage from '@/components/pages/ProductColourPage'
import { getProductByHandle } from '@/data/products'

export default function KurtaContrastPantPage() {
  const product = getProductByHandle('kurta-contrast-pant')
  return <ProductColourPage product={product} />
}
