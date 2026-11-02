interface Redirect {
  source: string
  destination: string
  statusCode: 301
}

// Permanent (301) redirects for Studio URLs that existed before the SS2026
// range update, so old links and bookmarks land on the most relevant live
// page instead of 404ing. Wired into next.config.ts.
//
// Rules of thumb:
//  - Men's has been removed entirely → its URLs go to the matching Unisex page.
//  - A removed product with no direct successor → its collection page.
//  - The "Youth Studio" collection is now "Kids" (/shop/kids).
//  - The old per-collection category pages (/shop/unisex/cargo-pants etc.) no
//    longer exist; products live at /shop/{handle}/{colour}.
//  - The /edits section (curated edits of the removed range) is gone → /shop.
const S = '/studio/:locale'

const permanent = (source: string, destination: string): Redirect => ({
  source,
  destination,
  statusCode: 301,
})

export const STUDIO_REDIRECTS: Redirect[] = [
  // ── Men's → Unisex ─────────────────────────────────────────────────────────
  permanent(`${S}/shop/mens`, `${S}/shop/unisex`),
  permanent(`${S}/shop/mens-essentials`, `${S}/shop/unisex`),
  permanent(`${S}/shop/mens/cargo-pants`, `${S}/shop/cargo-pants`),
  permanent(`${S}/shop/mens/oversized-tee`, `${S}/shop/unisex`),
  permanent(`${S}/shop/mens/:path+`, `${S}/shop/unisex`),
  // The old Pocket Tee ("over-tee-shirts") is not part of the SS2026 range.
  permanent(`${S}/shop/over-tee-shirts/:rest*`, `${S}/shop/unisex`),

  // ── Unisex: old category pages + removed cargo colours ─────────────────────
  permanent(`${S}/shop/unisex/cargo-pants`, `${S}/shop/cargo-pants`),
  permanent(`${S}/shop/unisex/:path+`, `${S}/shop/unisex`),
  permanent(`${S}/shop/cargo-pants/:colour(carbon|tobacco|phantom)`, `${S}/shop/cargo-pants/forest-floor`),

  // ── Youth Studio → Kids ────────────────────────────────────────────────────
  permanent(`${S}/shop/youth-studio`, `${S}/shop/kids`),
  permanent(`${S}/shop/youth-studio/kids-unisex-tee`, `${S}/shop/kids-unisex-tee`),
  permanent(`${S}/shop/youth-studio/kids-tee`, `${S}/shop/kids-unisex-tee`),
  permanent(`${S}/shop/youth-studio/:path+`, `${S}/shop/kids`),
  permanent(`${S}/shop/kids-unisex-tee/:colour(mist-blue|warm-sand|little-sage|butter)`, `${S}/shop/kids-unisex-tee/cloud`),
  permanent(`${S}/shop/:slug(kids-rest-sleep-set|kids-summer-sleep-set)/:rest*`, `${S}/shop/kids`),

  // ── Women ──────────────────────────────────────────────────────────────────
  permanent(`${S}/shop/womens/a-line-kurta`, `${S}/shop/a-line-kurta-set`),
  permanent(`${S}/shop/womens/co-ord-set`, `${S}/shop/womens-co-ord-set`),
  permanent(`${S}/shop/womens/:path+`, `${S}/shop/womens`),
  permanent(`${S}/shop/a-line-kurta/:rest*`, `${S}/shop/a-line-kurta-set`),
  permanent(`${S}/shop/women-lounge-sets/:rest*`, `${S}/shop/womens-co-ord-set`),
  permanent(
    `${S}/shop/:slug(kurta-contrast-pant|kurta-straight-pant|women-sleepwear|women-sleep-set|womens-relaxed-shirt)/:rest*`,
    `${S}/shop/womens`,
  ),

  // ── Sections removed outright ──────────────────────────────────────────────
  permanent(`${S}/edits/:path*`, `${S}/shop`),
  permanent(`${S}/product/:id`, `${S}/shop`),
]
