import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function WomensEditContrastPantPage() {
  const edit    = getEditBySlug('womens-edit')
  const subItem = getSubItemBySlug('womens-edit', 'kurta-contrast-pant')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
