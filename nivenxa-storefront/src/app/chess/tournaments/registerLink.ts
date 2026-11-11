import type { ChessTournament } from '@/lib/chess/types'
import { formatDateRange } from '@/lib/chess/tournamentFormat'

/** wa.me requires a bare digit string — strip the leading "+" and any spacing/formatting. */
export function buildWhatsAppRegisterLink(tournament: ChessTournament): string | null {
  const whatsapp = tournament.organizer.whatsapp
  if (!whatsapp) return null
  const digits = whatsapp.replace(/\D/g, '')
  if (!digits) return null

  const message = `Hi, I'd like to register for ${tournament.title} (${formatDateRange(tournament)}). My name is ___.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
