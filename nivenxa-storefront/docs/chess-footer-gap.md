# Shared main-content / footer gap

## Cause (verified by measurement, not assumed)
Four independent bottom spacings stacked on top of each other, each written before `SiteFooter` existed:

1. `SiteFooter` had `margin-top: clamp(3rem, 6vw, 5rem)` (48–77 px). Besides adding space, that margin
   exposed the bare `<body>` colour as a band between a page's themed background and the footer.
2. `$space-page-bot` (`styles/_variables.scss`) was `clamp(5rem, 10vw, 8rem)` (80–128 px) and is the
   bottom padding of ~20 page wrappers (Chess/Living/Studio/root legal + contact + stories pages).
3. 14 Chess page-end spots hard-coded `clamp(4rem, 7vw, 6rem)` (64–96 px).
4. Pages set `min-height: 100vh` on their own wrapper while the footer is a sibling placed after
   them, so on a short page the footer was always a full screen below the fold (login pages:
   387 px / 464 px of empty space above the footer).

Also noted, **not changed**: `app/globals.css` has `html, body { height: 100%; overflow: auto }`, which makes
`<body>` the scroll container (contradicting the comment in `globals.scss`). It is why Playwright
`fullPage` screenshots only capture one viewport. Changing it affects every app, so it is left alone.

## Fix
- One token, `$space-page-end` (24–40 px). `$space-page-bot` now aliases it; the 14 hard-coded Chess values use it.
- `SiteFooter` has no `margin-top`.
- New shared `components/global/PageShell` (header / content / footer). The content area is a plain
  block box that grows to fill the viewport, so a short page's footer reaches the viewport bottom and
  a long page's footer follows the content. It overrides the pages' own `min-height: 100vh` for
  `main` elements, except where `data-full-viewport` is set (Play board).
  Used by: Chess layout, Living login/signup/privacy/terms, root privacy/terms/contact, Studio shop layout.
  Not changed: the root home (`/`) and Living landing, which are long pages whose footer already follows content.

## Measurements (gap between last visible content and footer top, px; Playwright, Chromium)
`tests/footer-gap-measure.spec.ts`, desktop 1280x800 and mobile 390x844, dev server, warm.
Raw data: `docs/chess-screenshots/{before,after}/measurements.json`.

| Page | Before desktop | After desktop | Before mobile | After mobile |
|---|---|---|---|---|
| Chess home | 212 | 84 | 129 | 41 |
| Chess puzzles | 166 | 38 | 112 | 24 |
| Chess puzzle topic | 199 | 38 | 129 | 41 |
| Chess learn | 246 | 38 | 112 | 24 |
| Chess tournaments | 177 | 101 | 117 | 69 |
| Chess terms | 205 | 38 | 128 | 24 |
| Living terms | 205 | 38 | 128 | 24 |
| Root privacy | 205 | 38 | 128 | 24 |
| Root contact | 230 | 38 | 153 | 24 |
| Studio terms | 205 | 38 | 128 | 24 |
| Studio shipping | 205 | 38 | 128 | 24 |

Short pages: Living login (desktop) footer-to-viewport-bottom 99 px -> 0 px. Chess login 387/464 px -> 64 px
(it is not short once the footer is counted).

## Remaining / limitations
- Chess home (84), tournaments (101) and the Living landing (72) still have a larger gap from their own
  last section's padding; the home page is being reworked separately.
- "Before" screenshots are truncated to one viewport (the `<body>` scroll-container artefact above);
  the numbers are unaffected. "After" screenshots use a document-height viewport.
- Not verified: Studio storefront home/shop pages with CartDrawer/cookie banner open; Playwright run was against `next dev`.
