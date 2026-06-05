import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function UtilityRelaxedUtilityPage() {
  const edit    = getEditBySlug('utility-edit')
  const subItem = getSubItemBySlug('utility-edit', 'relaxed-utility')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
