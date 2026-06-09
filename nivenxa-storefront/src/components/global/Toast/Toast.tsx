'use client'
import styles from './Toast.module.css'

interface ToastProps {
  visible:      boolean
  message:      string
  subMessage?:  string
  onViewBag?:   () => void
  onClose:      () => void
}

export default function Toast({
  visible,
  message,
  subMessage,
  onViewBag,
  onClose,
}: ToastProps) {

  return (
    <div
      className={`${styles.toast} ${visible ? styles.visible : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.inner}>

        <div className={styles.textBlock}>
          <span className={styles.message}>{message}</span>
          {subMessage && (
            <div className={styles.subLines}>
              {subMessage.split('\n').map((line, i) => (
                <span
                  key={i}
                  className={i === 0 ? styles.subLine1 : styles.subLine2}
                >
                  {line}
                </span>
              ))}
            </div>
          )}
        </div>

        {onViewBag && (
          <button
            className={styles.viewBag}
            onClick={() => {
              onViewBag()
              onClose()
            }}
          >
            View bag →
          </button>
        )}

      </div>
    </div>
  )
}
