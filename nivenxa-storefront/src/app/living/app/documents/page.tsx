import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/living/auth'
import { formatMonthLabel, monthKeyFor } from '@/lib/living/format'
import theme from '../../LivingTheme.module.scss'
import homeStyles from '../Home.module.scss'

const BUCKET = 'living-documents'

async function uploadAction(formData: FormData) {
  'use server'
  const { supabase, apartment, userId } = await requireMembership(['admin', 'treasurer'])
  const file = formData.get('file') as File | null
  const label = String(formData.get('label') ?? '').trim()
  const month = String(formData.get('month') ?? monthKeyFor(new Date()))
  if (!file || file.size === 0 || !label) redirect('/living/app/documents?error=' + encodeURIComponent('Choose a file and give it a label.'))

  const path = `${apartment.id}/${Date.now()}-${file!.name}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file!)
  if (uploadError) redirect('/living/app/documents?error=' + encodeURIComponent(uploadError.message))

  const { error } = await supabase.from('living_bill_documents').insert({
    apartment_id: apartment.id,
    month,
    label,
    category: String(formData.get('category') ?? '').trim() || null,
    file_path: path,
    uploaded_by: userId,
  })
  if (error) redirect('/living/app/documents?error=' + encodeURIComponent(error.message))
  redirect('/living/app/documents?notice=' + encodeURIComponent('Uploaded.'))
}

async function deleteAction(formData: FormData) {
  'use server'
  const { supabase, apartment } = await requireMembership(['admin', 'treasurer'])
  const id = String(formData.get('id'))
  const path = String(formData.get('path'))

  await supabase.storage.from(BUCKET).remove([path])
  const { error } = await supabase.from('living_bill_documents').delete().eq('id', id).eq('apartment_id', apartment.id)
  if (error) redirect('/living/app/documents?error=' + encodeURIComponent(error.message))
  redirect('/living/app/documents?notice=' + encodeURIComponent('Removed.'))
}

export default async function LivingDocumentsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams
  const { supabase, membership, apartment } = await requireMembership()
  const canManage = membership.role === 'admin' || membership.role === 'treasurer'

  const { data: docs } = await supabase
    .from('living_bill_documents')
    .select('*')
    .eq('apartment_id', apartment.id)
    .order('created_at', { ascending: false })

  const withUrls = await Promise.all(
    (docs ?? []).map(async (doc) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60 * 10)
      return { ...doc, url: data?.signedUrl ?? null }
    })
  )

  return (
    <>
      <h1 className={theme.heading} style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>
        Bill &amp; payment documents
      </h1>
      {notice && <div className={theme.alertInfo}>{notice}</div>}
      {error && <div className={theme.alert}>{error}</div>}

      {canManage && (
        <div className={theme.card} style={{ marginBottom: '1.5rem' }}>
          <h2 className={homeStyles.sectionTitle}>Upload</h2>
          <form action={uploadAction}>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="label">
                Label
              </label>
              <input id="label" name="label" className={theme.input} placeholder="Electricity Bill — August" required />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="category">
                Category (optional)
              </label>
              <input id="category" name="category" className={theme.input} placeholder="Utilities" />
            </div>
            <div className={theme.field}>
              <label className={theme.label} htmlFor="month">
                Month
              </label>
              <input id="month" name="month" type="date" className={theme.input} defaultValue={monthKeyFor(new Date())} required />
            </div>
            <div className={theme.field}>
              <input type="file" name="file" required />
            </div>
            <button type="submit" className={theme.button}>
              Upload
            </button>
          </form>
        </div>
      )}

      <div className={homeStyles.rowList}>
        {withUrls.map((doc) => (
          <div key={doc.id} className={homeStyles.row}>
            <span>
              {doc.label} <span className={theme.muted}>— {formatMonthLabel(doc.month)}</span>
              {doc.category && <span className={theme.pillBrass} style={{ marginLeft: '0.5rem' }}>{doc.category}</span>}
            </span>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {doc.url && (
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              )}
              {canManage && (
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="path" value={doc.file_path} />
                  <button type="submit" className={theme.buttonGhost}>
                    Delete
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {withUrls.length === 0 && <p className={theme.muted}>No documents yet.</p>}
      </div>
    </>
  )
}
