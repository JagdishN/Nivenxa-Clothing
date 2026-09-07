import ExcelJS from 'exceljs'

export interface ParsedFlatRow {
  flat_no: string
  owner_name: string | null
  owner_contact: string | null
}

export interface ParsedFlatTemplate {
  rows: ParsedFlatRow[]
  errors: string[]
}

const HEADER_ALIASES: Record<string, keyof ParsedFlatRow> = {
  flat_no: 'flat_no',
  flatno: 'flat_no',
  flat: 'flat_no',
  owner_name: 'owner_name',
  ownername: 'owner_name',
  name: 'owner_name',
  owner_contact: 'owner_contact',
  ownercontact: 'owner_contact',
  contact: 'owner_contact',
  email: 'owner_contact',
  phone: 'owner_contact',
}

/**
 * ExcelJS doesn't always hand back a plain string — a styled cell (bold
 * headers are the common case) comes back as `{ richText: [...] }`, a
 * formula cell as `{ formula, result }`, a hyperlink as `{ text, hyperlink }`.
 * Stringifying those directly produces "[object Object]", which is exactly
 * why a real, bold-headered template could fail to match "flat_no" even
 * though the text is right there. This unwraps every shape ExcelJS returns
 * down to plain text before any comparison happens.
 */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString()
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
  return cellText(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/**
 * Fixed-column template only (`flat_no`, `owner_name`, `owner_contact`) — a
 * few header spellings are tolerated (see HEADER_ALIASES) but this is
 * deliberately not a free-form import, so parsing stays reliable per the
 * spec. Returns every row it could read plus a list of row-level problems
 * (missing flat_no, duplicate flat_no within the file) rather than throwing
 * on the first bad row — the caller shows both to the Admin before insert.
 */
export async function parseFlatTemplate(buffer: ArrayBuffer): Promise<ParsedFlatTemplate> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { rows: [], errors: ['The uploaded file has no worksheet.'] }

  // Scan the first few rows for the header, not just row 1 — a title or
  // instructions row above the real header is a common real-world case.
  let headerRowNumber = -1
  const columnForField = new Map<keyof ParsedFlatRow, number>()
  for (let candidate = 1; candidate <= Math.min(5, sheet.rowCount); candidate++) {
    const row = sheet.getRow(candidate)
    const found = new Map<keyof ParsedFlatRow, number>()
    row.eachCell((cell, colNumber) => {
      const field = HEADER_ALIASES[normalizeHeader(cell.value)]
      if (field && !found.has(field)) found.set(field, colNumber)
    })
    if (found.has('flat_no')) {
      headerRowNumber = candidate
      for (const [field, col] of found) columnForField.set(field, col)
      break
    }
  }

  if (headerRowNumber === -1) {
    return { rows: [], errors: ['Could not find a "flat_no" column — use the provided template without renaming its header row.'] }
  }

  const rows: ParsedFlatRow[] = []
  const errors: string[] = []
  const seenFlatNos = new Set<string>()

  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    if (row.cellCount === 0) continue

    const flatNoCol = columnForField.get('flat_no')!
    const flatNo = cellText(row.getCell(flatNoCol).value).trim()
    if (!flatNo) continue // blank trailing row — skip silently, not an error

    if (seenFlatNos.has(flatNo)) {
      errors.push(`Row ${rowNumber}: flat_no "${flatNo}" is duplicated in this file — skipped.`)
      continue
    }
    seenFlatNos.add(flatNo)

    const ownerNameCol = columnForField.get('owner_name')
    const ownerContactCol = columnForField.get('owner_contact')

    rows.push({
      flat_no: flatNo,
      owner_name: ownerNameCol ? cellText(row.getCell(ownerNameCol).value).trim() || null : null,
      owner_contact: ownerContactCol ? cellText(row.getCell(ownerContactCol).value).trim() || null : null,
    })
  }

  return { rows, errors }
}
