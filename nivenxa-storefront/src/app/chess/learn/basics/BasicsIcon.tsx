import styles from './BasicsList.module.scss'

const SLUGS = [
  'the-chessboard',
  'meet-the-pieces',
  'set-up-the-pieces',
  'pawns',
  'rooks',
  'bishops',
  'knights',
  'queen',
  'king',
  'check',
  'escaping-check',
  'checkmate',
  'mini-game',
] as const

export type BasicsIconSlug = (typeof SLUGS)[number]

// One glyph per real chess piece (the solid/"black" Unicode chess symbols
// read better than the outline "white" set at this size).
const KING = '♚'
const ROOK = '♜'
const BISHOP = '♝'
const KNIGHT = '♞'
const QUEEN = '♛'
const PAWN = '♟'

const CX = 16
const CY = 17

function polar(angleDeg: number, r: number, cx = CX, cy = CY) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// A bold ray with a chevron arrowhead — reserved for icons where direction
// specifically IS the point (Pawn's forward-only move, Knight's L-jump,
// Check/Escaping Check's attack/escape). Rook/Bishop/Queen use a plain
// cross/X/star instead (see below) — a piece can move to any square along
// that line, so an arrowhead pointing one way would be misleading, and a
// bare line reads cleaner at this size anyway.
function Arrow({ angle, from = 8, to = 15, head = 3 }: { angle: number; from?: number; to?: number; head?: number }) {
  const start = polar(angle, from)
  const end = polar(angle, to)
  const headAngle = to >= from ? angle : angle + 180
  const left = polar(headAngle + 145, head, end.x, end.y)
  const right = polar(headAngle - 145, head, end.x, end.y)
  return (
    <>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      <path d={`M${left.x.toFixed(2)} ${left.y.toFixed(2)} L${end.x.toFixed(2)} ${end.y.toFixed(2)} L${right.x.toFixed(2)} ${right.y.toFixed(2)}`} />
    </>
  )
}

// A plain ray, no arrowhead — for Rook (cross)/Bishop (X)/Queen (star),
// where the line itself is the whole idea ("moves along this line") and an
// arrowhead would just add clutter at this size.
function Ray({ angle, from = 8, to = 15 }: { angle: number; from?: number; to?: number }) {
  const start = polar(angle, from)
  const end = polar(angle, to)
  return <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
}

function Piece({ glyph, x = CX, y = 21, size = 18 }: { glyph: string; x?: number; y?: number; size?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fill="var(--chess-purple)" stroke="none">
      {glyph}
    </text>
  )
}

const CROSS_ANGLES = [0, 90, 180, 270]
const X_ANGLES = [45, 135, 225, 315]
const STAR_ANGLES = [...CROSS_ANGLES, ...X_ANGLES]
const KING_DOT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
// King / Check / Getting Out of Check / Checkmate share this one size and
// position (y=22) deliberately — a slightly larger king than the other
// piece icons, since it's meant to read as the dominant shape against its
// own (now simplified/smaller) surrounding dots, and identical across all
// four cards so the family reads as one designed set, not four separate
// illustrations that happen to share a piece. Bumped again (19.5 -> 20.5)
// per feedback that the King still read a touch small next to its own
// movement dots — raised for the whole family together, not King alone, so
// the four cards stay in lockstep (see the Checkmate-vs-blocked-squares
// note below for why "make it heavier" gets solved by changing the
// surrounding marks instead, the one exception being this shared bump).
const KING_FAMILY_SIZE = 20.5

// A blocked board square — filled (not just outlined) so it reads as an
// actual square on the board, not a dot or a decorative mark, plus a
// diagonal slash confirming "unavailable". Muted purple-deep, used nowhere
// else in the icon system, so "blocked" stays a distinct visual idea from
// "piece" (purple) or "movement/open destination" (gold) without reaching
// for red (reserved for interactive lesson errors, never catalogue artwork
// — see [[chess_basics_visual_redesign]]).
function BlockedSquare({ angle, r = 13, size = 5 }: { angle: number; r?: number; size?: number }) {
  const p = polar(angle, r)
  const half = size / 2
  return (
    <g stroke="var(--chess-purple-deep)" strokeWidth="1.5">
      <rect x={p.x - half} y={p.y - half} width={size} height={size} rx="0.8" fill="var(--chess-purple-deep)" opacity="0.2" />
      <rect x={p.x - half} y={p.y - half} width={size} height={size} rx="0.8" fill="none" opacity="1" />
      <path
        d={`M${(p.x - half + 0.9).toFixed(2)} ${(p.y - half + 0.9).toFixed(2)} L${(p.x + half - 0.9).toFixed(2)} ${(p.y + half - 0.9).toFixed(2)}`}
      />
    </g>
  )
}

/**
 * One icon per Basics lesson, all sharing one 32x32 viewBox rendered at a
 * fixed 36px on the card, and one grammar throughout (see
 * [[chess_basics_visual_redesign]] in memory for the full iteration
 * history): purple = the piece/subject, gold = movement, attack, or an
 * available destination, muted purple-deep = a blocked destination.
 * Deliberately no red anywhere here — red is reserved for an actual wrong
 * answer inside an interactive lesson, never catalogue artwork, so
 * Checkmate doesn't read as an error state. Drawn content uses nearly the
 * full canvas (piece glyphs at 15-25pt depending on how much ink that
 * particular glyph carries at a given size, rays reaching almost to the
 * edge, 2px+ strokes) rather than sitting in a smaller inset with empty
 * margin around it. The three
 * non-piece icons (board grid, mini board, mini-game) stay deliberately
 * smaller within the same canvas — a solid bordered square with filled
 * sub-shapes reads much "heavier" than a glyph + lines at equal extent, so
 * matching perceived weight means giving them less room, not the same room.
 */
export default function BasicsIcon({ slug, size }: { slug: BasicsIconSlug; size?: number }) {
  return (
    <span className={styles.cardIcon} aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      <svg viewBox="0 0 32 32" fill="none" stroke="var(--chess-gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {slug === 'the-chessboard' && (
          <g stroke="var(--chess-purple)" strokeWidth="1.4">
            <rect x="7" y="7" width="18" height="18" rx="1.5" />
            <rect x="7" y="7" width="4.5" height="4.5" fill="var(--chess-lavender-bg)" stroke="none" opacity="0.6" />
            <rect x="16" y="7" width="4.5" height="4.5" fill="var(--chess-lavender-bg)" stroke="none" opacity="0.6" />
            <rect x="11.5" y="11.5" width="4.5" height="4.5" fill="var(--chess-lavender-bg)" stroke="none" opacity="0.6" />
            <rect x="7" y="16" width="4.5" height="4.5" fill="var(--chess-lavender-bg)" stroke="none" opacity="0.6" />
            <rect x="16" y="16" width="4.5" height="4.5" fill="var(--chess-lavender-bg)" stroke="none" opacity="0.6" />
          </g>
        )}

        {/* Three pieces only — recognisability over completeness — each
            sized to actually read on its own, not squeezed down to fit.
            ~17% larger again this round (still just these three, no more
            added). */}
        {slug === 'meet-the-pieces' && (
          <>
            <Piece glyph={KING} x={6.5} y={25.5} size={17.5} />
            <Piece glyph={ROOK} x={18} y={26.5} size={22} />
            <Piece glyph={PAWN} x={27.5} y={24} size={15} />
          </>
        )}

        {slug === 'set-up-the-pieces' && (
          <g>
            <rect x="7" y="7" width="18" height="18" rx="1.5" stroke="var(--chess-purple)" strokeWidth="1.4" />
            {[8, 12.3, 16.6, 20.9].map((x) => (
              <circle key={`t-${x}`} cx={x + 1.4} cy="10" r="1.3" fill="var(--chess-purple)" stroke="none" />
            ))}
            {[8, 12.3, 16.6, 20.9].map((x) => (
              <circle key={`b-${x}`} cx={x + 1.4} cy="22" r="1.3" fill="var(--chess-gold)" stroke="none" />
            ))}
          </g>
        )}

        {/* The pawn glyph itself carries less ink than Rook/Bishop/Queen's
            at the same font-size (most fonts draw it as a small round head
            on a narrow base), so it needs a noticeably larger size just to
            reach the same visual weight — not a bug, a per-glyph correction. */}
        {/* The forward arrow was previously coded from=13 to=2 — with `to`
            smaller than `from`, Arrow()'s headAngle flip (see its own
            comment: correct for an "incoming" arrow like Check's, where the
            head should point AT the near end) fired here too, pointing the
            chevron backward into the piece instead of forward and away
            from it. A pawn's arrow is the opposite case — it should point
            AWAY from the piece — so this needs `from` < `to` (unflipped),
            same direction the Escaping Check escape arrow already uses
            correctly. */}
        {slug === 'pawns' && (
          <>
            <Piece glyph={PAWN} y={25} size={29} />
            <g className={styles.moveMarks} strokeWidth="3.5">
              <Arrow angle={270} from={6} to={16.5} head={4.6} />
            </g>
          </>
        )}

        {/* Rook is the reference visual weight every other movement icon
            below is matched against. */}
        {slug === 'rooks' && (
          <>
            <Piece glyph={ROOK} y={22} size={18} />
            <g className={styles.moveMarks}>
              {CROSS_ANGLES.map((a) => (
                <Ray key={a} angle={a} />
              ))}
            </g>
          </>
        )}

        {/* Diagonals start a little further out than Rook's cross does, so
            they don't intersect right at the piece and crowd its center. */}
        {slug === 'bishops' && (
          <>
            <Piece glyph={BISHOP} y={22} size={18} />
            <g className={styles.moveMarks}>
              {X_ANGLES.map((a) => (
                <Ray key={a} angle={a} from={9.5} />
              ))}
            </g>
          </>
        )}

        {/* Glyph shifted left/down, the L drawn larger through the open
            upper-right quadrant so it reads as the dominant shape, not a
            shape competing with the piece — one endpoint arrow, no more. */}
        {slug === 'knights' && (
          <>
            <Piece glyph={KNIGHT} x={11} y={25} size={16} />
            <g className={styles.moveMarks} strokeWidth="2.6">
              <path d="M10 25.5V10.5h12" />
              <path d="M18.4 6.3 23 10.5l-4.6 4.2" />
            </g>
          </>
        )}

        {/* Same reach as Rook/Bishop's own lines (not shorter, denser
            rays) — reads as "rook movement + bishop movement", which is
            literally what the queen does, rather than a starburst. */}
        {slug === 'queen' && (
          <>
            <Piece glyph={QUEEN} y={22} size={17} />
            <g className={styles.moveMarks}>
              {STAR_ANGLES.map((a) => (
                <Ray key={a} angle={a} />
              ))}
            </g>
          </>
        )}

        {/* King / Check / Getting Out of Check / Checkmate as one designed
            family, not four separate illustrations — the king glyph is the
            exact same size and position (KING_FAMILY_SIZE, y=22) on all
            four. Only the information drawn around it changes:
              King:       8 open gold destination dots (simplified — fewer,
                          smaller, closer in — so the king itself, now a
                          touch larger, stays the dominant shape).
              Check:      one long, bold incoming attack, straight down.
              Escape:     the same attack (faint) + a bold escape arrow to
                          an open gold destination.
              Checkmate:  the same attack (full weight) + three filled
                          blocked destinations (left/right/below) instead of
                          King's open dots — same king size as the other
                          three now, not enlarged on its own, so the family
                          reads as one deliberate set. */}
        {slug === 'king' && (
          <>
            <Piece glyph={KING} y={22} size={KING_FAMILY_SIZE} />
            <g className={styles.moveMarks} stroke="none" fill="var(--chess-gold)">
              {KING_DOT_ANGLES.map((a) => {
                const p = polar(a, 12.2)
                return <circle key={a} cx={p.x} cy={p.y} r="1.7" />
              })}
            </g>
          </>
        )}

        {/* A diagonal incoming attack (↘ toward the King), not a straight
            vertical line — a plain vertical mark read too easily as just
            another movement indicator rather than "under attack". Angle
            225 (up-left of center) with the same from>to flip Arrow()
            already uses for an incoming arrow points the chevron down-right
            into the King. ~25% longer and a bigger head than the previous
            straight version. Checkmate below reuses these exact values. */}
        {slug === 'check' && (
          <>
            <Piece glyph={KING} y={22} size={KING_FAMILY_SIZE} />
            <g className={styles.moveMarks} strokeWidth="3.2">
              <Arrow angle={225} from={18} to={6} head={5} />
            </g>
          </>
        )}

        {/* Rebuilt on the user's own ♚ ───→ □ reference, moved to the
            up-right diagonal (angle 315) — the one direction with enough
            clear canvas between the King and the viewBox edge for a real
            gap-shaft-square sequence — with an OUTLINED (not filled)
            destination square, matching the □ in their sketch. Locked
            per the user's own "after that, lock it": the arrow now
            reaches into the square's centre rather than stopping at its
            near edge (`to` 15.5 -> 17.3, past the near edge at r≈16.0 and
            almost to the square's own centre at r=18.2) so the arrowhead
            visibly lands inside it instead of just touching it — square
            size deliberately left alone. The faint background attack
            stays on the opposite (up-left, angle 225) diagonal from
            Check/Checkmate, so threat and escape read as two clearly
            separate directions rather than crowding one side. */}
        {slug === 'escaping-check' && (
          <>
            <Piece glyph={KING} y={22} size={KING_FAMILY_SIZE} />
            <g className={styles.moveMarksFaint} strokeWidth="1.6">
              <Arrow angle={225} from={14} to={11} head={2} />
            </g>
            <g className={styles.moveMarks} strokeWidth="3.3">
              <Arrow angle={315} from={12} to={17.3} head={4.1} />
            </g>
            <rect
              x={polar(315, 18.2).x - 2.2}
              y={polar(315, 18.2).y - 2.2}
              width="4.4"
              height="4.4"
              rx="0.8"
              fill="none"
              stroke="var(--chess-gold)"
              strokeWidth="1.7"
              className={styles.moveMarks}
            />
          </>
        )}

        {/* Same king, same attack as Check — the changing part is three
            filled blocked destinations (left/right/below — see
            BlockedSquare) instead of King's open dots above. Left
            deliberately open: "up", where the attack itself already is. */}
        {/* Same attack as Check (identical values, see that card's own
            comment). Blocked squares pulled in slightly (6 -> 5.3) rather
            than enlarging the King — per feedback that they read visually
            heavier than the King itself, and the King must stay the same
            size as the rest of this family (see KING_FAMILY_SIZE). */}
        {slug === 'checkmate' && (
          <>
            <Piece glyph={KING} y={22} size={KING_FAMILY_SIZE} />
            <g className={styles.moveMarks} strokeWidth="3.2">
              <Arrow angle={225} from={18} to={6} head={5} />
            </g>
            <BlockedSquare angle={0} r={13} size={5.3} />
            <BlockedSquare angle={180} r={13} size={5.3} />
            <BlockedSquare angle={90} r={13} size={5.3} />
          </>
        )}

        {/* A real 4x4 checkerboard — every cell drawn, alternating fill —
            with no separate bordered/rounded rect framing it, on the
            user's explicit note that a bounding frame around the
            checkering is what made earlier passes read as "a tiny app
            window" rather than a board; the checkering itself forms the
            square silhouette. One large pawn on it, and a gold play
            triangle overlapping the board's bottom-right corner like a
            badge. Two more passes since: the whole artwork sized up
            another ~18% (cell 6.25 -> 7.3, board 25 -> 29.2, nearly
            full-bleed in the 32-wide canvas) after it still read smaller
            than Queen/King/Checkmate next to it, and the purple cells'
            opacity nearly doubled (0.16 -> 0.3) because at the old value
            they read as almost invisible against a white card — "purple
            checkerboard" was barely legible as purple at all. One more
            size pass after that: the board margin trimmed to the physical
            minimum this shared 32x32 canvas allows (1.5 -> 0.4 each side,
            board 29.2 -> 31.4 — this is now essentially at the ceiling;
            further growth would start clipping the icon's own edge, the
            same overflow bug fixed on Escaping Check), the pawn enlarged
            further on top of that for its own visual weight (23.5 -> 26),
            and the play triangle both extended and given a heavier stroke
            (1 -> 1.3) for more presence. Concept confirmed final by the
            user — do not redesign this icon again, only the physical
            canvas ceiling above should ever limit further size asks. */}
        {slug === 'mini-game' && (
          <>
            <g stroke="none">
              {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 4 }).map((_, col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={0.4 + col * 7.85}
                    y={0.4 + row * 7.85}
                    width="7.85"
                    height="7.85"
                    fill={(row + col) % 2 === 0 ? 'var(--chess-purple)' : 'var(--chess-lavender-bg)'}
                    opacity={(row + col) % 2 === 0 ? 0.3 : 0.6}
                  />
                ))
              )}
            </g>
            <Piece glyph={PAWN} x={15.35} y={23.1} size={26} />
            <path d="M23 20.5v11.1l8.3-5.55z" fill="var(--chess-gold)" stroke="var(--chess-gold)" strokeWidth="1.3" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </span>
  )
}
