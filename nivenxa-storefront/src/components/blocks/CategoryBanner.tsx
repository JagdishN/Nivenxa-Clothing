import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import AnimatedSection from '../ui/AnimatedSection'
import Button from '../ui/Button'
import TextureOverlay from '../ui/TextureOverlay'
import styles from './CategoryBanner.module.scss'

export default function CategoryBanner() {
  const t = useTranslations('categories')

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <AnimatedSection className={styles.sectionHeader}>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h2 className={styles.heading}>{t('heading')}</h2>
        </AnimatedSection>

        <div className={styles.grid}>
          {/* Women's — no product image yet; keep terracotta fallback */}
          <AnimatedSection delay={0.1}>
            <div className={styles.panel}>
              <div className={`${styles.panelBg} ${styles.womenBg}`} />
              <TextureOverlay opacity={0.75} soft />
              <div className={`${styles.panelFade} ${styles.womenFade}`} />
              <div className={styles.panelContent}>
                <p className={styles.womenEyebrow}>{t('women.index')} — {t('women.label')}</p>
                <h3 className={styles.womenTitle}>{t('women.title')}</h3>
                <p className={styles.womenBody}>{t('women.body')}</p>
                <Link href="/shop/womens">
                  <Button className={styles.categoryBtn}>{t('women.cta')}</Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Unisex — cargo dark-olive studio-front */}
          <AnimatedSection delay={0.2}>
            <div className={styles.panel}>
              <div className={`${styles.panelBg} ${styles.unisexBg}`}>
                <img
                  src="/images/Unisex/cargos/darkolive/front_view.png"
                  alt=""
                  className={styles.panelImg}
                  aria-hidden="true"
                />
              </div>
              <TextureOverlay opacity={0.55} soft />
              <div className={`${styles.panelFade} ${styles.unisexFade}`} />
              <div className={styles.panelContent}>
                <p className={styles.unisexEyebrow}>{t('unisex.index')} — {t('unisex.label')}</p>
                <h3 className={styles.unisexTitle}>{t('unisex.title')}</h3>
                <p className={styles.unisexBody}>{t('unisex.body')}</p>
                <Link href="/shop/unisex">
                  <Button className={styles.categoryBtn}>{t('unisex.cta')}</Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>

          {/* Youth Studio — keep sage background; add "Coming SS 2026" */}
          <AnimatedSection delay={0.3}>
            <div className={styles.panel}>
              <div className={`${styles.panelBg} ${styles.kidsBg}`} />
              <TextureOverlay opacity={0.65} soft />
              <div className={`${styles.panelFade} ${styles.kidsFade}`} />
              <div className={styles.panelContent}>
                <p className={styles.kidsEyebrow}>{t('kids.index')} — {t('kids.label')}</p>
                <h3 className={styles.kidsTitle}>{t('kids.title')}</h3>
                <p className={styles.kidsBody}>{t('kids.body')}</p>
                <Link href="/shop/youth-studio">
                  <Button className={styles.categoryBtn}>{t('kids.cta')}</Button>
                </Link>
                <p className={styles.comingSoon}>Coming SS 2026</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
