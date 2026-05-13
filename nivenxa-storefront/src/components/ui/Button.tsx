import { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.scss'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline'
  fullWidth?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const cls = [
    styles.btn,
    variant === 'outline' ? styles.outline : styles.primary,
    fullWidth ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} {...props}>
      {children}
    </button>
  )
}
