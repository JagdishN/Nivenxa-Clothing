import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { Product } from '@/lib/products'
import { products } from '@/lib/products'
import AnimatedSection from '../ui/AnimatedSection'
import Price from '../ui/Price'
import styles from './FeaturedProducts.module.scss'

function buildDnaRows(product: Product): [string, string][] {
  if (!product.dna) return []
  return ([
    ['Fabric',    product.dna.fabric],
    ['Structure', product.dna.structure],
    ['Finish',    product.dna.finish],
    ['Movement',  product.dna.movement],
    ...(product.dna.climate ? [['Climate', product.dna.climate]] : []),
  ] as [string, string | undefined][]).filter((e): e is [string, string] => Boolean(e[1]))
}

function productHref(product: Product): string {
  return `/shop/${product.category}/${product.colorway.toLowerCase().replace(/\s+/g, '-')}`
}

interface EditorialRowProps {
  product: Product
  primaryView: string
  delay?: number
  conceptLabel?: string       // eyebrow concept (e.g. "Everyday Uniform")
  philosophyLabel?: string    // section heading (e.g. "GARMENT PHILOSOPHY")
  philosophyLines?: string[]  // ◇ bullet points — replaces DNA/badges when provided
}

function EditorialRow({
  product,
  primaryView,
  delay = 0,
  conceptLabel,
  philosophyLabel,
  philosophyLines,
}: EditorialRowProps) {
  const primaryImg   = product.images?.find((i) => i.view === primaryView) ?? product.images?.[0]
  const lifestyleImg = product.images?.find((i) => i.view === 'lifestyle')
  const dnaRows      = buildDnaRows(product)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const href         = productHref(product) as any
  const hasPhilosophy = Boolean(philosophyLines?.length)

  return (
    <div className={styles.editorial}>

      {/* LEFT — primary product image */}
      <AnimatedSection className={styles.leftImg} delay={delay + 0.08}>
        <Link href={href} className={styles.imgWrap}>
          {primaryImg && (
            <Image
              src={primaryImg.src}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className={styles.productImg}
            />
          )}
        </Link>
      </AnimatedSection>

      {/* CENTER — lifestyle image, offset downward */}
      <AnimatedSection className={styles.centerImg} delay={delay + 0.18}>
        {lifestyleImg && (
          <Link href={href} className={styles.imgWrap}>
            <Image
              src={lifestyleImg.src}
              alt={`${product.name} — lifestyle`}
              fill
              sizes="(max-width: 768px) 100vw, 28vw"
              className={styles.lifestyleImg}
            />
          </Link>
        )}
      </AnimatedSection>

      {/* RIGHT — editorial product information */}
      <AnimatedSection className={styles.infoCol} delay={delay + 0.28}>

        {/* Concept label overrides product status */}
        {conceptLabel ? (
          <p className={styles.infoConceptLabel}>{conceptLabel}</p>
        ) : product.status ? (
          <p className={styles.infoStatus}>{product.status}</p>
        ) : null}

        {/* Fabric / philosophy label */}
        {hasPhilosophy && philosophyLabel ? (
          <p className={styles.infoFabricLabel}>{philosophyLabel}</p>
        ) : product.fabricStory ? (
          <p className={styles.infoFabricLabel}>{product.fabricStory.label}</p>
        ) : null}

        <div className={styles.infoNameWrap}>
          <h3 className={styles.infoName}>{product.name}</h3>
        </div>

        <p className={styles.infoPrice}>
          <Price amount={product.price} />
        </p>

        {/* Philosophy mode: ◇ bullet points */}
        {hasPhilosophy ? (
          <div className={styles.infoPhilosophy}>
            {philosophyLabel && (
              <p className={styles.infoPhilosophyHeading}>{philosophyLabel}</p>
            )}
            {philosophyLines!.map((line) => (
              <p key={line} className={styles.infoPhilosophyLine}>
                {line}
              </p>
            ))}
          </div>
        ) : (
          <>
            {product.fabricStory?.lines && (
              <div className={styles.infoFabricLines}>
                {product.fabricStory.lines.map((line) => (
                  <p key={line} className={styles.infoFabricLine}>{line}</p>
                ))}
              </div>
            )}

            {product.badges && product.badges.length > 0 && (
              <div className={styles.infoBadges}>
                {product.badges.map((b) => (
                  <span key={b} className={styles.infoBadge}>{b}</span>
                ))}
              </div>
            )}

            {dnaRows.length > 0 && (
              <div className={styles.infoDna}>
                <p className={styles.infoDnaLabel}>PRODUCT DNA</p>
                <div className={styles.infoDnaTable}>
                  {dnaRows.map(([label, value]) => (
                    <div key={label} className={styles.infoDnaRow}>
                      <span className={styles.infoDnaAttr}>{label}</span>
                      <span className={styles.infoDnaVal}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Link href={href} className={styles.infoCta}>
          Explore Piece
          <span className={styles.infoCtaArrow}>→</span>
        </Link>

      </AnimatedSection>
    </div>
  )
}

export default function FeaturedProducts() {
  const t = useTranslations('featured')

  const featuredCargo =
    products.find((p) => p.featured && p.category === 'cargo-pants') ??
    products.find((p) => p.category === 'cargo-pants')!

  const featuredTee =
    products.find((p) => p.featured && p.category === 'over-tee-shirts') ??
    products.find((p) => p.category === 'over-tee-shirts')!

  return (
    <section className={styles.section}>
      <AnimatedSection className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <h2 className={styles.heading}>{t('heading')}</h2>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={'/shop' as any} className={styles.viewAllLink}>
          {t('viewAll')} →
        </Link>
      </AnimatedSection>

      <EditorialRow product={featuredCargo} primaryView="front"   delay={0} />

      <div className={styles.rowDivider} aria-hidden="true" />

      <EditorialRow
        product={featuredTee}
        primaryView="walking"
        delay={0.1}
        conceptLabel="Everyday Uniform"
        philosophyLabel="GARMENT PHILOSOPHY"
        philosophyLines={[
          'Relaxed drop-shoulder structure',
          'Premium-weight combed cotton',
          'Muted everyday tones',
          'Soft lived-in texture',
          'Designed for repeat wear',
        ]}
      />
    </section>
  )
}
