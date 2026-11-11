'use client'
import { useEffect, useState } from 'react'
import type { BotId } from '@/lib/chess/botRoster'

type ArtMap = Record<string, { src: string }>
let loaded: ArtMap | null = null
let loading: Promise<ArtMap> | null = null

/** The artwork module is fetched on first use (a separate chunk), so a page that never shows a character never downloads it. */
function loadArt(): Promise<ArtMap> {
  if (loaded) return Promise.resolve(loaded)
  loading ??= import('@/lib/chess/botArtReal').then((m) => (loaded = m.default as ArtMap))
  return loading
}

/**
 * A character's flat artwork at a fixed size. Until the image is ready (or if it fails) a plain disc with the initial holds the exact
 * same space, so nothing shifts. Only Tivvi has approved layered animation: nothing here is animated or face-swapped.
 */
export default function BotArt({ id, name, size, className }: { id: BotId; name: string; size: number; className?: string }) {
  const [art, setArt] = useState<ArtMap | null>(loaded)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    if (!loaded) loadArt().then((m) => live && setArt(m)).catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])
  const box: React.CSSProperties = { width: size, height: size, borderRadius: '50%', flex: '0 0 auto', display: 'block' }
  const src = art?.[id]?.src
  if (failed || !src) {
    return (
      <span className={className} style={{ ...box, display: 'grid', placeItems: 'center', background: '#3a1550', color: '#f7f0e1', fontWeight: 700, fontSize: size * 0.45 }} role="img" aria-label={name} data-testid={`bot-art-${id}-placeholder`}>
        {name.charAt(0)}
      </span>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element -- fixed-size local artwork; next/image would add a wrapper and a loader step for a 128 px file
  return <img className={className} src={src} width={size} height={size} alt={name} data-testid={`bot-art-${id}`} style={box} onError={() => setFailed(true)} draggable={false} />
}
