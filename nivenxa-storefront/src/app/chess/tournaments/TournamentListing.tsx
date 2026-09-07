'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChessTournament, TournamentGroup } from '@/lib/chess/types'
import styles from './Tournaments.module.scss'

/**
 * Renders `children` into a `document.body` portal, positioned (fixed,
 * viewport-relative) below-and-right-aligned to `anchorRef`. Needed because
 * `.tableShell` sets `overflow-x: auto` for the table's horizontal scroll —
 * per the CSS spec, that silently resolves `overflow-y` to `auto` as well,
 * which clips any plain `position: absolute` popover that tries to extend
 * below the table's own height (confirmed live: the payment QR panel's DOM
 * content existed but never became visible on screen). A portal escapes
 * that ancestor entirely instead of trying to fight the overflow rule.
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
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect()
      if (!rect) return
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    updatePosition()

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !anchorRef.current?.contains(target)) onClose()
    }
    // capture: true so this also fires for scrolling *inside* .tableShell
    // (its own scroll container), not just window-level scroll.
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
    <div ref={panelRef} className={className} style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 50 }}>
      {children}
    </div>,
    document.body
  )
}

export function formatDateRange(tournament: ChessTournament) {
  const start = new Date(tournament.dates.startsAt)
  const end = tournament.dates.endsAt ? new Date(tournament.dates.endsAt) : undefined

  const dateFormatter = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (!end || dateFormatter.format(start) === dateFormatter.format(end)) {
    return dateFormatter.format(start)
  }

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`
}

function fideLabel(value: boolean | null) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return 'Review'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function PlayerPreview({ tournament }: { tournament: ChessTournament }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  if (!tournament.topPlayers.length) {
    return <span className={styles.mutedValue}>No toppers enrolled yet</span>
  }

  return (
    <div className={styles.playerPreview}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.playerPreviewButton}
        aria-label={`Preview top players for ${tournament.title}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Image
          src="/images/Chess/player-preview.png"
          alt=""
          width={72}
          height={72}
          className={styles.playerIcon}
          aria-hidden="true"
        />
      </button>

      <AnchoredPopover anchorRef={buttonRef} open={open} onClose={() => setOpen(false)} className={styles.playerPanel}>
        <p className={styles.playerPanelTitle}>Top Players</p>
        {tournament.topPlayers.map((player) => (
          <div key={`${tournament.id}-${player.name}`} className={styles.playerCard}>
            <div className={styles.playerAvatar} aria-hidden="true">
              {getInitials(player.name)}
            </div>
            <div className={styles.playerBody}>
              <div className={styles.playerTopLine}>
                <span className={styles.playerName}>{player.name}</span>
                {player.rating && <span className={styles.playerRating}>{player.rating}</span>}
              </div>
              <div className={styles.playerMeta}>
                {player.title && <span className={styles.playerTitle}>{player.title}</span>}
                {player.country && <span>{player.country}</span>}
                {!player.title && !player.country && <span>Preview available after publication</span>}
              </div>
            </div>
          </div>
        ))}
      </AnchoredPopover>
    </div>
  )
}

function LocationLink({ tournament }: { tournament: ChessTournament }) {
  if (!tournament.links.mapUrl) {
    return <span className={styles.mutedValue}>Not mapped</span>
  }

  return (
    <a
      href={tournament.links.mapUrl}
      className={styles.mapLink}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open map for ${tournament.title} at ${tournament.location.label}`}
      title={tournament.location.label}
    >
      <Image
        src="/images/Shared/map.png"
        alt=""
        width={72}
        height={72}
        className={styles.mapIcon}
        aria-hidden="true"
      />
    </a>
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
      <a href={tournament.links.registrationUrl} className={styles.registerLink} target="_blank" rel="noreferrer">
        Register
      </a>
    )
  }

  const whatsappLink = buildWhatsAppRegisterLink(tournament)
  if (whatsappLink) {
    return (
      <a href={whatsappLink} className={styles.registerLink} target="_blank" rel="noreferrer">
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
        <p className={styles.paymentPanelTitle}>Pay the organizer directly</p>
        <p className={styles.paymentPanelSubtext}>
          This is the organizer&rsquo;s own payment method — Nivenxa does not process or handle this payment.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not worth a next.config.ts remotePatterns entry for a QR image */}
        <img src={tournament.payment.qrUrl} alt={`Payment QR for ${tournament.title}`} className={styles.paymentQrImage} />
        {tournament.payment.note && <p className={styles.paymentNoteText}>{tournament.payment.note}</p>}
      </AnchoredPopover>
    </div>
  )
}

export default function TournamentListing({ groups }: { groups: TournamentGroup[] }) {
  if (!groups.length) {
    return (
      <section className={styles.emptyState}>
        <p className={styles.groupLabel}>Curated Selection</p>
        <h2 className={styles.groupTitle}>No tournaments ready yet</h2>
        <p className={styles.emptyText}>
          The calendar only shows events that pass Nivenxa Chess validation.
        </p>
      </section>
    )
  }

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.status} className={styles.group} aria-labelledby={`${group.status}-heading`}>
          <div className={styles.groupHeader}>
            <p className={styles.groupLabel}>Curated Selection</p>
            <h2 id={`${group.status}-heading`} className={styles.groupTitle}>{group.label}</h2>
          </div>

          {!group.tournaments.length ? (
            <div className={styles.groupEmpty}>
              <p>No live tournaments right now. Upcoming verified tournaments are listed below.</p>
            </div>
          ) : (
          <div className={styles.tableShell}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Country</th>
                  <th>Tournament Type</th>
                  <th>Dates</th>
                  <th>Location</th>
                  <th>FIDE Rated</th>
                  <th>Time Control</th>
                  <th>Format</th>
                  <th>Top Players</th>
                  <th>Prize Pool</th>
                  <th>Organizer</th>
                  <th>Register</th>
                </tr>
              </thead>
              <tbody>
                {group.tournaments.map((tournament) => (
                  <tr key={tournament.id}>
                    <td data-label="Tournament">
                      <a
                        href={tournament.links.tournamentUrl}
                        className={styles.tournamentLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tournament.title}
                      </a>
                      <span className={styles.source}>{tournament.source.name}</span>
                    </td>
                    <td data-label="Country">{tournament.country}</td>
                    <td data-label="Tournament Type">
                      <span className={`${styles.typePill} ${styles[`type${tournament.tournamentType}`]}`}>
                        {tournament.tournamentType}
                      </span>
                    </td>
                    <td data-label="Dates">{formatDateRange(tournament)}</td>
                    <td data-label="Location"><LocationLink tournament={tournament} /></td>
                    <td data-label="FIDE Rated">{fideLabel(tournament.fideRated)}</td>
                    <td data-label="Time Control">{tournament.timeControl}</td>
                    <td data-label="Format">{tournament.format}</td>
                    <td data-label="Top Players"><PlayerPreview tournament={tournament} /></td>
                    <td data-label="Prize Pool">
                      {tournament.prizePool?.label ?? <span className={styles.mutedValue}>Not announced</span>}
                    </td>
                    <td data-label="Organizer">
                      <span>{tournament.organizer.name}</span>
                      {tournament.organizer.verified && <span className={styles.verified}>Verified</span>}
                    </td>
                    <td data-label="Register">
                      <RegisterAction tournament={tournament} />
                      <PaymentInfo tournament={tournament} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      ))}
    </div>
  )
}
