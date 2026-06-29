import { products } from '@/data/products'
import ProductTile from '@/components/blocks/ProductTile'
import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from './ShopPage.module.scss'

export default function ShopPage() {
  return (
    <div className={styles.page}>
      <AnimatedSection className={styles.pageHeader}>
        <p className={styles.eyebrow}>All Products</p>
        <h1 className={styles.title}>Shop</h1>
        <div className={styles.divider} />
      </AnimatedSection>

      <div className={styles.grid}>
        {products.filter(product => !product.archived).map((product, i) => (
          <AnimatedSection key={product.id} delay={i * 0.07}>
            <ProductTile product={product} />
          </AnimatedSection>
        ))}
      </div>
    </div>
  )
}
