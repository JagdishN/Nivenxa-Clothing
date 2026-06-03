'use client'

import { Link } from '@/i18n/routing'
import type { StyledWith as StyledWithType } from '@/types/product'
import styles from './StyledWith.module.css'

interface Props {
  styledWith: StyledWithType
  activeColourSlug: string
}

export default function StyledWithBlock({ styledWith, activeColourSlug }: Props) {
  const pairing = styledWith.pairings[activeColourSlug]

  if (!pairing) return null

  const href = `/shop/${styledWith.productHandle}/${pairing.colourSlug}`

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Styled With</span>

      <div className={styles.item}>
        <div className={styles.imageBox}>
          <div
            className={styles.imagePlaceholder}
            style={{ background: pairing.hex }}
          />
        </div>

        <div className={styles.info}>
          <span className={styles.productName}>{styledWith.productName}</span>
          <span className={styles.colourLine}>
            <span
              className={styles.colourDot}
              style={{ background: pairing.hex }}
            />
            {pairing.colourName}
          </span>
          <span className={styles.price}>{styledWith.price}</span>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Link href={href as any} className={styles.viewBtn}>
          View →
        </Link>
      </div>
    </div>
  )
}
