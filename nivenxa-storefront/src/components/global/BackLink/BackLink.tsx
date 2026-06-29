'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/routing'
import { readNavSource, type NavSource } from '@/lib/navSource'
import styles from './BackLink.module.css'

export default function BackLink() {
  const [source, setSource] = useState<NavSource | null>(null)

  useEffect(() => {
    setSource(readNavSource())
  }, [])

  if (!source) return null

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link href={source.path as any} className={styles.backLink}>
      ← {source.label}
    </Link>
  )
}
