import Image from 'next/image'
import Link from 'next/link'
import { galleryPhotos } from '@/lib/chess/galleryPhotos'
import styles from '../Tournaments.module.scss'

export default function TournamentGalleryPage() {
  return (
    <main className={styles.page}>
      <div className={styles.backBar}>
        <Link href="/chess/tournaments" className={styles.backLink}>
          ← Back to Tournaments
        </Link>
      </div>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>NIVENXA CHESS GALLERY</p>
        <h1 className={styles.heading}>Moments from our tournaments.</h1>
        <p className={styles.subtext}>Photos from Nivenxa-organized tournaments, past and present.</p>
      </section>

      <section className={styles.groups}>
        {galleryPhotos.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.groupTitle}>No photos yet</h2>
            <p className={styles.emptyText}>Photos from our tournaments will appear here once they&rsquo;re added.</p>
          </div>
        ) : (
          <div className={styles.galleryGrid}>
            {galleryPhotos.map((photo) => (
              <figure key={photo.src} className={styles.galleryGridItem}>
                <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 45vw, 320px" className={styles.galleryGridImage} />
                {photo.caption && <figcaption className={styles.galleryCaption}>{photo.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
