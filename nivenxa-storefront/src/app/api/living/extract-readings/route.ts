import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getLivingMembership } from '@/lib/living/auth'
import { ACCEPTED_MEDIA_TYPES, buildExtractReadingsRequest, type AcceptedMediaType } from '@/lib/living/aiExtractReadings'

// Same lazy-client pattern as the chess explanation routes — a missing
// ANTHROPIC_API_KEY fails the first real request with a clear error
// instead of throwing at module load.
let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic()
  return client
}

// One calm message for every failure mode (config, rate limit, API error,
// unreadable output) — the client always shows this exact text regardless
// of which branch below produced it; see UploadReadingsForm.tsx.
const UNREADABLE_MESSAGE = "Couldn't read this sheet — please enter readings manually."

export interface ExtractedReadingRow {
  flat_no: string
  current_reading: number
  confidence: 'high' | 'low'
}

function parseRows(raw: string): ExtractedReadingRow[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const parsed: unknown = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array')
  return parsed
    .filter(
      (row): row is ExtractedReadingRow =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as ExtractedReadingRow).flat_no === 'string' &&
        typeof (row as ExtractedReadingRow).current_reading === 'number'
    )
    .map((row) => ({
      flat_no: row.flat_no.trim(),
      current_reading: row.current_reading,
      confidence: row.confidence === 'low' ? 'low' : 'high',
    }))
}

export async function POST(request: NextRequest) {
  const membership = await getLivingMembership(['admin'])
  if (!membership) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: UNREADABLE_MESSAGE }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No image uploaded' }, { status: 400 })
  }
  if (!ACCEPTED_MEDIA_TYPES.includes(file.type as AcceptedMediaType)) {
    return NextResponse.json({ error: `Unsupported image type: ${file.type || 'unknown'}. Use JPEG, PNG, GIF, or WebP.` }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // buildExtractReadingsRequest's own input type has no field for a
    // resident name, flat-owner mapping, or anything else from our
    // database — only the image and a fixed, server-side prompt can ever
    // reach Claude through it.
    const response = await getClient().messages.create(
      buildExtractReadingsRequest({ imageBase64: base64, mediaType: file.type as AcceptedMediaType })
    )

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    const rows = parseRows(textBlock?.text.trim() ?? '[]')
    return NextResponse.json({ rows })
  } catch (err) {
    // One calm message regardless of cause (config, rate limit, API error,
    // or output that didn't parse as the expected JSON) — see
    // UNREADABLE_MESSAGE above. Status codes stay distinct for anything
    // reading the raw response/logs; the client's own display text never
    // varies by cause either way (UploadReadingsForm.tsx).
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: UNREADABLE_MESSAGE }, { status: 503 })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: UNREADABLE_MESSAGE }, { status: 429 })
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: UNREADABLE_MESSAGE }, { status: err.status ?? 500 })
    }
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: UNREADABLE_MESSAGE }, { status: 422 })
    }
    return NextResponse.json({ error: UNREADABLE_MESSAGE }, { status: 500 })
  }
}
