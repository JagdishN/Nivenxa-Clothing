import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getProductsByCategory, getProductsByGender } from '@/lib/products'
import type { Product } from '@/types'
import ProductCard from '@/components/blocks/ProductCard'
import AnimatedSection from '@/components/ui/AnimatedSection'
import styles from '../ShopPage.module.scss'

const VALID_SLUGS = [
  'women',
  'kids',
  'unisex',
  'women-lounge-sets',
  'women-indo-western',
  'boys-premium',
  'girls-premium',
  'kids-nightwear',
  'cargo-pants',
  'over-tee-shirts',
] as const

type ValidSlug = typeof VALID_SLUGS[number]

export function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }))
}

const GENDER_SLUGS: ValidSlug[] = ['women', 'kids', 'unisex']

export default async function ShopCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!VALID_SLUGS.includes(slug as ValidSlug)) notFound()

  const t = await getTranslations('shop')

  const configs: Record<ValidSlug, { eyebrow: string; title: string; description: string }> = {
    women:               { eyebrow: t('womenEyebrow'),            title: t('womenTitle'),            description: t('womenDescription') },
    kids:                { eyebrow: t('kidsEyebrow'),             title: t('kidsTitle'),             description: t('kidsDescription') },
    unisex:              { eyebrow: t('unisexEyebrow'),           title: t('unisexTitle'),           description: t('unisexDescription') },
    'women-lounge-sets': { eyebrow: t('womenLoungeSetsEyebrow'),  title: t('womenLoungeSetsTitle'),  description: t('womenLoungeSetsDescription') },
    'women-indo-western':{ eyebrow: t('womenIndoWesternEyebrow'), title: t('womenIndoWesternTitle'), description: t('womenIndoWesternDescription') },
    'boys-premium':      { eyebrow: t('boysPremiumEyebrow'),      title: t('boysPremiumTitle'),      description: t('boysPremiumDescription') },
    'girls-premium':     { eyebrow: t('girlsPremiumEyebrow'),     title: t('girlsPremiumTitle'),     description: t('girlsPremiumDescription') },
    'kids-nightwear':    { eyebrow: t('kidsNightwearEyebrow'),    title: t('kidsNightwearTitle'),    description: t('kidsNightwearDescription') },
    'cargo-pants':       { eyebrow: t('cargoPantsEyebrow'),       title: t('cargoPantsTitle'),       description: t('cargoPantsDescription') },
    'over-tee-shirts':   { eyebrow: t('overTeeShirtsEyebrow'),    title: t('overTeeShirtsTitle'),    description: t('overTeeShirtsDescription') },
  }

  const config = configs[slug as ValidSlug]

  const productList = GENDER_SLUGS.includes(slug as ValidSlug)
    ? getProductsByGender(slug as Product['gender'])
    : getProductsByCategory(slug as Product['category'])

  return (
    <div className={styles.page}>
      <AnimatedSection className={styles.pageHeader}>
        <p className={styles.eyebrow}>{config.eyebrow}</p>
        <h1 className={styles.title}>{config.title}</h1>
        <p className={styles.description}>{config.description}</p>
        <div className={styles.divider} />
      </AnimatedSection>

      <div className={styles.grid}>
        {productList.map((product, i) => (
          <AnimatedSection key={product.id} delay={i * 0.1}>
            <ProductCard product={product} />
          </AnimatedSection>
        ))}
      </div>

      {/* 12. Product Story section */}
      <AnimatedSection className={styles.productStory}>
        <p className={styles.storyEyebrow}>GARMENT PHILOSOPHY</p>
        <h2 className={styles.storyHeading}>Designed for Everyday Movement</h2>
        <div className={styles.storyGrid}>
          <div className={styles.storyCard}>
            <p className={styles.storyCardLabel}>Fit Philosophy</p>
            <h3 className={styles.storyCardTitle}>Relaxed Utility</h3>
            <p className={styles.storyCardBody}>
              Every NIVENXA garment is cut for real movement. Structured enough to hold form, relaxed enough to move freely — from morning to evening, city to terrain.
            </p>
          </div>
          <div className={styles.storyCard}>
            <p className={styles.storyCardLabel}>Fabric Philosophy</p>
            <h3 className={styles.storyCardTitle}>Material Intelligence</h3>
            <p className={styles.storyCardBody}>
              We select fabrics for weight, hand-feel, and longevity. Bio-washed, stonewashed, and enzyme-treated finishes are chosen to improve with every wear — not degrade.
            </p>
          </div>
          <div className={styles.storyCard}>
            <p className={styles.storyCardLabel}>Wash Philosophy</p>
            <h3 className={styles.storyCardTitle}>Pre-Treated Finish</h3>
            <p className={styles.storyCardBody}>
              Our wash treatments are applied before the garment reaches you. The result: immediate softness, dimensional stability, and a lived-in quality from day one.
            </p>
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}
