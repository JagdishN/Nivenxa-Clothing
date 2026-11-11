import { notFound } from 'next/navigation'

// A malformed id is a real 404 (status and all) before anything streams. A well-formed id that matches no event is
// resolved by the page itself; because the page streams behind its loading skeleton, that case is served with the
// not-found screen and a noindex tag rather than a 404 status.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TournamentIdLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  return children
}
