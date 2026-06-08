import { Link } from '@/i18n/routing'
import styles from './EditsSection.module.css'

// ── Real product image paths ──────────────────────────────────────────────────
const TEE_OAT_WALKING    = "/images/Men/OversizedTee's/OAT%20BEIGE/walking_view.webp"
const CARGO_OLIVE_FRONT  = '/images/Unisex/cargos/darkolive/front_view.png'

// ── Data ──────────────────────────────────────────────────────────────────────

interface EditCard {
  num: string
  editName: string      // shown as small uppercase label below image
  productName: string   // Georgia serif, main product name
  fabricLine: string    // italic spec note below product name
  href: string
  imageSrc?: string     // real product photo — if absent, placeholder shown
  imageAlt?: string
  placeholderBg?: string
  ghostColor: string    // semi-transparent ghost number
}

const CARDS: EditCard[] = [
  // ── Row 1 ────────────────────────────────────────────────────────────────
  {
    num: '01',
    editName: 'The Everyday Edit',
    productName: 'Oversized Tee',
    fabricLine: '240 GSM combed cotton',
    href: '/edits/everyday-edit',
    imageSrc: TEE_OAT_WALKING,
    imageAlt: 'Oversized Tee — Oat Beige — walking view',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  {
    num: '02',
    editName: 'The Utility Edit',
    productName: 'Cargo Pant',
    fabricLine: '300 GSM enzyme canvas',
    href: '/edits/utility-edit',
    imageSrc: CARGO_OLIVE_FRONT,
    imageAlt: 'Cargo Pant — Dark Olive — studio front',
    ghostColor: 'rgba(255,255,255,0.10)',
  },
  {
    num: '03',
    editName: 'The Rest Edit',
    productName: 'Long Sleeve Lounge Set',
    fabricLine: '280 GSM French Terry',
    href: '/edits/rest-edit',
    placeholderBg: '#F5F0E8',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  // ── Row 2 ────────────────────────────────────────────────────────────────
  {
    num: '04',
    editName: "The Women's Edit",
    productName: 'A-line Kurta',
    fabricLine: '160 GSM Cotton-Modal slub',
    href: '/edits/womens-edit',
    placeholderBg: '#E8DFC8',
    ghostColor: 'rgba(0,0,0,0.08)',
  },
  {
    num: '05',
    editName: 'The Youth Studio',
    productName: 'Kids Sleepwear Set',
    fabricLine: 'Super combed cotton, 2Y–12Y',
    href: '/shop',  // /edits/youth-studio not built yet — fallback to shop
    placeholderBg: '#EAF3DE',
    ghostColor: 'rgba(0,0,0,0.08)',
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
          <Link href={'/edits' as any} className={styles.viewAll}>
            View all →
          </Link>
        </div>
      </div>

      {/* 3-column grid — 5 product cards + 1 view-all */}
      <div className={styles.cardGrid}>

        {CARDS.map((card) => (
          // Entire card is the link — no nested EXPLORE button
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link key={card.num} href={card.href as any} className={styles.card}>

            {/* Image panel */}
            <div className={styles.imagePanel}>
              {card.imageSrc ? (
                <img
                  src={card.imageSrc}
                  alt={card.imageAlt ?? card.productName}
                  className={styles.heroImg}
                  loading="lazy"
                />
              ) : (
                <div
                  className={styles.fabricPlaceholder}
                  style={{ background: card.placeholderBg }}
                />
              )}

              {/* Ghost number — bottom-right */}
              <span
                className={styles.ghostNum}
                style={{ color: card.ghostColor }}
                aria-hidden="true"
              >
                {card.num}
              </span>
            </div>

            {/* Minimal text below image */}
            <div className={styles.cardText}>
              <span className={styles.editLabel}>{card.editName}</span>
              <span className={styles.productName}>{card.productName}</span>
              <span className={styles.fabricLine}>{card.fabricLine}</span>
            </div>

          </Link>
        ))}

        {/* View All card — 6th slot, Row 2 position 3 */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={'/edits' as any} className={styles.viewAllCard}>
          <span className={styles.viewAllLabel}>05 edits</span>
          <span className={styles.viewAllTitle}>View all →</span>
        </Link>

      </div>
    </section>
  )
}
