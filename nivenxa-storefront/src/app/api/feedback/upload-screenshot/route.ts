import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/chess/supabase'

const BUCKET = 'feedback-screenshots'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

// No auth gate — matches every other /api/chess|living/* route in this repo
// (feedback must be attachable while logged out). Only ever writes a new
// object; nothing here reads one back, so there's no data to leak.
export async function POST(request: Request) {
  const formData = await request.formData()
  const app = String(formData.get('app') ?? '')
  const file = formData.get('file')

  if (app !== 'chess' && app !== 'living') {
    return NextResponse.json({ error: 'Invalid app.' }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are supported.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Screenshot is too large (5MB max).' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const path = `${app}/${crypto.randomUUID()}${extension}`

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ path })
}
