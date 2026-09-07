const FILES = 'abcdefgh'

/** a1 is a dark square (the standard convention) — every other square alternates from there. */
export function isLightSquare(square: string): boolean {
  const file = FILES.indexOf(square[0])
  const rank = parseInt(square[1], 10)
  return (file + rank) % 2 === 0
}

function allSquares(): string[] {
  const out: string[] = []
  for (const f of FILES) for (let r = 1; r <= 8; r++) out.push(`${f}${r}`)
  return out
}

export function allLightSquares(): string[] {
  return allSquares().filter(isLightSquare)
}

export function allDarkSquares(): string[] {
  return allSquares().filter((sq) => !isLightSquare(sq))
}
