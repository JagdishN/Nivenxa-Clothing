import { Link } from '@/i18n/routing'
import { edits } from '@/data/edits'
import { getProductByHandle } from '@/data/products'
import { getPrimaryImage } from '@/utils/getProductImages'
import styles from './AllEditsPage.module.css'

export default function AllEditsPage() {
  return (
    <div className={styles.section}>

      <div className={styles.header}>
        <span className={styles.eyebrow}>All Edits</span>
        <h1 className={styles.title}>The Edits</h1>
        <div className={styles.rule} />
      </div>

      <div className={styles.grid}>
        {edits.map(edit => {
          const p      = getProductByHandle(edit.featuredProductHandle)
          const colour = p.colours.find(c => c.slug === edit.featuredColourSlug) ?? p.colours[0]
          const heroSrc = edit.heroImageUrl || getPrimaryImage(colour.images).src
          const storySummary = edit.story.split('.')[0] + '.'
          return (
            <Link
              key={edit.slug}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={`/edits/${edit.slug}` as any}
              className={styles.card}
            >
              <div className={styles.cardImageWrap}>
                <img
                  src={heroSrc}
                  alt={edit.name}
                  className={styles.cardImage}
                />
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{edit.name}</p>
                <p className={styles.cardStory}>{storySummary}</p>
                <span className={styles.cardCta}>Explore Edit →</span>
              </div>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
