'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readNavSource, type NavSource } from '@/lib/navSource'
import styles from './BackLink.module.css'

export default function BackLink() {
  const [source, setSource] = useState<NavSource | null>(null)

  useEffect(() => {
    setSource(readNavSource())
  }, [])

  if (!source) return null

  return (
    <Link href={source.path} className={styles.backLink}>
      ← {source.label}
    </Link>
  )
}
