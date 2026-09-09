'use client'
import { useAuthDrawer, type AuthDrawerMode } from './AuthDrawerProvider'

/** A styled button that opens the shared AuthDrawer — drop-in replacement for a <Link href="/living/login|signup">. */
export default function AuthTrigger({
  mode,
  className,
  children,
}: {
  mode: AuthDrawerMode
  className?: string
  children: React.ReactNode
}) {
  const { open } = useAuthDrawer()
  return (
    <button type="button" className={className} onClick={() => open(mode)}>
      {children}
    </button>
  )
}
