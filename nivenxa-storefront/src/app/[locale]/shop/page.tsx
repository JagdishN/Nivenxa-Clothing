import { useTranslations } from 'next-intl'
import { products } from '@/lib/products'
import ProductCard from '@/components/blocks/ProductCard'
import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './ShopPage.module.scss'

export default function ShopPage() {
  const t = useTranslations('shop')

  return (
    <div className={styles.page}>
      <AnimatedSection className={styles.pageHeader}>
        <p className={styles.eyebrow}>{t('allEyebrow')}</p>
        <h1 className={styles.title}>{t('allTitle')}</h1>
        <div className={styles.divider} />
      </AnimatedSection>

      <div className={styles.grid}>
        {products.map((product, i) => (
          <AnimatedSection key={product.id} delay={i * 0.07}>
            <ProductCard product={product} />
          </AnimatedSection>
        ))}
      </div>
    </div>
  )
}
