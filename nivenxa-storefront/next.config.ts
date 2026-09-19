import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // Exposes package.json's own "version" to the client — first real consumer
  // is the Feedback widget's "App version" field (src/components/feedback).
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
  turbopack: {
    resolveAlias: {
      'next-intl/config': './src/i18n/request.ts',
    },
  },
  experimental: {
    serverActions: {
      // Next's own default is 1MB — silently rejected (HTTP 413) before the
      // Server Action even runs, which surfaces to the browser as a bare
      // "Failed to fetch" with no useful message. Living's Documents page
      // (and any other Server-Action-based file upload) needs real headroom
      // for a photographed/scanned receipt or invoice, which routinely runs
      // several MB. This is a global Next.js limit — it does not affect the
      // API-Route-based uploads (feedback screenshots, water readings, chess
      // scoresheets), which parse their own FormData and aren't subject to
      // Server Actions' body parser at all.
      bodySizeLimit: '15mb',
    },
  },
}

export default withNextIntl(nextConfig)
