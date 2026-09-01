import ChessNav from './ChessNav'
import theme from './ChessTheme.module.scss'

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={theme.theme}>
      <ChessNav />
      {children}
    </div>
  )
}
