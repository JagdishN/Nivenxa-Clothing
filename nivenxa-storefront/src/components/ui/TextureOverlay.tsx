import styles from './TextureOverlay.module.scss'

const FINE_GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23f)' opacity='0.11'/%3E%3C/svg%3E")`

const WEAVE_GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.42 0.18' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23w)' opacity='0.07'/%3E%3C/svg%3E")`

interface TextureOverlayProps {
  opacity?: number
  soft?: boolean
}

export default function TextureOverlay({ opacity = 1, soft = false }: TextureOverlayProps) {
  const blendCls = soft ? styles.softLight : ''

  return (
    <>
      <div
        aria-hidden="true"
        className={`${styles.layer} ${styles.grain} ${blendCls}`}
        style={{
          backgroundImage: FINE_GRAIN,
          opacity,
        } as React.CSSProperties}
      />
      <div
        aria-hidden="true"
        className={`${styles.layer} ${styles.weave} ${blendCls}`}
        style={{
          backgroundImage: WEAVE_GRAIN,
          opacity: opacity * 0.6,
        } as React.CSSProperties}
      />
    </>
  )
}
