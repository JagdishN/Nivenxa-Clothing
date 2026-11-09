import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectHomeTournament, type TournamentRow } from '../../src/lib/chess/tournaments'
import { buildCardView } from '../../src/lib/chess/tournamentCard'
import { formatCardDate, formatDateRange, todayInEventZone, venueArea } from '../../src/lib/chess/tournamentFormat'
import type { ChessTournament } from '../../src/lib/chess/types'

const row = (o: Partial<TournamentRow> & { id: string; start_date: string }): TournamentRow =>
  ({ name: o.id, country: 'India', tournament_type: 'Local', end_date: null, location_name: 'Hall, Hyderabad', latitude: null, longitude: null,
     fide_rated: false, time_control: 'Rapid', format: 'Swiss', top_players: null, prize_pool: null, entry_fee: null, categories: null,
     organizer_name: 'N', organizer_verified: true, register_url: null, organizer_whatsapp: null, payment_qr_url: null, payment_qr_source: null,
     payment_note: null, source: 'manual', source_reference: null, verified: true, is_live: false, is_nivenxa_organized: true, results: null,
     created_at: '', updated_at: '', ...o }) as TournamentRow

const TODAY = '2026-11-09'

test('the nearest upcoming event is chosen and the rest are counted', () => {
  const r = selectHomeTournament([row({ id: 'late', start_date: '2026-12-01' }), row({ id: 'soon', start_date: '2026-11-15' }), row({ id: 'mid', start_date: '2026-11-20' })], TODAY)!
  assert.equal(r.tournament.id, 'soon')
  assert.equal(r.moreCount, 2)
})

test('no upcoming event means no card', () => {
  assert.equal(selectHomeTournament([], TODAY), null)
  assert.equal(selectHomeTournament([row({ id: 'old', start_date: '2026-11-01' })], TODAY), null)
})

test('ended events are excluded; a multi-day event is still on until its last day', () => {
  assert.equal(selectHomeTournament([row({ id: 'ended', start_date: '2026-11-05', end_date: '2026-11-08' })], TODAY), null)
  assert.equal(selectHomeTournament([row({ id: 'on', start_date: '2026-11-08', end_date: '2026-11-09' })], TODAY)?.tournament.id, 'on')
  assert.equal(selectHomeTournament([row({ id: 'today', start_date: '2026-11-09' })], TODAY)?.tournament.id, 'today')
})

test('cancelled events never show, even when they are the nearest', () => {
  const r = selectHomeTournament([row({ id: 'x', start_date: '2026-11-10', is_cancelled: true }), row({ id: 'y', start_date: '2026-11-20' })], TODAY)!
  assert.equal(r.tournament.id, 'y')
  assert.equal(r.moreCount, 0)
  assert.equal(selectHomeTournament([row({ id: 'x', start_date: '2026-11-10', is_cancelled: true })], TODAY), null)
})

test('a live event wins over an earlier-dated upcoming one', () => {
  const r = selectHomeTournament([row({ id: 'up', start_date: '2026-11-10' }), row({ id: 'live', start_date: '2026-11-08', end_date: '2026-11-12', is_live: true })], TODAY)!
  assert.equal(r.tournament.id, 'live')
  assert.equal(r.tournament.lifecycleStatus, 'live')
})

const card = (row_: Partial<TournamentRow> & { start_date: string }, today = TODAY) =>
  buildCardView(selectHomeTournament([row({ id: 'e', ...row_ })], today)!.tournament, today)

test('registration states', () => {
  assert.equal(card({ start_date: '2026-11-15', register_url: 'https://x.test' }).registrationLabel, 'Registration open')
  assert.equal(card({ start_date: '2026-11-15', register_url: 'https://x.test' }).canRegister, true)
  assert.equal(card({ start_date: '2026-11-15', organizer_whatsapp: '+917416996665' }).canRegister, true)
  const none = card({ start_date: '2026-11-15' })
  assert.equal(none.registrationTone, 'contact')
  assert.equal(none.canRegister, false)
  assert.equal(card({ start_date: '2026-11-15', register_url: 'https://x.test', registration_deadline: '2026-11-12' }).registrationLabel, 'Registration open · closes 12 Nov')
  assert.equal(card({ start_date: '2026-11-15', register_url: 'https://x.test', registration_deadline: '2026-11-09' }).registrationLabel, 'Registration closes today')
  const closed = card({ start_date: '2026-11-15', register_url: 'https://x.test', registration_deadline: '2026-11-08' })
  assert.equal(closed.registrationLabel, 'Registration closed')
  assert.equal(closed.canRegister, false) // never offer Register after the deadline
})

test('live and same-day phases', () => {
  const live = card({ start_date: '2026-11-08', end_date: '2026-11-10', is_live: true, register_url: 'https://x.test' })
  assert.equal(live.phase, 'live')
  assert.equal(live.canRegister, false)
  assert.equal(card({ start_date: '2026-11-09' }).phase, 'today')
  // in progress by date even if the admin has not set the live flag
  assert.equal(card({ start_date: '2026-11-08', end_date: '2026-11-10' }).phase, 'live')
})

test('the card links to that specific event', () => {
  assert.equal(card({ start_date: '2026-11-15' }).detailsHref, '/chess/tournaments/e')
})

test('venue area: area + city, without state/PIN; short labels unchanged', () => {
  assert.equal(venueArea('puchalapalli sundarayya bhavan Near Mithila Nagar Arch, Panchavati Complex, Pragathi Nagar, Hyderabad, Telangana 500090'), 'Pragathi Nagar, Hyderabad')
  assert.equal(venueArea('Hall, Hyderabad'), 'Hall, Hyderabad')
  assert.equal(venueArea('Online'), 'Online')
})

test('dates are the event calendar date, whatever the viewer or server timezone', () => {
  assert.equal(formatCardDate('2026-11-15'), '15 Nov 2026')
  assert.equal(formatCardDate('2026-11-15', '2026-11-15'), '15 Nov 2026')
  assert.match(formatCardDate('2026-11-30', '2026-12-02'), /30 Nov.*2 Dec 2026/)
  for (const tz of ['America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata']) {
    const prev = process.env.TZ
    process.env.TZ = tz
    assert.equal(formatCardDate('2026-11-15'), '15 Nov 2026', tz)
    assert.match(formatDateRange({ dates: { startsAt: '2026-11-15' } } as ChessTournament), /^November 15, 2026$/, tz)
    process.env.TZ = prev
  }
})

test('"today" is the Indian calendar date, not the UTC date', () => {
  // 20:00 UTC on 8 Nov is 01:30 on 9 Nov in India.
  assert.equal(todayInEventZone(new Date('2026-11-08T20:00:00Z')), '2026-11-09')
  assert.equal(todayInEventZone(new Date('2026-11-08T10:00:00Z')), '2026-11-08')
})
