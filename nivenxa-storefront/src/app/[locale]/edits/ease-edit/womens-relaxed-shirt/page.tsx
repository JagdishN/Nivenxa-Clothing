import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function EaseEditWomensRelaxedShirtPage() {
  const edit    = getEditBySlug('ease-edit')
  const subItem = getSubItemBySlug('ease-edit', 'womens-relaxed-shirt')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
