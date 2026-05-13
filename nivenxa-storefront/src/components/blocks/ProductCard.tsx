'use client'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { Product } from '@/types'
import Button from '../ui/Button'
import TextureOverlay from '../ui/TextureOverlay'
import styles from './ProductCard.module.scss'

interface ProductCardProps {
  product: Product
  large?: boolean
}

export default function ProductCard({ product, large = false }: ProductCardProps) {
  const t = useTranslations('product')

  return (
    <div className={styles.card}>
      <div className={large ? `${styles.imageWrap} ${styles.imageWrapLarge}` : `${styles.imageWrap} ${styles.imageWrapStd}`}>
        <motion.div
          className={styles.imageFill}
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Dynamic gradient — only truly runtime data uses CSS custom prop */}
          <div
            className={styles.gradient}
            style={{ '--gradient': product.gradient } as React.CSSProperties}
          >
            <TextureOverlay opacity={0.8} />
          </div>
        </motion.div>

        <div className={styles.addToCart}>
          <Button fullWidth>{t('addToCart')}</Button>
        </div>

        <div className={styles.badge}>{product.colorway}</div>
      </div>

      <div className={styles.info}>
        <p className={styles.fabric}>{product.fabric}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>₹{product.price.toLocaleString('en-IN')}</p>
      </div>
    </div>
  )
}
