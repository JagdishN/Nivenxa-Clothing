import { redirect } from 'next/navigation'

// Old bookmark → My Activity → My Puzzles (which also keeps the positions saved from analysed games).
export default function OldMyPuzzles() {
  redirect('/chess/activity/puzzles')
}
