import type { AnalysisDetailMode, PlaybackSpeed, UseAnalysisPlaybackResult } from '@/lib/chess/useAnalysisPlayback'
import styles from './Player.module.scss'

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 1.5, 2]

export default function PlaybackControls({ playback, totalPlies }: { playback: UseAnalysisPlaybackResult; totalPlies: number }) {
  return (
    <div className={styles.controls}>
      <div className={styles.transportRow}>
        <button type="button" className={styles.transportBtn} onClick={playback.goToStart} disabled={playback.atStart}>
          |&lt; Beginning
        </button>
        <button type="button" className={styles.transportBtn} onClick={playback.stepBackward} disabled={playback.atStart}>
          &lt; Previous
        </button>
        <button type="button" className={styles.transportBtnPrimary} onClick={playback.toggle} disabled={playback.atEnd && !playback.isPlaying}>
          {playback.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" className={styles.transportBtn} onClick={playback.stepForward} disabled={playback.atEnd}>
          Next &gt;
        </button>
        <button type="button" className={styles.transportBtn} onClick={playback.goToEnd} disabled={playback.atEnd}>
          End &gt;|
        </button>
        <span className={styles.moveCounter}>
          Move {playback.currentPly} / {totalPlies}
        </span>
      </div>

      <div className={styles.optionsRow}>
        <div className={styles.speedGroup}>
          <span className={styles.optionsLabel}>Speed:</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.speedBtn} ${playback.speed === s ? styles.speedBtnActive : ''}`}
              onClick={() => playback.setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.toggleBtn} ${playback.pauseAtKeyMoments ? styles.toggleBtnActive : ''}`}
          onClick={() => playback.setPauseAtKeyMoments(!playback.pauseAtKeyMoments)}
        >
          Pause at Key Moments — {playback.pauseAtKeyMoments ? 'ON' : 'OFF'}
        </button>

        <div className={styles.detailGroup}>
          {(['key', 'every'] as AnalysisDetailMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles.detailBtn} ${playback.detailMode === mode ? styles.detailBtnActive : ''}`}
              onClick={() => playback.setDetailMode(mode)}
            >
              {mode === 'key' ? 'Key Moments' : 'Every Move'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
