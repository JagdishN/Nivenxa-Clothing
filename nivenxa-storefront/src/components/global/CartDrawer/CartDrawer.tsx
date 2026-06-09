'use client'
import { useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import styles from './CartDrawer.module.css'

interface CartDrawerProps {
  isOpen:  boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalCount, removeItem, clearCart } = useCart()

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const subtotal = items.reduce((sum, item) => {
    const raw = item.price
      .replace(/From\s/i, '')
      .replace('₹', '')
      .replace(/,/g, '')
    const price = parseFloat(raw)
    return sum + (isNaN(price) ? 0 : price * item.quantity)
  }, 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Shopping bag"
        aria-modal="true"
      >

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>
            Your Bag
            {totalCount > 0 && (
              <span className={styles.count}>{totalCount}</span>
            )}
          </span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close bag"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Your bag is empty</p>
              <p className={styles.emptySubtitle}>Add something you love.</p>
              <button
                className={styles.shopBtn}
                onClick={onClose}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item, i) => (
              <div
                key={`${item.productHandle}-${item.colourSlug}-${item.size}-${i}`}
                className={styles.item}
              >
                {/* Colour swatch / product image */}
                <div
                  className={styles.itemImage}
                  style={{ background: item.colourHex }}
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productTitle}
                      className={styles.itemImg}
                    />
                  )}
                </div>

                {/* Item info */}
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>{item.productTitle}</span>
                  <span className={styles.itemMeta}>
                    {item.colourName} · Size {item.size}
                  </span>
                  <div className={styles.itemBottom}>
                    <span className={styles.itemPrice}>{item.price}</span>
                    {item.quantity > 1 && (
                      <span className={styles.itemQty}>× {item.quantity}</span>
                    )}
                  </div>
                </div>

                {/* Remove */}
                <button
                  className={styles.removeBtn}
                  onClick={() => removeItem(item.productHandle, item.colourSlug, item.size)}
                  aria-label={`Remove ${item.productTitle}`}
                >
                  ✕
                </button>

              </div>
            ))
          )}
        </div>

        {/* Footer — only when items exist */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.subtotalRow}>
              <span className={styles.subtotalLabel}>Subtotal</span>
              <span className={styles.subtotalValue}>
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className={styles.taxNote}>
              Inclusive of all taxes · Free delivery above ₹999
            </p>
            <button
              className={styles.checkoutBtn}
              onClick={() => {
                // Shopify checkout swap point
                alert('Checkout coming soon')
              }}
            >
              PROCEED TO CHECKOUT
            </button>
            <button
              className={styles.clearBtn}
              onClick={clearCart}
            >
              Clear bag
            </button>
          </div>
        )}

      </div>
    </>
  )
}
