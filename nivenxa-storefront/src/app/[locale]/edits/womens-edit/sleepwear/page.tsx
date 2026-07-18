import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function WomensEditSleepwearPage() {
  const edit    = getEditBySlug('womens-edit')
  const subItem = getSubItemBySlug('womens-edit', 'sleepwear')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
