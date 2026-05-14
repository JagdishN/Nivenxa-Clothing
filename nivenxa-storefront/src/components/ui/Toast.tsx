'use client'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EASE_OUT_EXPO } from '@/lib/motion'
import styles from './Toast.module.scss'

export interface ToastItem {
  id:      string
  type:    'success' | 'error'
  message: string
}

function ToastCard({
  toast,
  onRemove,
}: {
  toast:    ToastItem
  onRemove: (id: string) => void
}) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4500)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type]}`}
      initial={{ opacity: 0, x: 64, y: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 64 }}
      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      role="alert"
      aria-live="polite"
      onClick={() => onRemove(toast.id)}
    >
      <span className={styles.dot} />
      <p className={styles.message}>{toast.message}</p>
    </motion.div>
  )
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts:   ToastItem[]
  onRemove: (id: string) => void
}) {
  return (
    <div className={styles.container}>
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}
