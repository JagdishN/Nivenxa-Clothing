# App footers: Chess, Living, Technologies (Studio excluded)

**Current design (supersedes the earlier public/working variants and the Explore popover):** one complete footer, everything visible, no
accordion/popover/disclosure. Studio keeps `SiteFooter` untouched.

- Groups: **NIVENXA** (parent description from the site's existing root description + current app "NIVENXA <app> · By NIVENXA"),
  **Brands** (Studio, Technologies), **Apps** (Chess, Living), **Support & Legal** (Contact, Privacy Policy, Terms of Use — the current app's own). Then a modest copyright row.
- Code: `src/lib/footerConfig.ts` (config), `src/components/global/AppFooter/AppFooter.tsx` + `.module.scss` (palettes per app: Chess aubergine #2A1845,
  Living teal #14444C, Technologies forest #1C2E1E), `PageShell` (footer in normal flow). `wide` aligns Living's signed-in screens to its wide container.
- Removed: FooterPurpose markers, per-section layouts that only existed for them, the `:has()` selector in globals.scss, FooterGroups/ExploreMenu.
- Routes: Chess (all, via `app/chess/layout.tsx`), Living public pages + `(dashboard)` layout, `/technologies`. Root pages (`/`, `/privacy`, `/terms`, `/contact`, `/ventures`) still use the shared footer.

## Heights (px, same viewport, Chromium; footer only)
| | Desktop 1280×800 | Mobile 390×844 | 200 % zoom (640×400) |
|---|---|---|---|
| Chess / Technologies | 188 | 435 | 435 |
| Living (narrow landing container, one extra wrapped line) | 209 | 435 | 435 |
| Studio (control, unchanged) | 327 | 749 | 749 |

Content determines height; no fixed heights, clipping or shrunken text. Screenshots: `docs/chess-screenshots/footers-v3/footer-only/` (+ `heights.json`).

## Verification (dev server)
tsc clean; eslint clean on the footer files/tests; `tests/app-footer.spec.ts` 24/24: same structure + correct hrefs on 18 routes
(Chess home/play/learn/lesson/analysis/puzzles/solver/tournaments/login/terms/privacy, Living landing/login/signup/terms/privacy, Technologies), no buttons/details,
four headings on one line on desktop, phone two-column layout, no overflow at 320 px and 640×400, contrast ≥ 4.5:1 and focus rings, Studio footer unchanged (327 px, original colour).

## Limitations
Not re-run on a production build this round. Living signed-in screens (billing, water, expenses, payments, inventory, providers) need a login and were NOT opened;
they share the layout footer and the dev preview (`/chess/dev-preview/footers`, 404 in production) shows the wide variant. Chess event-detail pages and loading/error states weren't individually opened.
Earlier Studio disclosure still applies: the earlier footer-gap fix changed Studio's spacing above its footer (offer to revert stands).
