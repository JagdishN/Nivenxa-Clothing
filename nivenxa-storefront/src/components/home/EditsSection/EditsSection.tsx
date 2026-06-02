import { Link } from '@/i18n/routing'
import styles from './EditsSection.module.css'

// ── Image paths for rows with real product photography ────────────────────────
// Row 1: Oversized Tee / Oat Beige — walking view (drop-shoulder reads best in motion)
const TEE_OAT_WALKING = "/images/Men/OversizedTee's/OAT%20BEIGE/walking_view.webp"
// Row 2: Cargo Pant / Dark Olive — studio-front (pocket placement + leg width)
const CARGO_OLIVE_FRONT = '/images/Unisex/cargos/darkolive/front_view.png'

// ── Row data ──────────────────────────────────────────────────────────────────

interface EditSpec {
  label: string
  value: string
}

interface EditRow {
  num: string
  editName: string
  product: string
  price: string
  tagline: string
  specs: EditSpec[]
  swatches: { hex: string; active?: boolean }[]
  href: string
  imageLeft: boolean
  // real image OR fabric placeholder
  imageSrc?: string
  imageAlt?: string
  placeholderBg?: string
  placeholderLabel?: string
  placeholderProduct?: string
  ghostColor: string
}

const ROWS: EditRow[] = [
  {
    num: '01',
    editName: 'The Everyday Edit',
    product: 'Oversized Tee',
    price: '₹1,999',
    tagline: '240 GSM bio-washed combed cotton. Drop shoulder. Built for the everyday Indian wardrobe.',
    specs: [
      { label: 'Fabric',  value: '240 GSM Combed Cotton' },
      { label: 'Finish',  value: 'Bio-enzyme washed' },
      { label: 'Fit',     value: 'Relaxed drop-shoulder' },
    ],
    swatches: [
      { hex: '#D8C9B0', active: true },
      { hex: '#F0EBE0' },
      { hex: '#5C5248' },
      { hex: '#C47A4E' },
      { hex: '#A89888' },
    ],
    href: '/en/shop/over-tee-shirts',
    imageLeft: true,
    imageSrc: TEE_OAT_WALKING,
    imageAlt: 'Oversized Tee — Oat Beige — walking view',
    ghostColor: 'rgba(0,0,0,0.06)',
  },
  {
    num: '02',
    editName: 'The Utility Edit',
    product: 'Cargo Pant',
    price: '₹3,499',
    tagline: '300 GSM enzyme-washed canvas. Six-pocket utility silhouette. Built for movement, worn for life.',
    specs: [
      { label: 'Fabric',   value: '300 GSM Enzyme Canvas' },
      { label: 'Pockets',  value: 'Six utility pockets' },
      { label: 'Fit',      value: 'Relaxed straight leg' },
    ],
    swatches: [
      { hex: '#4A5240', active: true },
      { hex: '#6B7280' },
      { hex: '#D8C9B0' },
    ],
    href: '/en/shop/cargo-pants',
    imageLeft: false,
    imageSrc: CARGO_OLIVE_FRONT,
    imageAlt: 'Cargo Pant — Dark Olive — studio front view',
    ghostColor: 'rgba(255,255,255,0.08)',
  },
  {
    num: '03',
    editName: 'The Rest Edit',
    product: 'Long Sleeve Lounge Set',
    price: 'From ₹2,499',
    tagline: '280 GSM French Terry. Ultra-soft ribbed finish. Considered rest. Built for Indian nights.',
    specs: [
      { label: 'Fabric',  value: '280 GSM French Terry' },
      { label: 'Finish',  value: 'Bio-polished softener' },
      { label: 'Set',     value: 'Top + jogger pants' },
    ],
    swatches: [
      { hex: '#F5F0E8', active: true },
      { hex: '#D8C9B0' },
      { hex: '#D4A8A0' },
      { hex: '#C4C0D8' },
    ],
    href: '/en/shop',
    imageLeft: true,
    placeholderBg: '#F5F0E8',
    placeholderLabel: 'Soft Cream',
    placeholderProduct: 'Long Sleeve Lounge Set',
    ghostColor: 'rgba(0,0,0,0.06)',
  },
  {
    num: '04',
    editName: "The Women's Edit",
    product: 'A-line Kurta',
    price: 'From ₹2,499',
    tagline: '160 GSM Cotton-Modal slub. Mandarin collar. Indo-Western silhouette for everyday India.',
    specs: [
      { label: 'Fabric',    value: '160 GSM Cotton-Modal' },
      { label: 'Neckline',  value: 'Mandarin + placket' },
      { label: 'Length',    value: 'A-line, knee length' },
    ],
    swatches: [
      { hex: '#F0EBE0', active: true },
      { hex: '#D8C9B0' },
      { hex: '#C47A4E' },
      { hex: '#8E9E82' },
      { hex: '#B0A896' },
    ],
    href: '/en/shop',
    imageLeft: false,
    placeholderBg: '#E8DFC8',
    placeholderLabel: 'Warm Ivory',
    placeholderProduct: 'A-line Kurta',
    ghostColor: 'rgba(0,0,0,0.06)',
  },
  {
    num: '05',
    editName: 'The Youth Studio',
    product: 'Kids Sleepwear Set',
    price: 'From ₹1,499',
    tagline: 'Soft enough for sleep. Built for everything that comes before it. Premium comfort for young ones.',
    specs: [
      { label: 'Fabric',  value: 'Super Combed Cotton' },
      { label: 'Sizes',   value: '2Y – 12Y unisex' },
      { label: 'Fit',     value: 'Relaxed comfort fit' },
    ],
    swatches: [
      { hex: '#F0EBE0', active: true },
      { hex: '#D8C9B0' },
      { hex: '#8E9E82' },
      { hex: '#A89888' },
    ],
    href: '/en/shop',
    imageLeft: true,
    placeholderBg: '#EAF3DE',
    placeholderLabel: 'Oat Beige',
    placeholderProduct: 'Kids Sleepwear Set',
    ghostColor: 'rgba(0,0,0,0.06)',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditsSection() {
  return (
    <section className={styles.section}>
      {/* Section header */}
      <div className={styles.sectionIntro}>
        <div>
          <p className={styles.eyebrow}>Curated collections</p>
          <h2 className={styles.sectionTitle}>
            The <em>Edits</em>
          </h2>
        </div>
        <div className={styles.sectionMeta}>
          <span className={styles.editCount}>05 edits · 14 pieces</span>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link href={'/shop' as any} className={styles.viewAll}>
            View all →
          </Link>
        </div>
      </div>

      {/* Edit rows */}
      <div className={styles.editRows}>
        {ROWS.map((row) => {
          const rowClass = `${styles.editRow} ${row.imageLeft ? styles.imageLeft : styles.imageRight}`

          const imagePanel = (
            <div className={styles.heroPanel}>
              {/* Real product image */}
              {row.imageSrc && (
                <img
                  src={row.imageSrc}
                  alt={row.imageAlt ?? row.product}
                  className={styles.heroImg}
                  loading="lazy"
                />
              )}

              {/* Fabric placeholder — shown when no real image yet */}
              {!row.imageSrc && row.placeholderBg && (
                <div
                  className={styles.fabricPlaceholder}
                  style={{ background: row.placeholderBg }}
                >
                  <div className={styles.placeholderContent}>
                    <span className={styles.placeholderLabel}>{row.placeholderLabel}</span>
                    <span className={styles.placeholderProduct}>{row.placeholderProduct}</span>
                    <span className={styles.placeholderSeason}>Coming SS 2026</span>
                  </div>
                </div>
              )}

              {/* Ghost row number */}
              <span
                className={styles.ghostNum}
                style={{ color: row.ghostColor }}
                aria-hidden="true"
              >
                {row.num}
              </span>

              {/* Image bottom overlay — edit name + price */}
              <div className={styles.heroContent}>
                <div>
                  <p className={styles.heroEditName}>{row.editName}</p>
                  <p className={styles.heroProductName}>{row.product}</p>
                </div>
                <p className={styles.heroPrice}>{row.price}</p>
              </div>
            </div>
          )

          const infoPanel = (
            <div className={styles.infoPanel}>
              <div className={styles.infoTop}>
                <p className={styles.editLabel}>{row.num} — {row.editName}</p>
                <p className={styles.productName}>{row.product}</p>
                <p className={styles.tagline}>{row.tagline}</p>
                <div className={styles.specTable}>
                  {row.specs.map((spec) => (
                    <div key={spec.label} className={styles.specRow}>
                      <span className={styles.specLabel}>{spec.label}</span>
                      <span className={styles.specValue}>{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.infoBottom}>
                <div className={styles.swatchStrip}>
                  {row.swatches.map((sw, i) => (
                    <span
                      key={i}
                      className={`${styles.swatch} ${sw.active ? styles.swatchActive : ''}`}
                      style={{ background: sw.hex }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link href={row.href as any} className={styles.exploreCta}>
                  Explore →
                </Link>
              </div>
            </div>
          )

          return (
            <div key={row.num} className={rowClass}>
              {row.imageLeft ? (
                <>
                  {imagePanel}
                  {infoPanel}
                </>
              ) : (
                <>
                  {infoPanel}
                  {imagePanel}
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
