import styles from './PageShell.module.scss'

/**
 * Shared "header / content / footer" frame for every app that renders
 * SiteFooter. It does ONE job: on a page shorter than the viewport the footer
 * sits at the viewport bottom (the content area grows to fill), and on a long
 * page the footer simply follows the content. Pages no longer need their own
 * `min-height: 100vh` to look full-height — that is what used to push the
 * footer a whole screen down on short pages.
 *
 * The content area is a plain block box (not a flex/grid layout itself), so a
 * page wrapper using `max-width` + `margin-inline: auto` keeps its normal
 * sizing. A page that genuinely needs the full viewport height (the Play
 * board) opts out with `data-full-viewport` on its <main>.
 */
export default function PageShell({
  children,
  header,
  footer,
  className,
  contentClassName,
}: {
  children: React.ReactNode
  header?: React.ReactNode
  footer: React.ReactNode
  /** Extra class on the outer frame (e.g. an app's theme-token class). */
  className?: string
  /** Extra class on the content area (e.g. the app's page background colour, so a short page's leftover height is not the bare body colour). */
  contentClassName?: string
}) {
  return (
    <div data-page-shell className={[styles.shell, className].filter(Boolean).join(' ')}>
      {header}
      <div className={[styles.content, contentClassName].filter(Boolean).join(' ')}>{children}</div>
      {footer}
    </div>
  )
}
