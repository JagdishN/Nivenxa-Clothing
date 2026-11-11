import ActivityTabs from './ActivityTabs'
import styles from './Activity.module.scss'

// The shell (heading + tabs) belongs to the layout, so it is on screen the instant a My Activity link is clicked; each
// tab's own loading.tsx then fills the area below with skeleton rows while its data loads.
export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>My Activity</h1>
      <p className={styles.sub}>Your games, saved analyses and puzzle history.</p>
      <ActivityTabs />
      {children}
    </main>
  )
}
