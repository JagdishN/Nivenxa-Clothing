import { test } from 'node:test'
import assert from 'node:assert/strict'
import { directionsHref, formatLongDate, formatMoney, formatTimeControl, splitVenue } from '../../src/lib/chess/tournamentFormat'

test('long date: weekday, no timezone shift, ranges', () => {
  assert.equal(formatLongDate('2026-11-15'), 'Sunday, 15 November 2026')
  assert.equal(formatLongDate('2026-11-15', '2026-11-15'), 'Sunday, 15 November 2026')
  assert.equal(formatLongDate('2026-11-14', '2026-11-15'), 'Saturday, 14 – Sunday, 15 November 2026')
  assert.equal(formatLongDate('2026-11-30', '2026-12-01'), 'Monday, 30 November – Tuesday, 1 December 2026')
  assert.equal(formatLongDate('2026-12-31', '2027-01-01'), 'Thursday, 31 December 2026 – Friday, 1 January 2027')
})

test('money: INR with Indian grouping from the stored value; unknown wording untouched', () => {
  assert.equal(formatMoney('₹600'), '₹600')
  assert.equal(formatMoney('600'), '₹600')
  assert.equal(formatMoney('15000'), '₹15,000')
  assert.equal(formatMoney('₹15000'), '₹15,000')
  assert.equal(formatMoney('Rs. 1500000'), '₹15,00,000')
  assert.equal(formatMoney('INR 650'), '₹650')
  assert.equal(formatMoney('₹15,000 total, trophies for all'), '₹15,000 total, trophies for all')
  assert.equal(formatMoney('Trophies and medals'), 'Trophies and medals')
  assert.equal(formatMoney('₹650.50'), '₹650.50')
})

test('time control: understandable, nothing invented', () => {
  assert.equal(formatTimeControl('25+10 Rapid'), '25 min + 10 sec/move (Rapid)')
  assert.equal(formatTimeControl('25 + 10'), '25 min + 10 sec/move')
  assert.equal(formatTimeControl('25Mints + 10 sec'), '25 min + 10 sec/move')
  assert.equal(formatTimeControl('Rapid'), 'Rapid')
  assert.equal(formatTimeControl('Unknown'), undefined)
  assert.equal(formatTimeControl(undefined), undefined)
})

test('venue: first part is the name, the rest the stored address; directions link', () => {
  assert.deepEqual(splitVenue('Sai Chess Hall, Panchavati Complex, Pragathi Nagar, Hyderabad'), {
    name: 'Sai Chess Hall',
    address: 'Panchavati Complex, Pragathi Nagar, Hyderabad',
  })
  assert.deepEqual(splitVenue('Community Hall'), { name: 'Community Hall' })
  assert.equal(
    directionsHref({ links: {}, location: { label: 'A Hall, B Road' } }),
    'https://www.google.com/maps/search/?api=1&query=A%20Hall%2C%20B%20Road'
  )
  assert.equal(directionsHref({ links: { mapUrl: 'https://www.google.com/maps?q=1,2' }, location: { label: 'x' } }), 'https://www.google.com/maps?q=1,2')
})
