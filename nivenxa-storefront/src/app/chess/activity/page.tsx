import { redirect } from 'next/navigation'

// /chess/activity itself has no content: it opens the first tab.
export default function ActivityIndex() {
  redirect('/chess/activity/games')
}
