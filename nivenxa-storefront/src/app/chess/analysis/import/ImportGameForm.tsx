'use client'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { parsePastedMoves } from '@/lib/chess/pgnImport'
import { reconstructGameFromOcrMoves } from '@/lib/chess/reconstructFromOcr'
import { setPendingGame } from '@/lib/chess/analysisSession'
import type { GameSource, NormalizedGame } from '@/lib/chess/analysisTypes'
import CardIcon from '../CardIcon'
import styles from './Import.module.scss'

const PASTE_EXAMPLE = `1. e4 e5
2. Nf3 Nc6
3. Bb5 a6`

const TEXT_EXTENSIONS = ['.pgn', '.txt']
const PROGRESS_STEPS = ['Reading moves', 'Building positions', 'Checking the game']

function isTextFile(file: File): boolean {
  return TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)) || file.type === 'text/plain'
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type PasteStatus = 'empty' | 'ok' | 'invalid'

/**
 * "N moves detected" invites a ply-vs-move-pair counting argument a casual
 * player shouldn't have to think about while pasting — so the live hint
 * only ever says whether a game was found, not how many of what. The real
 * count ("42 moves found") only appears once, after Reconstruct, when it's
 * unambiguous because the game is already built.
 */
function evaluatePaste(text: string): { moveCount: number; status: PasteStatus } {
  if (!text.trim()) return { moveCount: 0, status: 'empty' }
  const { game } = parsePastedMoves(text)
  const unreadable = game.moves.length === 0 || game.moves.some((m) => m.resolutionStatus === 'needs-review')
  return { moveCount: game.moves.length, status: unreadable ? 'invalid' : 'ok' }
}

interface ScoresheetResponse {
  moves: { ply: number; san_guess: string; confidence: 'high' | 'low' }[]
  white: string | null
  black: string | null
  event: string | null
  played_on: string | null
  result: string | null
  error?: string
}

type ActiveSource = 'upload' | 'paste' | null
type Conflict = { to: 'upload'; file: File } | { to: 'paste'; text: string } | null

/**
 * Upload and Paste are peers, not a primary/fallback pair — side by side on
 * desktop, one shared "Reconstruct Game" CTA below both, and only one of
 * them can be the active source at a time. Neither method reconstructs on
 * its own anymore (a dropped image shouldn't fire OCR before the player has
 * even decided to use it) — everything funnels through handleReconstruct,
 * which is the only place a NormalizedGame gets built and handed to Verify.
 */
export default function ImportGameForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [pasteMoveCount, setPasteMoveCount] = useState(0)
  const [pasteStatus, setPasteStatus] = useState<PasteStatus>('empty')
  const [activeSource, setActiveSource] = useState<ActiveSource>(null)
  const [conflict, setConflict] = useState<Conflict>(null)

  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [progressStage, setProgressStage] = useState(0)
  const [finalMoveCount, setFinalMoveCount] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Derived, not state: the URL only needs to change when stagedFile does.
  // The effect below exists solely to revoke the previous URL — it never
  // calls setState itself.
  const previewUrl = useMemo(
    () => (stagedFile && stagedFile.type.startsWith('image/') ? URL.createObjectURL(stagedFile) : null),
    [stagedFile]
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function acceptFile(file: File) {
    setStagedFile(file)
    setActiveSource('upload')
    setError(null)
  }

  function acceptPaste(text: string) {
    setPasteText(text)
    const evaluated = evaluatePaste(text)
    setPasteMoveCount(evaluated.moveCount)
    setPasteStatus(evaluated.status)
    setActiveSource(text.trim() ? 'paste' : activeSource === 'paste' ? null : activeSource)
    setError(null)
  }

  function handleFileChosen(file: File) {
    if (activeSource === 'paste' && pasteText.trim()) {
      setConflict({ to: 'upload', file })
      return
    }
    acceptFile(file)
  }

  function handlePasteChanged(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    if (activeSource === 'upload' && stagedFile && pasteText.trim() === '' && next.trim() !== '') {
      setConflict({ to: 'paste', text: next })
      return
    }
    acceptPaste(next)
  }

  function resolveConflict(confirm: boolean) {
    if (!conflict) return
    if (confirm) {
      if (conflict.to === 'upload') {
        setPasteText('')
        setPasteMoveCount(0)
        setPasteStatus('empty')
        acceptFile(conflict.file)
      } else {
        setStagedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        acceptPaste(conflict.text)
      }
    } else if (conflict.to === 'upload' && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setConflict(null)
  }

  function removeFile() {
    setStagedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setActiveSource((prev) => (prev === 'upload' ? null : prev))
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileChosen(file)
  }

  async function handleReconstruct() {
    if (working) return
    setWorking(true)
    setError(null)
    setProgressStage(0)
    setFinalMoveCount(null)

    try {
      let game: NormalizedGame

      if (activeSource === 'upload' && stagedFile) {
        const file = stagedFile
        if (isTextFile(file)) {
          const [text] = await Promise.all([file.text(), wait(300)])
          const parsed = parsePastedMoves(text, 'pgn-upload')
          if (parsed.game.moves.length === 0) throw new Error(parsed.errors[0] ?? "Nivenxa couldn't find any moves in that file.")
          game = parsed.game
        } else {
          const source: GameSource = file.type === 'application/pdf' ? 'pdf-ocr' : 'image-ocr'
          const formData = new FormData()
          formData.append('file', file)
          const [res] = await Promise.all([fetch('/api/chess/extract-scoresheet', { method: 'POST', body: formData }), wait(300)])
          const data: ScoresheetResponse = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Failed to read that score sheet.')
          if (data.moves.length === 0) {
            throw new Error("Nivenxa couldn't read any moves from that file — try a clearer image, or paste the moves instead.")
          }
          game = reconstructGameFromOcrMoves(
            data.moves,
            { white: data.white ?? undefined, black: data.black ?? undefined, event: data.event ?? undefined, played_on: data.played_on ?? undefined, result: data.result ?? undefined },
            source
          )
        }
      } else if (activeSource === 'paste' && pasteText.trim()) {
        await wait(300)
        const parsed = parsePastedMoves(pasteText)
        if (parsed.game.moves.length === 0) throw new Error(parsed.errors[0] ?? "Nivenxa couldn't find any moves in that text.")
        game = parsed.game
      } else {
        setWorking(false)
        return
      }

      setProgressStage(1)
      await wait(280)
      setProgressStage(2)
      await wait(280)
      setProgressStage(3)
      await wait(280)
      setFinalMoveCount(game.moves.length)
      setPendingGame(game)
      await wait(500)
      router.push('/chess/analysis/verify')
    } catch (err) {
      setWorking(false)
      setProgressStage(0)
      setError(err instanceof Error ? err.message : 'Something went wrong reading that game.')
    }
  }

  const canReconstruct =
    !working && !conflict && ((activeSource === 'upload' && !!stagedFile) || (activeSource === 'paste' && pasteMoveCount > 0))
  const fileIsText = stagedFile ? isTextFile(stagedFile) : true

  return (
    <div className={styles.formWrap}>
      <div className={styles.formGrid}>
        <div className={`${styles.uploadArea} ${activeSource === 'paste' ? styles.cardInactive : ''}`}>
          <h2 className={styles.cardHeading}>
            <CardIcon type="import" size={34} />
            Upload your game
          </h2>

          {stagedFile ? (
            <div className={styles.uploaded}>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- transient blob: URL from a local File, not a next/image-optimizable asset
                <img src={previewUrl} alt="" className={styles.uploadedThumb} />
              )}
              <p className={styles.uploadedCheck}>✓ {fileIsText ? 'Game added' : 'Score sheet added'}</p>
              <p className={styles.uploadedName}>{stagedFile.name}</p>
              <p className={styles.uploadedMeta}>
                {fileIsText ? formatFileSize(stagedFile.size) : 'Nivenxa will read the moves when you reconstruct the game.'}
              </p>
              <div className={styles.uploadedActions}>
                <button type="button" className={styles.smallBtn} onClick={() => fileInputRef.current?.click()}>
                  Change File
                </button>
                <button type="button" className={styles.smallBtnGhost} onClick={removeFile}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="import-file-input"
              className={dragOver ? `${styles.dropzone} ${styles.dropzoneActive}` : styles.dropzone}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <span className={styles.dropzoneText}>Drop your game here</span>
              <span className={styles.dropzoneSub}>or</span>
              <span className={styles.chooseFileBtn}>Choose File</span>
            </label>
          )}

          <input
            ref={fileInputRef}
            id="import-file-input"
            type="file"
            accept=".pgn,.txt,text/plain,image/jpeg,image/png,image/gif,image/webp,application/pdf"
            className={styles.fileInput}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileChosen(file)
            }}
          />

          <p className={styles.formatHint}>PGN · PDF · Images · Score Sheets</p>

          {conflict?.to === 'upload' && (
            <div className={styles.conflictBanner}>
              <p className={styles.conflictTitle}>Switch input method?</p>
              <p>Using this file will replace your pasted moves.</p>
              <div className={styles.conflictActions}>
                <button type="button" className={styles.smallBtnGhost} onClick={() => resolveConflict(false)}>
                  Cancel
                </button>
                <button type="button" className={styles.smallBtn} onClick={() => resolveConflict(true)}>
                  Use This File
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.orDivider}>
          <span className={styles.orPill}>OR</span>
        </div>

        <div className={`${styles.pasteArea} ${activeSource === 'upload' ? styles.cardInactive : ''}`}>
          <h2 className={styles.cardHeading}>Paste your moves</h2>
          <div className={styles.textareaWrap}>
            <textarea className={styles.textarea} value={pasteText} onChange={handlePasteChanged} spellCheck={false} />
            {pasteText === '' && (
              <div className={styles.textareaPlaceholder} aria-hidden="true">
                <span className={styles.placeholderLead}>Paste your moves or PGN here…</span>
                <span className={styles.placeholderExampleLabel}>Example</span>
                <span className={styles.placeholderExample}>{PASTE_EXAMPLE}</span>
              </div>
            )}
          </div>
          <p className={pasteStatus === 'ok' ? styles.moveCountHintOk : styles.moveCountHint}>
            {pasteStatus === 'empty' && 'Waiting for moves'}
            {pasteStatus === 'ok' && 'Game detected ✓'}
            {pasteStatus === 'invalid' && "Some moves couldn't be read"}
          </p>

          {conflict?.to === 'paste' && (
            <div className={styles.conflictBanner}>
              <p className={styles.conflictTitle}>Switch input method?</p>
              <p>Using pasted moves will replace the uploaded game.</p>
              <div className={styles.conflictActions}>
                <button type="button" className={styles.smallBtnGhost} onClick={() => resolveConflict(false)}>
                  Cancel
                </button>
                <button type="button" className={styles.smallBtn} onClick={() => resolveConflict(true)}>
                  Use Pasted Moves
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.ctaRow}>
        {working ? (
          <div className={styles.progress}>
            <p className={styles.progressHeadline}>
              {finalMoveCount !== null ? `Your game is ready — ${finalMoveCount} moves found.` : 'Getting your game ready…'}
            </p>
            <div className={styles.progressSteps}>
              {PROGRESS_STEPS.map((label, i) => (
                <span key={label} className={progressStage > i ? styles.progressStepDone : styles.progressStep}>
                  {label}
                  {progressStage > i ? ' ✓' : ''}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" className={styles.submitBtn} disabled={!canReconstruct} onClick={handleReconstruct}>
            Reconstruct Game →
          </button>
        )}
      </div>
    </div>
  )
}
