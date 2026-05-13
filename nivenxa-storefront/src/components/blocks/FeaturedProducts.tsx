import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { products } from '@/lib/products'
import ProductCard from './ProductCard'
import AnimatedSection from '../ui/AnimatedSection'
import Button from '../ui/Button'
import styles from './FeaturedProducts.module.scss'

export default function FeaturedProducts() {
  const t = useTranslations('featured')
  const [heroProduct, second, third, bannerProduct] = products

  return (
    <section className={styles.section}>
      <AnimatedSection className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h2 className={styles.heading}>{t('heading')}</h2>
        </div>
        <Link href="/shop">
          <Button variant="outline">{t('viewAll')}</Button>
        </Link>
      </AnimatedSection>

      <div className={styles.grid}>
        <AnimatedSection className={styles.heroCol} delay={0.08}>
          <ProductCard product={heroProduct} large />
        </AnimatedSection>

        <div className={styles.rightCol}>
          <div className={styles.twoUp}>
            <AnimatedSection delay={0.16}>
              <ProductCard product={second} />
            </AnimatedSection>
            <AnimatedSection delay={0.24}>
              <ProductCard product={third} />
            </AnimatedSection>
          </div>

          {bannerProduct && (
            <AnimatedSection delay={0.32}>
              <div className={styles.bannerCard}>
                <div>
                  <p className={styles.bannerEyebrow}>{t('newArrival')}</p>
                  <h3 className={styles.bannerName}>{bannerProduct.name}</h3>
                  <p className={styles.bannerMeta}>
                    ₹{bannerProduct.price.toLocaleString('en-IN')} — {bannerProduct.fabric}
                  </p>
                </div>
                <Button>{t('addToCart')}</Button>
              </div>
            </AnimatedSection>
          )}
        </div>
      </div>
    </section>
  )
}
