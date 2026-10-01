import Image from 'next/image'
import Link from 'next/link'
import type { GalleryPhoto } from '@/lib/chess/galleryPhotos'
import styles from './Tournaments.module.scss'

/** The Tournaments page's own preview slide — up to 5 photos, with a "View All" link to the full /chess/tournaments/gallery grid. The full set (however large) lives on that page, not here. */
export default function GallerySection({ photos }: { photos: GalleryPhoto[] }) {
  const preview = photos.slice(0, 5)

  return (
    <section className={styles.gallerySection} aria-labelledby="gallery-heading">
      <div className={styles.groupHeader}>
        <p className={styles.groupLabel}>Nivenxa Chess</p>
        <h2 id="gallery-heading" className={styles.groupTitle}>
          Gallery
        </h2>
      </div>

      {preview.length === 0 ? (
        <div className={styles.groupEmpty}>
          <p>Photos from our tournaments will appear here soon.</p>
        </div>
      ) : (
        <>
          <div className={styles.gallerySlide}>
            {preview.map((photo) => (
              <div key={photo.src} className={styles.gallerySlideItem}>
                <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 768px) 45vw, 240px" className={styles.gallerySlideImage} />
              </div>
            ))}
          </div>
          <Link href="/chess/tournaments/gallery" className={styles.archiveLink}>
            View All
          </Link>
        </>
      )}
    </section>
  )
}
