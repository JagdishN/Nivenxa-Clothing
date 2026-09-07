import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getLivingMembership } from '@/lib/living/auth'
import { formatPeriodLabel, monthKeyFor } from '@/lib/living/format'
import { maintenanceGrandTotal } from '@/lib/living/billing'
import { computeBillForFlat, getBillableFlats, getCurrentMaintenancePeriod, getFlats, getWaterReading } from '@/lib/living/queries'

const CURRENCY_FORMAT = '#,##0.00'

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true }
}

/**
 * The month's Bills table, current maintenance period's line items, and
 * every flat's water reading, as one downloadable .xlsx — for sharing
 * outside the app (WhatsApp, print, a committee meeting) rather than
 * screen-sharing the live page.
 */
export async function GET() {
  const membership = await getLivingMembership(['admin', 'treasurer'])
  if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const { supabase, apartment } = membership
  const month = monthKeyFor(new Date())

  const allFlats = await getFlats(supabase, apartment.id)
  const billableFlats = getBillableFlats(allFlats)
  const maintenancePeriod = await getCurrentMaintenancePeriod(supabase, apartment.id)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Nivenxa Living'
  workbook.created = new Date()

  // ─── Bills ──────────────────────────────────────────────────────────
  const billsSheet = workbook.addWorksheet('Bills')
  billsSheet.columns = [
    { header: 'Flat', key: 'flat_no', width: 10 },
    { header: 'Owner', key: 'owner', width: 22 },
    { header: 'Maintenance', key: 'maintenance', width: 15, style: { numFmt: CURRENCY_FORMAT } },
    { header: 'Water', key: 'water', width: 15, style: { numFmt: CURRENCY_FORMAT } },
    { header: 'Late fee', key: 'late_fee', width: 13, style: { numFmt: CURRENCY_FORMAT } },
    { header: 'Previous due', key: 'previous_due', width: 15, style: { numFmt: CURRENCY_FORMAT } },
    { header: 'Advance', key: 'advance', width: 13, style: { numFmt: CURRENCY_FORMAT } },
    { header: 'Total due', key: 'total', width: 15, style: { numFmt: CURRENCY_FORMAT } },
  ]
  styleHeader(billsSheet.getRow(1))

  const totals = { maintenance: 0, water: 0, lateFee: 0, previousDue: 0, advance: 0, total: 0 }
  for (const flat of billableFlats) {
    const bill = await computeBillForFlat(supabase, apartment, flat, month)
    billsSheet.addRow({
      flat_no: flat.flat_no,
      owner: flat.owner_name ?? '',
      maintenance: bill.maintenance_share,
      water: bill.water_charge,
      late_fee: bill.late_fee,
      previous_due: bill.previous_due,
      advance: -bill.advance_payment,
      total: bill.total_due,
    })
    totals.maintenance += bill.maintenance_share
    totals.water += bill.water_charge
    totals.lateFee += bill.late_fee
    totals.previousDue += bill.previous_due
    totals.advance += bill.advance_payment
    totals.total += bill.total_due
  }
  const totalRow = billsSheet.addRow({
    flat_no: 'Total',
    owner: '',
    maintenance: totals.maintenance,
    water: totals.water,
    late_fee: totals.lateFee,
    previous_due: totals.previousDue,
    advance: -totals.advance,
    total: totals.total,
  })
  totalRow.font = { bold: true }

  // ─── Maintenance ────────────────────────────────────────────────────
  const maintSheet = workbook.addWorksheet('Maintenance')
  if (maintenancePeriod) {
    maintSheet.addRow(['Period', formatPeriodLabel(maintenancePeriod.month, maintenancePeriod.period_end)])
    maintSheet.addRow(['Status', maintenancePeriod.status])
    maintSheet.addRow([])
    const header = maintSheet.addRow(['Description', 'Amount', 'Comment'])
    styleHeader(header)
    maintSheet.getColumn(2).numFmt = CURRENCY_FORMAT
    maintSheet.getColumn(1).width = 30
    maintSheet.getColumn(2).width = 15
    maintSheet.getColumn(3).width = 40
    for (const item of maintenancePeriod.line_items) {
      maintSheet.addRow([item.description, item.amount, item.comment ?? ''])
    }
    const grandTotalRow = maintSheet.addRow(['Grand total', maintenanceGrandTotal(maintenancePeriod.line_items), ''])
    grandTotalRow.font = { bold: true }
  } else {
    maintSheet.addRow(['No maintenance period started yet.'])
  }

  // ─── Water Meters ───────────────────────────────────────────────────
  // Every real meter (including a shared/common one and any merged second
  // meter) — the point of this sheet is the raw readings, not the billed
  // totals already covered on the Bills sheet.
  const waterSheet = workbook.addWorksheet('Water Meters')
  waterSheet.columns = [
    { header: 'Flat', key: 'flat_no', width: 10 },
    { header: 'Previous', key: 'previous', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Current', key: 'current', width: 14, style: { numFmt: '#,##0' } },
    { header: 'Consumption (L)', key: 'consumption', width: 16, style: { numFmt: '#,##0' } },
    { header: 'Flagged', key: 'flagged', width: 10 },
    { header: 'Note', key: 'note', width: 30 },
  ]
  styleHeader(waterSheet.getRow(1))

  for (const flat of allFlats) {
    const reading = await getWaterReading(supabase, flat.id, month)
    const consumption =
      reading?.current_reading !== null && reading?.previous_reading !== null && reading
        ? reading.current_reading! - reading.previous_reading!
        : null
    waterSheet.addRow({
      flat_no: flat.flat_no,
      previous: reading?.previous_reading ?? null,
      current: reading?.current_reading ?? null,
      consumption,
      flagged: reading?.flagged ? 'Yes' : '',
      note: reading?.flagged_note || reading?.owner_note || '',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const safeName = apartment.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bills-${safeName}-${month}.xlsx"`,
    },
  })
}
