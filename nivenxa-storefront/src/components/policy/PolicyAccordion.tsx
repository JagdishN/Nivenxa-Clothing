'use client'
import { useEffect, useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { DEFAULT_POLICY_LINKS, type PolicyBlock, type PolicyItem, type PolicyTextLink } from '@/types/policy'
import styles from './PolicyAccordion.module.scss'

// Applies every link rule to `text`, then expands any remaining literal
// "\n" in the untouched string segments into real line breaks — covers a
// multi-line block (e.g. a registered-office address) without a separate
// block type for it. Links are matched before the \n-split so a link whose
// text happens to sit right next to a line break still resolves correctly.
function applyLinks(text: string, links: PolicyTextLink[]): React.ReactNode[] {
  let nodes: React.ReactNode[] = [text]
  links.forEach((link, li) => {
    const next: React.ReactNode[] = []
    nodes.forEach((node, ni) => {
      if (typeof node !== 'string') {
        next.push(node)
        return
      }
      const idx = node.indexOf(link.text)
      if (idx === -1) {
        next.push(node)
        return
      }
      next.push(
        node.slice(0, idx),
        link.action === 'open-cookie-settings' ? (
          <button key={`${li}-${ni}`} type="button" className={styles.inlineLink} data-open-cookie-settings>
            {link.text}
          </button>
        ) : (
          <a key={`${li}-${ni}`} href={link.href} className={styles.inlineLink}>
            {link.text}
          </a>
        ),
        node.slice(idx + link.text.length)
      )
    })
    nodes = next
  })

  const withLineBreaks: React.ReactNode[] = []
  nodes.forEach((node, i) => {
    if (typeof node !== 'string') {
      withLineBreaks.push(node)
      return
    }
    const lines = node.split('\n')
    lines.forEach((line, j) => {
      withLineBreaks.push(line)
      if (j < lines.length - 1) withLineBreaks.push(<br key={`br-${i}-${j}`} />)
    })
  })
  return withLineBreaks
}

function renderBlocks(blocks: PolicyBlock[]) {
  return blocks.map((block, i) => {
    if (block.type === 'subheading') {
      return (
        <h3 key={i} className={styles.subheading}>
          {block.text}
        </h3>
      )
    }
    const links = [...DEFAULT_POLICY_LINKS, ...(block.links ?? [])]
    if (block.type === 'list') {
      return (
        <ul key={i} className={styles.list}>
          {block.items.map((item) => (
            <li key={item} className={styles.listItem}>
              {applyLinks(item, links)}
            </li>
          ))}
        </ul>
      )
    }
    return (
      <p key={i} className={styles.paragraph}>
        {applyLinks(block.text, links)}
      </p>
    )
  })
}

function AccordionRow({ item, isOpen, onToggle }: { item: PolicyItem; isOpen: boolean; onToggle: (id: string) => void }) {
  const headerId = `${item.id}-header`
  const panelId = `${item.id}-panel`

  return (
    <div id={item.id} className={styles.item}>
      {/* The button is the sole content of a heading, per the WAI-ARIA
          accordion pattern — lets screen-reader users navigate the list by
          heading as well as by tab order. */}
      <h3 className={styles.itemHeadingWrap}>
        <button type="button" id={headerId} aria-expanded={isOpen} aria-controls={panelId} className={styles.header} onClick={() => onToggle(item.id)}>
          <span className={styles.headerText}>
            <span className={styles.itemTitle}>{item.title}</span>
            <span className={styles.itemSummary}>{item.summary}</span>
          </span>
          <IconChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true" size={18} />
        </button>
      </h3>

      {/* Panel content is always rendered — never conditionally mounted —
          so it's present in the server-rendered HTML and indexable even
          collapsed. Collapsing is purely visual, via the grid-rows wrapper
          below, which clips to the real content height rather than a
          fixed max-height — several of these panels run well past the
          400px cap InfoAccordions.tsx (the one other accordion in this
          codebase) uses, which would either clip them or desync the
          transition timing from the actual distance animated. */}
      <div className={`${styles.panelWrapper} ${isOpen ? styles.panelWrapperOpen : ''}`}>
        <div id={panelId} role="region" aria-labelledby={headerId} className={styles.panelInner}>
          {renderBlocks(item.blocks)}
        </div>
      </div>
    </div>
  )
}

export default function PolicyAccordion({ items }: { items: PolicyItem[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  // Open + scroll to whatever item the URL hash names — on initial load
  // AND on any later hashchange, so an in-page cross-reference link (e.g.
  // Privacy's "(see Cookies)") opens its target too, not just a fresh page
  // load. Each row carries the real id (not the button or panel), so the
  // browser's own hash-navigation already lands in the right place before
  // this even runs on first load; scrollIntoView is a deliberate no-op
  // there, and the only thing that matters for the hashchange case, which
  // doesn't get a native scroll on its own.
  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.slice(1)
      if (!hash || !items.some((item) => item.id === hash)) return
      setOpenIds((prev) => new Set(prev).add(hash))
      document.getElementById(hash)?.scrollIntoView({ block: 'start' })
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [items])

  function toggle(id: string) {
    const willOpen = !openIds.has(id)
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (willOpen) next.add(id)
      else next.delete(id)
      return next
    })
    // Only the opening action updates the hash, and via replaceState (not
    // location.hash =) specifically so it never re-triggers the browser's
    // own scroll-into-view — the content is already in view; the hash is
    // just there to make this state linkable.
    if (willOpen) window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className={styles.accordion}>
      {items.map((item) => (
        <AccordionRow key={item.id} item={item} isOpen={openIds.has(item.id)} onToggle={toggle} />
      ))}
    </div>
  )
}
