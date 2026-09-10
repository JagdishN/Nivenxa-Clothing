/**
 * Google Material Icons via the ligature font (loaded once in living/layout.tsx)
 * — `name` is the icon's ligature name (e.g. "add", "delete", "arrow_forward"),
 * rendered as the span's text content, which the font substitutes for the glyph.
 * See https://fonts.google.com/icons for the full name list.
 */
export default function MaterialIcon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={`material-icons ${className ?? ''}`}
      style={{ fontSize: size, lineHeight: 1, verticalAlign: 'middle', ...style }}
      aria-hidden="true"
      translate="no"
    >
      {name}
    </span>
  )
}
