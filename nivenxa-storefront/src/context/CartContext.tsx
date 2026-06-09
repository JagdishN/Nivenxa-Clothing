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

// ─── Local cart item (pre-Shopify / local UI cart) ────────────────────────────
export interface CartItem {
  productHandle: string
  colourSlug:    string
  size:          string
  productTitle:  string
  colourName:    string
  colourHex:     string
  imageUrl?:     string
  price:         string  // formatted string, e.g. "₹1,299"
  quantity:      number
}

interface CartContextValue {
  // ── Shopify cart ────────────────────────────────────────────────────────────
  cart:              ShopifyCart | null
  loading:           boolean
  addShopifyItem:    (merchandiseId: string, quantity?: number) => Promise<void>
  updateShopifyItem: (lineId: string, quantity: number) => Promise<void>
  removeShopifyLine: (lineId: string) => Promise<void>
  // ── Local cart ──────────────────────────────────────────────────────────────
  items:             CartItem[]
  totalCount:        number
  addItem:           (item: Omit<CartItem, 'quantity'>) => void
  removeItem:        (productHandle: string, colourSlug: string, size: string) => void
  clearCart:         () => void
  // ── Cart drawer ─────────────────────────────────────────────────────────────
  isDrawerOpen:      boolean
  openDrawer:        () => void
  closeDrawer:       () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart,     setCart]    = useState<ShopifyCart | null>(null)
  const [loading,  setLoading] = useState(true)
  const [items,    setItems]   = useState<CartItem[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // ── Drawer ──────────────────────────────────────────────────────────────────
  const openDrawer  = useCallback(() => setIsDrawerOpen(true),  [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  // ── Restore Shopify cart from localStorage on mount ────────────────────────
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

  // ── Ensure Shopify cart exists ─────────────────────────────────────────────
  const ensureCart = useCallback(async (): Promise<string> => {
    if (cart?.id) return cart.id

    const storedId = localStorage.getItem(CART_ID_KEY)
    if (storedId) return storedId

    const newCart = await createCart()
    localStorage.setItem(CART_ID_KEY, newCart.id)
    setCart(newCart)
    return newCart.id
  }, [cart])

  // ── Shopify cart operations ────────────────────────────────────────────────
  const addShopifyItem = useCallback(async (merchandiseId: string, quantity = 1) => {
    const cartId = await ensureCart()
    const lines: CartLineInput[] = [{ merchandiseId, quantity }]
    const updated = await addCartLines(cartId, lines)
    setCart(updated)
  }, [ensureCart])

  const updateShopifyItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cart?.id) return
    if (quantity <= 0) {
      const updated = await removeCartLines(cart.id, [lineId])
      setCart(updated)
    } else {
      const updated = await updateCartLines(cart.id, [{ id: lineId, quantity }])
      setCart(updated)
    }
  }, [cart])

  const removeShopifyLine = useCallback(async (lineId: string) => {
    if (!cart?.id) return
    const updated = await removeCartLines(cart.id, [lineId])
    setCart(updated)
  }, [cart])

  // ── Local cart operations ──────────────────────────────────────────────────
  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const idx = prev.findIndex(
        i => i.productHandle === item.productHandle &&
             i.colourSlug    === item.colourSlug &&
             i.size          === item.size
      )
      if (idx >= 0) {
        // Increment quantity if already in cart
        return prev.map((i, n) =>
          n === idx ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback(
    (productHandle: string, colourSlug: string, size: string) => {
      setItems(prev =>
        prev.filter(
          i => !(i.productHandle === productHandle &&
                 i.colourSlug    === colourSlug &&
                 i.size          === size)
        )
      )
    },
    []
  )

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_ID_KEY)
    setCart(null)
    setItems([])
  }, [])

  return (
    <CartContext.Provider value={{
      cart, loading,
      addShopifyItem, updateShopifyItem, removeShopifyLine,
      items, totalCount,
      addItem, removeItem, clearCart,
      isDrawerOpen, openDrawer, closeDrawer,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
