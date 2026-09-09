import ExcelJS from 'exceljs'

export interface ParsedInventoryRow {
  item_name: string
  quantity: number
  unit: string | null
  category: string | null
  location: string | null
  value: number | null
  purchased_on: string | null
  notes: string | null
}

export interface ParsedInventoryTemplate {
  rows: ParsedInventoryRow[]
  errors: string[]
}

const HEADER_ALIASES: Record<string, keyof ParsedInventoryRow> = {
  item_name: 'item_name',
  itemname: 'item_name',
  item: 'item_name',
  name: 'item_name',
  quantity: 'quantity',
  qty: 'quantity',
  unit: 'unit',
  category: 'category',
  cat: 'category',
  location: 'location',
  loc: 'location',
  value: 'value',
  cost: 'value',
  price: 'value',
  purchased_on: 'purchased_on',
  purchased: 'purchased_on',
  date: 'purchased_on',
  notes: 'notes',
  note: 'notes',
  remarks: 'notes',
}

/** See parseFlatTemplate's identical helper in apartments.ts — ExcelJS cells come back as rich objects, not plain strings. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((run) => run.text ?? '').join('')
    }
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue)
    if ('text' in value) return String(value.text ?? '')
    if ('error' in value) return ''
  }
  return String(value)
}

function normalizeHeader(value: ExcelJS.CellValue): string {
  return cellText(value).trim().toLowerCase().replace(/[\s-]+/g, '_')
}

/**
 * Fixed-column template (`item_name`, `quantity`, `unit`, `category`, `location`, `value`,
 * `purchased_on`, `notes`) — only `item_name` is required. Mirrors parseFlatTemplate's
 * tolerant-header / row-level-errors approach.
 */
export async function parseInventoryTemplate(buffer: ArrayBuffer): Promise<ParsedInventoryTemplate> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: ['The uploaded file has no worksheet.'] }

  let headerRowNumber = -1
  const columnForField = new Map<keyof ParsedInventoryRow, number>()
  for (let candidate = 1; candidate <= Math.min(5, sheet.rowCount); candidate++) {
    const row = sheet.getRow(candidate)
    const found = new Map<keyof ParsedInventoryRow, number>()
    row.eachCell((cell, colNumber) => {
      const field = HEADER_ALIASES[normalizeHeader(cell.value)]
      if (field && !found.has(field)) found.set(field, colNumber)
    })
    if (found.has('item_name')) {
      headerRowNumber = candidate
      for (const [field, col] of found) columnForField.set(field, col)
      break
    }
  }

  if (headerRowNumber === -1) {
    return { rows: [], errors: ['Could not find an "item_name" column — use the provided template without renaming its header row.'] }
  }

  const rows: ParsedInventoryRow[] = []
  const errors: string[] = []

  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    if (row.cellCount === 0) continue

    const itemNameCol = columnForField.get('item_name')!
    const itemName = cellText(row.getCell(itemNameCol).value).trim()
    if (!itemName) continue

    const quantityCol = columnForField.get('quantity')
    const quantityRaw = quantityCol ? cellText(row.getCell(quantityCol).value).trim() : ''
    const quantity = quantityRaw ? Number(quantityRaw) : 1
    if (!Number.isFinite(quantity)) {
      errors.push(`Row ${rowNumber}: "${itemName}" has a non-numeric quantity — skipped.`)
      continue
    }

    const valueCol = columnForField.get('value')
    const valueRaw = valueCol ? cellText(row.getCell(valueCol).value).trim() : ''

    rows.push({
      item_name: itemName,
      quantity,
      unit: columnForField.has('unit') ? cellText(row.getCell(columnForField.get('unit')!).value).trim() || null : null,
      category: columnForField.has('category') ? cellText(row.getCell(columnForField.get('category')!).value).trim() || null : null,
      location: columnForField.has('location') ? cellText(row.getCell(columnForField.get('location')!).value).trim() || null : null,
      value: valueRaw ? Number(valueRaw) : null,
      purchased_on: columnForField.has('purchased_on') ? cellText(row.getCell(columnForField.get('purchased_on')!).value).trim() || null : null,
      notes: columnForField.has('notes') ? cellText(row.getCell(columnForField.get('notes')!).value).trim() || null : null,
    })
  }

  return { rows, errors }
}
