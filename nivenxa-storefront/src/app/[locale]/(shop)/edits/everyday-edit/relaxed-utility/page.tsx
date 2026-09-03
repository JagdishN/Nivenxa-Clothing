import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function RelaxedUtilityPage() {
  const edit    = getEditBySlug('everyday-edit')
  const subItem = getSubItemBySlug('everyday-edit', 'relaxed-utility')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
