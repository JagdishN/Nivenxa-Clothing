import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function HeavyweightCanvasPage() {
  const edit    = getEditBySlug('utility-edit')
  const subItem = getSubItemBySlug('utility-edit', 'heavyweight-canvas')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
