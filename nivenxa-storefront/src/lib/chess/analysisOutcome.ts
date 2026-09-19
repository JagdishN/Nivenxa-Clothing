/**
 * "Won"/"Lost" only resolve for games where a side is explicitly attributed
 * to the viewer (Nivenxa Play sets this to "You") — every other source only
 * gets Draw/no-outcome, since there's no real identity to judge a win
 * against otherwise. Shared by My Games' filter chips and the landing
 * page's "My Nivenxa Games" recent-games preview so the two never disagree.
 */
export function outcomeForAnalysisGame(game: {
  white: string | null
  black: string | null
  result: string | null
}): 'won' | 'lost' | 'draw' | null {
  if (!game.result || game.result === '*') return null
  if (game.result === '1/2-1/2') return 'draw'
  const youAreWhite = game.white === 'You'
  const youAreBlack = game.black === 'You'
  if (!youAreWhite && !youAreBlack) return null
  const whiteWon = game.result === '1-0'
  if (youAreWhite) return whiteWon ? 'won' : 'lost'
  return whiteWon ? 'lost' : 'won'
}
