import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function UnisexLoungeSetsPage() {
  const edit    = getEditBySlug('rest-edit')
  const subItem = getSubItemBySlug('rest-edit', 'unisex-lounge-sets')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
