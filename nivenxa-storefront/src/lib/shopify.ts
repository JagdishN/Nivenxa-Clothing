import type { Product } from '@/types'

export async function fetchProducts(): Promise<Product[]> {
  return []
}

export async function fetchProductByHandle(_handle: string): Promise<Product | null> {
  return null
}
