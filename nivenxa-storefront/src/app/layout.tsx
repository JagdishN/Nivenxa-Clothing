// Root layout — satisfies Next.js requirement.
// Full html/body/fonts live in app/[locale]/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement
}
