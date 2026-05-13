import { redirect } from 'next/navigation'

// Middleware handles locale detection; this is a fallback
export default function RootPage() {
  redirect('/en')
}
