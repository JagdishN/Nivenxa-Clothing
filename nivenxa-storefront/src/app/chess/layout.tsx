import ChessNav from './ChessNav'
import ChessSessionTimeout from './ChessSessionTimeout'
import theme from './ChessTheme.module.scss'

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={theme.theme}>
      <ChessNav />
      <ChessSessionTimeout />
      {children}
    </div>
  )
}
