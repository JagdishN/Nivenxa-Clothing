'use client'
import MyPuzzlesList from '../../analysis/my-puzzles/MyPuzzlesList'

/** The existing saved-positions list, reused as is (client-side: it loads by the signed-in account, with its own empty state). */
export default function SavedPositions() {
  return <MyPuzzlesList />
}
