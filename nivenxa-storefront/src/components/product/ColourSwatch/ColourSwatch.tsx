'use client'
import type { ProductColour } from '@/types/product'
import styles from './ColourSwatch.module.css'

const VISIBLE_DEFAULT = 5

interface Props {
  colours: ProductColour[]
  activeColour: ProductColour
  onColourChange: (colour: ProductColour) => void
  expanded: boolean
  onExpandedChange: (value: boolean) => void
}

export default function ColourSwatch({
  colours,
  activeColour,
  onColourChange,
  expanded,
  onExpandedChange,
}: Props) {
  const visibleColours = expanded
    ? colours
    : colours.slice(0, VISIBLE_DEFAULT)

  const hiddenCount = colours.length - VISIBLE_DEFAULT

  return (
    <div className={styles.wrapper}>

      {/* Selected colour name — always visible, updates on every swatch click */}
      <p className={styles.activeName}>{activeColour.label}</p>

      <div className={styles.grid}>

        {visibleColours.map(colour => (
          <button
            key={colour.slug}
            type="button"
            className={`${styles.tile} ${colour.slug === activeColour.slug ? styles.tileActive : ''}`}
            onClick={() => onColourChange(colour)}
            aria-label={colour.label}
            aria-pressed={colour.slug === activeColour.slug}
            title={colour.label}
          >
            <span
              className={styles.swatch}
              style={{ background: colour.hex }}
            />
            {/* Label only on active tile — inactive tiles rely on activeName above */}
            {colour.slug === activeColour.slug && (
              <span className={styles.tileLabel}>{colour.label}</span>
            )}
          </button>
        ))}

        {/* More / Less toggle — inline in grid */}
        {!expanded && hiddenCount > 0 && (
          <button
            type="button"
            className={styles.moreBtn}
            onClick={() => onExpandedChange(true)}
            aria-label={`Show ${hiddenCount} more colours`}
          >
            + {hiddenCount} more
          </button>
        )}
        {expanded && (
          <button
            type="button"
            className={styles.moreBtn}
            onClick={() => onExpandedChange(false)}
            aria-label="Show fewer colours"
          >
            Show less
          </button>
        )}

      </div>
    </div>
  )
}
