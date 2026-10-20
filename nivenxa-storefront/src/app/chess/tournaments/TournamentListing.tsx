'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { ChessTournament, TournamentGroup } from '@/lib/chess/types'
import { formatDateRange, roundsVaryAcrossCategories } from '@/lib/chess/tournamentFormat'
import styles from './Tournaments.module.scss'

/**
 * Renders `children` into a `document.body` portal, positioned (fixed,
 * viewport-relative) above-and-right-aligned to `anchorRef` — anchored by
 * `bottom` (not `top`) so the panel grows upward from the button regardless
 * of its own height, instead of opening downward and risking getting cut off
 * by the viewport or whatever sits below the card. Needed because a card can
 * sit near the edge of the page, and a plain `position: absolute` popover
 * risks being clipped by an ancestor's overflow rule — a portal escapes that
 * entirely instead of trying to fight each possible ancestor.
 */
function AnchoredPopover({
  anchorRef,
  open,
  onClose,
  className,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  className?: string
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ bottom: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right })
    }
    updatePosition()

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose()
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, anchorRef, onClose])

  if (!open || !pos || typeof document === 'undefined') return null

  return createPortal(
    <div ref={panelRef} className={className} style={{ position: 'fixed', bottom: pos.bottom, right: pos.right, zIndex: 50 }}>
      {children}
    </div>,
    document.body
  )
}

/** wa.me requires a bare digit string — strip the leading "+" and any spacing/formatting. */
function buildWhatsAppRegisterLink(tournament: ChessTournament): string | null {
  const whatsapp = tournament.organizer.whatsapp
  if (!whatsapp) return null
  const digits = whatsapp.replace(/\D/g, '')
  if (!digits) return null

  const message = `Hi, I'd like to register for ${tournament.title} (${formatDateRange(tournament)}). My name is ___.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function RegisterAction({ tournament }: { tournament: ChessTournament }) {
  // Priority: organizer's own registration link, then a pre-filled WhatsApp
  // deep link, then a plain non-link note — never a broken/placeholder href.
  if (tournament.links.registrationUrl) {
    return (
      <a href={tournament.links.registrationUrl} className={styles.registerBtn} target="_blank" rel="noreferrer">
        Register
      </a>
    )
  }

  const whatsappLink = buildWhatsAppRegisterLink(tournament)
  if (whatsappLink) {
    return (
      <a href={whatsappLink} className={styles.registerBtn} target="_blank" rel="noreferrer">
        Register via WhatsApp
      </a>
    )
  }

  return <span className={styles.mutedValue}>Contact organizer directly</span>
}

export function PaymentInfo({ tournament }: { tournament: ChessTournament }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (!tournament.payment?.qrUrl) return null

  return (
    <div className={styles.paymentInfo}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.paymentInfoButton}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Payment QR
      </button>

      <AnchoredPopover anchorRef={buttonRef} open={open} onClose={() => setOpen(false)} className={styles.paymentPanel}>
        <p className={styles.paymentPanelTitle}>Scan to pay</p>
        <p className={styles.paymentPanelSubtext}>
          Official Nivenxa payment QR for this tournament — pay via UPI or bank transfer using the details below.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not worth a next.config.ts remotePatterns entry for a QR image */}
        <img src={tournament.payment.qrUrl} alt={`Payment QR for ${tournament.title}`} className={styles.paymentQrImage} />
        {tournament.payment.note && <p className={styles.paymentNoteText}>{tournament.payment.note}</p>}
      </AnchoredPopover>
    </div>
  )
}

/**
 * One tournament, reduced to exactly what a parent needs to decide whether
 * to register in about 5 seconds: who's running it, Date, Venue, Categories,
 * then Entry Fee/Prize Pool/Time Control/Format as one even stat row — wide
 * (not a narrow column with empty space beside it), since this is meant to
 * read as the main content of the page, not one card among many in a grid.
 * Country, FIDE-rated, and top players are still dropped entirely (genuinely
 * secondary for a local youth event); anything else goes on the "View
 * Details" page instead of being crammed in here.
 */
function TournamentCard({ tournament }: { tournament: ChessTournament }) {
  const categories = tournament.categories
    ? tournament.categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    : []

  // Same compact, normal-weight treatment as the detail page — date + entry
  // fee/prize pool/time control/rounds on one wrapping line, venue on its
  // own line underneath. Each separator is folded into its own item's text
  // so a wrap can only ever land between complete items.
  const metaParts: string[] = []
  if (tournament.entryFee) metaParts.push(`Entry fee: ${tournament.entryFee}`)
  if (tournament.prizePool) metaParts.push(`Prize pool: ${tournament.prizePool.label}`)
  if (tournament.timeControl !== 'Unknown') metaParts.push(tournament.timeControl)
  // See [id]/page.tsx — the single tournament-wide format string can't
  // speak for a category that ran a different number of rounds, so this
  // states that plainly rather than pairing a specific round count with a
  // contradicting caveat.
  if (tournament.format !== 'Unknown') {
    metaParts.push(roundsVaryAcrossCategories(tournament.results) ? 'Rounds vary by category' : tournament.format)
  }

  const isCompleted = tournament.lifecycleStatus === 'completed'

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        {/* Completed sits right beside the title — same place the detail
            page puts it — so a parent scanning the Archive sees at a
            glance that this already happened, in the very first thing
            they read, not partway down the card. */}
        <div className={styles.detailTitleRow}>
          <h3 className={styles.cardTitle}>{tournament.title}</h3>
          {isCompleted && <span className={styles.statusBadge}>Completed</span>}
        </div>
        <p className={styles.cardOrganizer}>Organized by {tournament.organizer.name}</p>
      </div>

      <div className={styles.cardMetaRow}>
        <span className={styles.cardMetaItem}>
          <span className={styles.cardMetaIcon} aria-hidden="true">
            📅
          </span>
          {formatDateRange(tournament)}
        </span>
        {metaParts.map((part) => (
          <span key={part} className={styles.cardMetaItem}>
            <span className={styles.metaDot} aria-hidden="true">
              /
            </span>
            {part}
          </span>
        ))}
      </div>
      <div className={styles.cardMetaRow}>
        <span className={styles.cardMetaItem}>
          <span className={styles.cardMetaIcon} aria-hidden="true">
            📍
          </span>
          {tournament.links.mapUrl ? (
            <a href={tournament.links.mapUrl} target="_blank" rel="noreferrer" className={styles.cardVenueLink}>
              {tournament.location.label}
            </a>
          ) : (
            tournament.location.label
          )}
        </span>
      </div>

      {/* Age/skill categories — secondary context for choosing between
          events on this listing. Dropped for a completed tournament: its
          card already links straight to Results, which says the same
          thing with actual standings instead of a bare list of names. */}
      {!isCompleted && categories.length > 0 && (
        <div className={styles.cardCategories}>
          {categories.map((c) => (
            <span key={c} className={styles.categoryPill}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Register/Payment QR only make sense while a tournament is still
          open to enter — a completed or cancelled event (the Archive page)
          has nothing left to register or pay for. */}
      {(() => {
        const isOpenForEntry = tournament.lifecycleStatus === 'live' || tournament.lifecycleStatus === 'upcoming'
        return (
          <div className={styles.cardActions}>
            <Link href={`/chess/tournaments/${tournament.id}`} className={styles.viewDetailsBtn}>
              {/* "View Results" only once there's something to view — a
                  completed tournament with no results entered yet still
                  says "View Details" rather than promising standings that
                  aren't there. */}
              {isCompleted && tournament.results && tournament.results.length > 0 ? 'View Results' : 'View Details'}
            </Link>
            {isOpenForEntry && <RegisterAction tournament={tournament} />}
            {isOpenForEntry && <PaymentInfo tournament={tournament} />}
          </div>
        )
      })()}
    </article>
  )
}

export default function TournamentListing({ groups, archiveHref }: { groups: TournamentGroup[]; archiveHref?: string }) {
  // An empty group (e.g. "Live Now" with nothing live right now) is dropped
  // entirely rather than rendered with its own "nothing here" copy — a
  // parent scanning the page should land straight on real tournaments, not
  // read past a section that has nothing in it first.
  const visibleGroups = groups.filter((group) => group.tournaments.length > 0)

  if (!visibleGroups.length) {
    return (
      <section className={styles.emptyState}>
        <h2 className={styles.groupTitle}>No upcoming tournaments announced</h2>
        <p className={styles.emptyText}>Our next tournament will appear here. Explore our past events below.</p>
        {/* archiveHref is only passed on the main listing page (pointing at
            the Archive) — the Archive page itself renders this same empty
            state when it has nothing, and a "see past events" link there
            would point right back at the page already open. */}
        {archiveHref && (
          <div className={styles.emptyStateCta}>
            <Link href={archiveHref} className={styles.archiveLink}>
              Past Tournaments →
            </Link>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className={styles.groups}>
      {visibleGroups.map((group) => (
        <section key={group.status} className={styles.group} aria-labelledby={group.label ? `${group.status}-heading` : undefined}>
          {/* The Archive page's own h1 already says "Past tournaments" — a
              second "Completed" heading directly beneath it for the one and
              only group on that page was pure repetition (see
              getNivenxaArchiveTournaments, which now passes an empty label). */}
          {group.label && (
            <h2 id={`${group.status}-heading`} className={styles.groupTitle}>
              {group.label}
            </h2>
          )}

          <div className={styles.cardGrid}>
            {group.tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
