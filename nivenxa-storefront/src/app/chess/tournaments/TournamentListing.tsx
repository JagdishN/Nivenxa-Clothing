'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { ChessTournament, TournamentGroup } from '@/lib/chess/types'
import styles from './Tournaments.module.scss'

function formatDateRange(tournament: ChessTournament) {
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
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!previewRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  if (!tournament.topPlayers.length) {
    return <span className={styles.mutedValue}>No toppers enrolled yet</span>
  }

  return (
    <div className={styles.playerPreview} ref={previewRef}>
      <button
        type="button"
        className={styles.playerPreviewButton}
        aria-label={`Preview top players for ${tournament.title}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Image
          src="/player-preview.png"
          alt=""
          width={72}
          height={72}
          className={styles.playerIcon}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className={styles.playerPanel}>
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
        </div>
      )}
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
        src="/map.png"
        alt=""
        width={72}
        height={72}
        className={styles.mapIcon}
        aria-hidden="true"
      />
    </a>
  )
}

function RegisterAction({ tournament }: { tournament: ChessTournament }) {
  const href = tournament.links.registrationUrl ?? tournament.links.tournamentUrl
  const label = tournament.links.registrationUrl ? 'Register' : 'Details'

  return (
    <a href={href} className={styles.registerLink} target="_blank" rel="noreferrer">
      {label}
    </a>
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
                    <td data-label="Register"><RegisterAction tournament={tournament} /></td>
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
