# NIVENXA Storefront — QA Gap Report
**Generated:** June 2026  
**Suite:** `tests/nivenxa.spec.ts`  
**Codebase revision:** Nivenxa-Storefront-Development-Branch

---

## FEATURES NOT FOUND IN CODEBASE (`test.skip`)

| ID | Location | Reason |
|----|----------|--------|
| PP-23 | ProductInfo | `badge: 'New Season'` exists in `products.ts` data but `ProductInfo.tsx` never renders it. Badge field is defined but unused in the UI. |
| MOB-08 | ImageZoom | Editorial panel (`editCol`) is hidden at mobile breakpoints via CSS `display:none` media query. No DOM removal or JS class toggle — cannot assert visibility reliably in Playwright without evaluating computed styles. |
| MOB-09 | EditsSection | Single-column layout at 375px is a CSS Grid change (`grid-template-columns`). No JS state or class changes occur. |
| ZM-16 | ImageZoom | Modal fills the full viewport — `onClick={e.stopPropagation()}` on the inner `.modal` div means no backdrop area outside the modal is accessible. Close button (ZM-14) and Escape key (ZM-15) are the only tested close paths. |
| MOB-06 | ProductPage / ImageZoom | `heroImageContainer` (first `[aria-label="Open image zoom"]`) has `display:none` at 375px. Mobile product page layout collapses the sticky hero column. No mobile-visible zoom entry point exists in the current implementation. |
| MOB-07 | ProductPage / ImageZoom | Depends on MOB-06; skipped for the same reason. |

### Additional skipped scenarios (CSS-only — not written as tests)

| Scenario | Why skipped |
|----------|-------------|
| Edit card hover reveals "View Edit" text | Pure CSS `:hover` — Playwright hover triggers CSS but the `::after`/overlay text has no aria-label to assert |
| Zoom `cursor: zoom-in` / `cursor: zoom-out` change | CSS `cursor` property change only; no DOM or ARIA change |
| Navbar submenu fade-in animation | CSS `opacity` transition; element is visible before animation completes |
| FloatingCursor movement tracking | Pure CSS/JS visual effect with no semantic DOM state to assert |

---

## FEATURES FOUND BUT UNTESTABLE (or high-flakiness risk)

| Feature | File | Issue |
|---------|------|-------|
| Touch swipe in Zoom | `ImageZoom.tsx` | `TouchEvent` simulation via Playwright is unreliable on non-mobile browsers in headless mode; `page.touchscreen` API requires `hasTouch: true` in context |
| MobileStickyBar OUT OF STOCK state | `MobileStickyBar.tsx` | All test sizes for Raw Oat tee are available; would need a fixture route for an unavailable SKU |
| Zoom 500ms scroll throttle exact timing | `ImageZoom.tsx` | Throttle is enforced but timer-dependent; `page.mouse.wheel` back-to-back may or may not hit the debounce window across CI machines |
| Accordion expand/collapse animation | `InfoAccordions.tsx` | Uses CSS transition; `aria-expanded` toggles correctly but content panel visibility depends on animation completion |
| Editorial `byImage` headline per image | `ImageZoom.tsx` | `editTitle` changes per image type (e.g. "Drop-shoulder silhouette." for studio-front, "Natural movement." for walking view). Images load asynchronously; headline update timing can be flaky |
| Cargo Pants XL unavailable state | `products.ts` | XL is listed as `available:false` for cargoPants but no test fixture navigates to that product+size combination |
| `"Will apply on close"` text absence (no colour change) | `ImageZoom.tsx` | Verified present after colour change (ZM-19). Inverse (text absent at load) is a baseline expectation covered implicitly |

---

## RECOMMENDED ARIA-LABELS TO ADD

These elements were found without `aria-label` during component analysis. Adding them would improve test reliability and accessibility.

| Priority | Element | Component | Suggested aria-label |
|----------|---------|-----------|----------------------|
| HIGH | Mobile sticky bar CTA button | `MobileStickyBar.tsx` | `aria-label="Add to bag"` / `aria-label="Select a size"` — currently has only text content |
| HIGH | Info accordion trigger buttons | `InfoAccordions.tsx` | `aria-label={title}` — currently identified only by `aria-expanded` + `aria-controls`, no human-readable label |
| MEDIUM | NavBar submenu items with children (Men's, Women's, Unisex, Youth Studio) | `Navbar.tsx` | `aria-label="Open Men's submenu"` — currently renders as `<div onMouseEnter>` with no ARIA role or label |
| MEDIUM | FloatingCursor | (global) | `aria-hidden="true"` — decorative element should be hidden from assistive technology |
| LOW | Zoom image column | `ImageZoom.tsx` | `aria-label="Product image gallery, scroll to browse"` — improves screen reader context |
| LOW | ProductSpecs Fit Guide axis labels | `ProductSpecs.tsx` | Wrap in `<figure aria-label="Fit guide scale">` for assistive tech |
| HIGH | Mobile product image carousel/zoom trigger | `ProductPage.tsx` | Add `aria-label="Open image zoom"` to whatever image element IS visible at 375px so MOB-06/07 can be un-skipped |

---

## ROUTE COVERAGE SUMMARY

| Route | Tested | Notes |
|-------|--------|-------|
| `/en` | ✓ | 12 tests |
| `/en/shop` | ✓ | General collection |
| `/en/shop/over-tee-shirts/raw-oat` | ✓ | Primary product fixture |
| `/en/shop/over-tee-shirts/bone` | ✓ | Colour switch target |
| `/en/shop/mens` | ✓ | Single-product → FeaturedProductCard |
| `/en/shop/mens/oversized-tee` | ✓ | ProductColourPage |
| `/en/shop/cargo-pants` | ✓ | Load check only |
| `/en/shop/a-line-kurta` | ✓ | Load check only |
| `/en/edits` | ✓ | Listing page |
| `/en/edits/everyday-edit` | ✓ | Full edit page |
| `/en/edits/utility-edit` | ✓ | Full edit page |
| `/en/edits/rest-edit` | ✓ | Full edit page |
| `/en/edits/womens-edit` | ✓ | Full edit page |
| `/en/edits/utility-edit/heavyweight-canvas` | ✓ | Sub-item page |
| `/en/stories` | ✗ | No tests written — Stories page was not in scope for this extraction |
| `/en/shop/women-sleepwear/*` | ✗ | Not in scope — covered by COL-08/09 smoke only |
| `/en/shop/kids-sleepwear/*` | ✗ | Not in scope |

---

## TEST COUNTS (by group)

| Group | Total | Active | Skipped |
|-------|-------|--------|---------|
| HP — Homepage | 12 | 12 | 0 |
| NAV — Navigation | 11 | 11 | 0 |
| PP — Product Page | 23 | 22 | 1 |
| ZM — Zoom Window | 21 | 20 | 1 |
| COL — Collection Pages | 9 | 9 | 0 |
| ED — Edit Pages | 10 | 10 | 0 |
| MOB — Mobile 375px | 9 | 5 | 4 |
| **TOTAL** | **95** | **89** | **6** |
