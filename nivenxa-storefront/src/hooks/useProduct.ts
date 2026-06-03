// SHOPIFY TODO: replace products.find() with a Storefront API call:
//   const data = await storefrontQuery(GET_PRODUCT, { handle })
//   return { product: normalizeProduct(data.product), ... }
// Everything else in this hook and all components stays identical.

import { useMemo } from 'react'
import { products } from '@/data/products'
import type { Product, ProductColour } from '@/types/product'

interface UseProductResult {
  product: Product | null
  activeColour: ProductColour | null
  loading: boolean
  error: string | null
}

export function useProduct(handle: string, colourSlug: string): UseProductResult {
  const product = useMemo(
    () => products.find(p => p.handle === handle) ?? null,
    [handle]
  )

  const activeColour = useMemo(
    () =>
      product?.colours.find(c => c.slug === colourSlug) ??
      product?.colours[0] ??
      null,
    [product, colourSlug]
  )

  return {
    product,
    activeColour,
    loading: false,
    error: product ? null : 'Product not found',
  }
}
