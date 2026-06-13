import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import AnimatedSection from '../ui/AnimatedSection'
import styles from './CategoryBanner.module.scss'

export default function CategoryBanner() {
  const t = useTranslations('categories')

  return (
    <section className={styles.section} data-section="shop-by-audience">
      <div className={styles.inner}>
        <AnimatedSection className={styles.sectionHeader}>
          <div className={styles.headerLeft}>
            <p className={styles.eyebrow}>{t('eyebrow')}</p>
            <h2 className={styles.heading}>{t('heading')}</h2>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.metadata}>04 Collections</span>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link href={'/shop' as any} className={styles.viewAllLink}>Explore All →</Link>
          </div>
        </AnimatedSection>

        <div className={styles.grid}>

          {/* Men's — bio-washed cotton colour block */}
          <AnimatedSection delay={0.1}>
            <Link href="/shop/mens" className={styles.card} aria-label="Shop Men's collection">
              <div className={styles.cardImage}>
                <div className={styles.colorBlock} style={{ backgroundColor: '#8B7355' }} />
                <span className={styles.ghostNumber} aria-hidden="true">01</span>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>Men&#39;s</h3>
                <p className={styles.cardBody}>Heavyweight tees and cargo pants in bio-washed cotton. Built for the Indian daily wardrobe.</p>
                <span className={styles.viewCta}>View →</span>
              </div>
            </Link>
          </AnimatedSection>

          {/* Women's — terracotta colour block placeholder */}
          <AnimatedSection delay={0.2}>
            <Link href="/shop/womens" className={styles.card} aria-label="Shop Women's collection">
              <div className={styles.cardImage}>
                <div className={`${styles.colorBlock} ${styles.womenColor}`} />
                <span className={styles.ghostNumber} aria-hidden="true">02</span>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('women.title')}</h3>
                <p className={styles.cardBody}>{t('women.body')}</p>
                <span className={styles.viewCta}>View →</span>
              </div>
            </Link>
          </AnimatedSection>

          {/* Unisex — cargo dark-olive studio-front */}
          <AnimatedSection delay={0.3}>
            <Link href="/shop/unisex" className={styles.card} aria-label="Shop Unisex collection">
              <div className={styles.cardImage}>
                <img
                  src="/images/Unisex/cargos/darkolive/front_view.png"
                  alt=""
                  className={styles.cardImg}
                  aria-hidden="true"
                />
                <span className={styles.ghostNumber} aria-hidden="true">03</span>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('unisex.title')}</h3>
                <p className={styles.cardBody}>{t('unisex.body')}</p>
                <span className={styles.viewCta}>View →</span>
              </div>
            </Link>
          </AnimatedSection>

          {/* Youth Studio — sage colour block */}
          <AnimatedSection delay={0.4}>
            <Link href="/shop/youth-studio" className={styles.card} aria-label="Shop Youth Studio collection">
              <div className={styles.cardImage}>
                <div className={`${styles.colorBlock} ${styles.kidsColor}`} />
                <span className={styles.ghostNumber} aria-hidden="true">04</span>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t('kids.title')}</h3>
                <p className={styles.cardBody}>{t('kids.body')}</p>
                <span className={styles.viewCta}>View →</span>
              </div>
            </Link>
          </AnimatedSection>

        </div>
      </div>
    </section>
  )
}
