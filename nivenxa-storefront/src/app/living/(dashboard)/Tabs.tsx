'use client'
import { useState, type ReactNode } from 'react'
import theme from '../LivingTheme.module.scss'
import styles from './Tabs.module.scss'

export interface TabDef {
  id: string
  label: string
  badge?: number | string
  content: ReactNode
}

/**
 * Same underline-tab look as Settings → Tanker Rates (theme.tabRow/tab/tabActive
 * from LivingTheme.module.scss) — reused here rather than a separate style,
 * so every tabbed screen in the dashboard reads as one consistent pattern.
 *
 * Plain client-side state, not a ?tab= query param — switching tabs is
 * purely a display concern, not something that needs its own URL (and
 * query-string tab state was explicitly unwanted). The page below still
 * does all its data fetching once, server-side, before handing pre-rendered
 * content for every tab to this component — nothing here ever refetches on
 * switch.
 */
export default function Tabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div>
      <div className={theme.tabRow} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={active === t.id ? theme.tabActive : theme.tab}
            onClick={() => setActive(t.id)}
          >
            {t.label}
            {t.badge !== undefined && <span className={styles.badge}>{t.badge}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  )
}
