import type { Product, ProductSizeChart } from '@/types/product'
import { formatPrice } from '@/utils/formatPrice'
import { LEGAL_ENTITY, LEGAL_ENTITY_ADDRESS_INLINE } from '@/lib/legalEntity'
import styles from './ProductDetails.module.css'

const MARKETED_BY = `${LEGAL_ENTITY.name}, ${LEGAL_ENTITY_ADDRESS_INLINE}`

/**
 * Collapsible on mobile, always open on desktop — a native <details>, open
 * by default (so it's never collapsed before JS/CSS loads), with a desktop
 * media query that forces the body visible and the summary non-interactive
 * regardless of the open/closed DOM state. No client-side state needed.
 */
/** cm size chart, or an honest "coming soon" when no real measurements exist yet. */
export function SizeChartTable({ sizeChart }: { sizeChart?: ProductSizeChart }) {
  if (!sizeChart) return <p className={styles.sizeChartEmpty}>Size chart coming soon</p>
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Size</th>
            {sizeChart.columns.map((col) => (
              <th key={col} className={styles.th}>
                {col} (cm)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sizeChart.rows.map((row) => (
            <tr key={row.size}>
              <td className={styles.td}>{row.size}</td>
              {sizeChart.columns.map((col) => (
                <td key={col} className={styles.td}>
                  {row.measurements[col.toLowerCase()] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ProductDetails({ product }: { product: Product }) {
  const countryOfOrigin = product.countryOfOrigin ?? 'India'
  const sizeChart = product.sizeChart
  // Render nothing unless a certification is verified AND has a certificate to link to.
  const verifiedCertifications = (product.certifications ?? []).filter((c) => c.verified && !!c.certificateUrl)

  return (
    <details className={styles.details} open>
      <summary className={styles.summary}>
        Product details
        <span className={styles.chevron} aria-hidden="true">
          ⌄
        </span>
      </summary>

      <div className={styles.body}>
        <dl className={styles.specList}>
          <div className={styles.specRow}>
            <dt className={styles.specLabel}>Marketed by</dt>
            <dd className={styles.specValue}>{MARKETED_BY}</dd>
          </div>
          <div className={styles.specRow}>
            <dt className={styles.specLabel}>Country of origin</dt>
            <dd className={styles.specValue}>{countryOfOrigin}</dd>
          </div>
          <div className={styles.specRow}>
            <dt className={styles.specLabel}>Consumer care</dt>
            <dd className={styles.specValue}>
              <a href={`mailto:${LEGAL_ENTITY.email}`} className={styles.specLink}>
                {LEGAL_ENTITY.email}
              </a>{' '}
              ·{' '}
              <a href={LEGAL_ENTITY.phoneTel} className={styles.specLink}>
                {LEGAL_ENTITY.phone}
              </a>
            </dd>
          </div>
          <div className={styles.specRow}>
            <dt className={styles.specLabel}>MRP</dt>
            <dd className={styles.specValue}>
              {formatPrice(product)} (inclusive of all taxes)
            </dd>
          </div>
        </dl>

        {verifiedCertifications.length > 0 && (
          <dl className={styles.specList}>
            {verifiedCertifications.map((cert) => (
              <div key={cert.name} className={styles.specRow}>
                <dt className={styles.specLabel}>{cert.name}</dt>
                <dd className={styles.specValue}>
                  {cert.scope}{' '}
                  <a href={cert.certificateUrl} className={styles.specLink} target="_blank" rel="noopener noreferrer">
                    View certificate
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className={styles.sizeChart} id="size-chart">
          <p className={styles.specLabel}>Size chart</p>
          <SizeChartTable sizeChart={sizeChart} />
        </div>
      </div>
    </details>
  )
}
