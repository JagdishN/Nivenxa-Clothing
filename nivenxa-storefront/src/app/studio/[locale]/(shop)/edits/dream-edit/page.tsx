import EditPage from '@/components/pages/EditPage'
import { getEditBySlug } from '@/data/edits'
import { getProductByHandle } from '@/data/products'

export default function DreamEditPage() {
  const edit = getEditBySlug('dream-edit')
  const products = edit.subItems
    .flatMap(s => s.productHandles)
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .map(h => getProductByHandle(h))
  return <EditPage edit={edit} products={products} />
}
