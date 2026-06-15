'use client'
import { useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import type { AccordionItem } from '@/types/product'
import styles from './InfoAccordions.module.css'

interface Props {
  accordions: AccordionItem[]
}

export default function InfoAccordions({ accordions }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => {
    setOpenIndex(prev => (prev === i ? null : i))
  }

  return (
    <section className={styles.section}>
      {accordions.map((item, i) => (
        <div
          key={item.title}
          className={`${styles.row} ${i === accordions.length - 1 ? styles.lastRow : ''}`}
        >
          <button
            type="button"
            className={styles.trigger}
            onClick={() => toggle(i)}
            aria-expanded={openIndex === i}
            aria-controls={`accordion-content-${i}`}
          >
            <span className={styles.triggerLabel}>{item.title}</span>
            <IconChevronDown
              className={`${styles.chevron} ${openIndex === i ? styles.chevronOpen : ''}`}
              aria-hidden="true"
              size={16}
            />
          </button>
          <div
            id={`accordion-content-${i}`}
            className={`${styles.content} ${openIndex === i ? styles.contentOpen : ''}`}
            role="region"
          >
            <div
              className={styles.contentInner}
              // Content may contain simple HTML (e.g. size guide tables)
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          </div>
        </div>
      ))}
    </section>
  )
}
