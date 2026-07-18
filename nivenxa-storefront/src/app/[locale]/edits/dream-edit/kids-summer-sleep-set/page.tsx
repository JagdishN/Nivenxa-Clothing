import EditSubItemPage from '@/components/pages/EditSubItemPage'
import { getEditBySlug, getSubItemBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function DreamEditSummerSleepSetPage() {
  const edit    = getEditBySlug('dream-edit')
  const subItem = getSubItemBySlug('dream-edit', 'kids-summer-sleep-set')
  const products = subItem.productHandles.map(h => getProductByHandle(h))
  return <EditSubItemPage edit={edit} subItem={subItem} products={products} />
}
