import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function EaseEditCoOrdSetPage() {
  const edit    = getEditBySlug('ease-edit')
  const subItem = getSubItemBySlug('ease-edit', 'co-ord-set')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
