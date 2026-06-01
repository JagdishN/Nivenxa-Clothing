// SHOPIFY TODO: replace localStorage cart with Storefront API:
//   cartCreate / cartLinesAdd mutations.
//   variantKey becomes Shopify variantId (GID string).
//   Hook interface stays identical — no component changes.

'use client'
import { useState, useEffect, useCallback } from 'react'

interface CartLine {
  productId: string
  variantKey: string  // "{colourSlug}-{sizeLabel}" for dummy data
  quantity: number
}

interface LocalCart {
  lines: CartLine[]
  id: null
}

const STORAGE_KEY = 'nivenxa-cart'

function readCart(): LocalCart {
  if (typeof window === 'undefined') return { lines: [], id: null }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : { lines: [], id: null }
  } catch {
    return { lines: [], id: null }
  }
}

export function useCart() {
  const [cart, setCart] = useState<LocalCart>({ lines: [], id: null })

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setCart(readCart())
  }, [])

  const addToCart = useCallback(
    (productId: string, variantKey: string, quantity = 1) => {
      setCart(prev => {
        const existingIdx = prev.lines.findIndex(
          l => l.productId === productId && l.variantKey === variantKey
        )
        const newLines: CartLine[] =
          existingIdx >= 0
            ? prev.lines.map((l, i) =>
                i === existingIdx ? { ...l, quantity: l.quantity + quantity } : l
              )
            : [...prev.lines, { productId, variantKey, quantity }]

        const newCart: LocalCart = { ...prev, lines: newLines }
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart))
        }
        return newCart
      })
    },
    []
  )

  const cartCount = cart.lines.reduce((sum, line) => sum + line.quantity, 0)

  return { cart, addToCart, cartCount }
}
