'use client'
import OtpBoxes from '@/components/auth/OtpBoxes'
import styles from './OtpInput.module.scss'

/** Living's themed six-box code entry (the behaviour lives in the shared OtpBoxes). */
export default function OtpInput(props: Omit<React.ComponentProps<typeof OtpBoxes>, 'className'>) {
  return <OtpBoxes {...props} className={styles.theme} />
}
