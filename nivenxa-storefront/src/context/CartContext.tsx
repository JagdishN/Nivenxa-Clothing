'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  createCart,
  getCart,
  addCartLines,
  updateCartLines,
  removeCartLines,
} from '@/lib/shopify-cart'
import type { CartLineInput } from '@/lib/shopify-cart'
import type { ShopifyCart } from '@/types/shopify'

const CART_ID_KEY = 'nivenxa_cart_id'

interface CartContextValue {
  cart:       ShopifyCart | null
  loading:    boolean
  addItem:    (merchandiseId: string, quantity?: number) => Promise<void>
  updateItem: (lineId: string, quantity: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  clearCart:  () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart,    setCart]    = useState<ShopifyCart | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore cart from localStorage on mount
  useEffect(() => {
    const storedId = typeof window !== 'undefined'
      ? localStorage.getItem(CART_ID_KEY)
      : null

    if (!storedId) { setLoading(false); return }

    getCart(storedId)
      .then((c) => {
        if (c) {
          setCart(c)
        } else {
          localStorage.removeItem(CART_ID_KEY)
        }
      })
      .catch(() => localStorage.removeItem(CART_ID_KEY))
      .finally(() => setLoading(false))
  }, [])

  // Ensure a cart exists — creates one if needed, returns cart ID
  const ensureCart = useCallback(async (): Promise<string> => {
    if (cart?.id) return cart.id

    const storedId = localStorage.getItem(CART_ID_KEY)
    if (storedId) return storedId

    const newCart = await createCart()
    localStorage.setItem(CART_ID_KEY, newCart.id)
    setCart(newCart)
    return newCart.id
  }, [cart])

  const addItem = useCallback(async (merchandiseId: string, quantity = 1) => {
    const cartId = await ensureCart()
    const lines: CartLineInput[] = [{ merchandiseId, quantity }]
    const updated = await addCartLines(cartId, lines)
    setCart(updated)
  }, [ensureCart])

  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cart?.id) return
    if (quantity <= 0) {
      const updated = await removeCartLines(cart.id, [lineId])
      setCart(updated)
    } else {
      const updated = await updateCartLines(cart.id, [{ id: lineId, quantity }])
      setCart(updated)
    }
  }, [cart])

  const removeItem = useCallback(async (lineId: string) => {
    if (!cart?.id) return
    const updated = await removeCartLines(cart.id, [lineId])
    setCart(updated)
  }, [cart])

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_ID_KEY)
    setCart(null)
  }, [])

  return (
    <CartContext.Provider value={{ cart, loading, addItem, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
