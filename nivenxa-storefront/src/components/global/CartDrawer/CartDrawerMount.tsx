'use client'
import { useCart } from '@/context/CartContext'
import CartDrawer from './CartDrawer'

/**
 * Thin client wrapper that reads drawer state from CartContext and renders
 * CartDrawer. Mounted once inside CartProvider in layout.tsx so the drawer
 * overlays the entire app tree.
 */
export default function CartDrawerMount() {
  const { isDrawerOpen, closeDrawer } = useCart()
  return <CartDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
}
