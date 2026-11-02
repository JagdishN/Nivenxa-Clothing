import { IconMail } from '@tabler/icons-react'
import styles from './PolicyHelp.module.scss'

export interface PolicyHelpProps {
  title: string
  text: string
  email: string
  buttonLabel: string
  mailtoHref: string
}

export default function PolicyHelp({ title, text, email, buttonLabel, mailtoHref }: PolicyHelpProps) {
  return (
    <div className={styles.help}>
      <h2 className={styles.helpTitle}>{title}</h2>
      <p className={styles.helpText}>{text}</p>
      <a href={`mailto:${email}`} className={styles.helpEmail}>
        {email}
      </a>
      <a href={mailtoHref} className={styles.helpButton}>
        <IconMail aria-hidden="true" size={18} stroke={1.75} />
        {buttonLabel}
      </a>
    </div>
  )
}
