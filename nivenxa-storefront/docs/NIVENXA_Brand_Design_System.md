# NIVENXA — Brand & Design System

*Generated from codebase — June 2026*

---

## Table of Contents

1. [Brand Overview](#section-1--brand-overview)
2. [Design Tokens](#section-2--design-tokens)
3. [Typography](#section-3--typography)
4. [Colour System](#section-4--colour-system)
5. [Spacing & Layout](#section-5--spacing--layout)
6. [Components](#section-6--components)
7. [Image Specifications](#section-7--image-specifications)
8. [Naming Conventions](#section-8--naming-conventions)
9. [Tone of Voice](#section-9--tone-of-voice)
10. [Shopify Integration Points](#section-10--shopify-integration-points)

---

## Section 1 — Brand Overview

| Field | Value |
|---|---|
| Brand name | NIVENXA |
| Positioning | Premium Indian comfortwear — quiet luxury |
| Target consumer | Indian metro premium, 25–40 |
| Price range | ₹1,499 – ₹3,499 |
| Manufacturing | Made in India |
| Climate focus | Warm climate optimised — Indian conditions |

### Brand Voice

Minimal. Confident. No marketing noise.

Sentences are short. Descriptions are precise. Copy earns attention through specificity — GSM weights, fabric processes, construction methods — not enthusiasm.

**Rules:**
- No exclamation marks. Ever.
- No hype language ("amazing", "incredible", "stunning").
- No vague promises ("premium quality", "best-in-class").
- State the fact. Let the reader decide.

**Collections:**

| Name | Audience | Handle |
|---|---|---|
| Men's | Men | `mens` |
| Women's | Women | `womens` |
| Unisex | All | `unisex` |
| Youth Studio | Children 2Y–12Y | `youth-studio` |

**Edits (editorial story collections):**

| Name | Slug | Featured Product |
|---|---|---|
| The Everyday Edit | `everyday-edit` | Heavyweight Pocket Tee / Raw Oat |
| The Utility Edit | `utility-edit` | Unisex Cargo Pants / Dark Olive |
| The Rest Edit | `rest-edit` | Long Sleeve Lounge Set / Soft Cream |
| The Women's Edit | `womens-edit` | A-line Kurta / Warm Ivory |

---

## Section 2 — Design Tokens

All tokens are defined in `src/app/globals.css` inside `:root`. A secondary definition lives in `src/styles/globals.scss` — those values take precedence in SCSS components.

### 2.1 — Core Tokens

| Token Name | Value | Usage Description |
|---|---|---|
| `--nivenxa-bg-primary` | `#F2EDE6` | Primary page background, card backgrounds |
| `--nivenxa-bg-secondary` | `#EDEAE4` | Section backgrounds (EditsSection, PhilosophySection), image placeholder fills |
| `--nivenxa-text-primary` | `#1A1A1A` | Body text, headings, product names, prices |
| `--nivenxa-text-muted` | `#888888` | Secondary labels, eyebrows, descriptors, spec text |
| `--nivenxa-text-hint` | `#BBBBBB` | Tertiary hints, disabled states |
| `--nivenxa-border` | `rgba(0,0,0,0.10)` | Standard rule lines, card borders, dividers |
| `--nivenxa-border-light` | `rgba(0,0,0,0.06)` | Lighter rule lines, subtle separators |
| `--nivenxa-cta-bg` | `#1C2E1E` | Default CTA button background (forest ink) |
| `--nivenxa-cta-text` | `#FFFFFF` | Default CTA button text |
| `--nivenxa-cta-forest` | `#1C2E1E` | Product / edit CTA actions (same as cta-bg) |
| `--nivenxa-cta-forest-text` | `#FFFFFF` | Text on forest CTAs |
| `--nivenxa-cta-terracotta` | `#C47A4E` | Hero / brand-level CTA actions |
| `--nivenxa-cta-terra-text` | `#FFFFFF` | Text on terracotta CTAs |
| `--nivenxa-header-height` | `41px` | Fixed navbar height — used for scroll margin calculations |

### 2.2 — Tailwind Theme Tokens (globals.css `@theme`)

| Token | Value | Usage |
|---|---|---|
| `--color-canvas` | `#F5F2EB` | Tailwind canvas utility (navbar/submenu panel background) |
| `--color-ink` | `#2C2C2C` | Tailwind ink utility (navbar text, logo) |
| `--color-accent` | `#B1684F` | Tailwind accent utility (hover states, underlines) |
| `--color-olive` | `#7A755E` | Tailwind olive utility (submenu descriptors, muted rules) |
| `--font-serif` | `var(--font-playfair)` | Playfair Display — editorial headings, product names |
| `--font-sans` | `var(--font-inter)` | Inter — UI text, labels, navigation |

### 2.3 — Hardcoded Values (Technical Debt)

The following values appear directly in component CSS files rather than as design tokens. They should be converted to tokens in a future refactor.

| Value | Location | What it should become |
|---|---|---|
| `#C8B8A4` | `EditsSection.module.css` — `.explorePanel`, `.exploreBg` | `--nivenxa-explore-sand` or similar |
| `#F8F6F1` | `EditsSection.module.css` — `.exploreLines span` | `--nivenxa-text-on-dark` |
| `#E8C4A0` | `EditsSection.module.css` — `.exploreBtn` | `--nivenxa-cta-warm-text` |
| `#7A7561` | `Toast.module.css` — `.toast` background | `--nivenxa-surface-warm-muted` |
| `#F8F6F1` | `Toast.module.css` — `.message`, `.subLine1` | `--nivenxa-text-on-dark` |
| `rgba(245,242,235,0.97)` | `Navbar.module.scss` — `.header` | Should use `--color-canvas` with opacity |
| `rgba(122,117,94,…)` | `Navbar.module.scss` — multiple borders/muted labels | Should use `--color-olive` with opacity |
| `rgba(44,44,44,0.55)` | `Navbar.module.scss` — editorial body text | Should use `--color-ink` with opacity |
| `rgba(0,0,0,0.45)` | `ProductInfo.module.css` — modal overlay | `--nivenxa-overlay` |
| `#8B7355` | `CategoryBanner.tsx` — Men's colour block | Inline style — acceptable for one-off brand colours |

---

## Section 3 — Typography

Two typefaces are in use throughout the system:

- **Georgia** (serif, system font) — used directly in CSS Modules for product names, prices, editorial lines, section headings
- **Playfair Display** (`var(--font-serif)`) — used in SCSS-based components (Navbar logo, submenu item labels)
- **Inter** (`var(--font-sans)`) — used in SCSS-based components (nav links, cart button, auth links)
- **system-ui / -apple-system** — used directly in ProductInfo for UI labels (breadcrumb, section labels, bullets, CTA)

### Typography Scale

| Style Name | Font Family | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| Logo | Playfair Display (serif) | 1.6rem / 1.7rem (lg) | 400 | — | Navbar brand mark |
| Nav link | Inter (sans) | 0.7rem | 500 | — | Desktop nav items (uppercase, 0.14em tracking) |
| Mobile nav link | Inter (sans) | 0.8rem | 500 | — | Mobile menu items |
| Section eyebrow | system / Georgia | 10px | 400 | — | Section labels (uppercase, 0.12–0.14em tracking) |
| Section heading H2 | Georgia | 32px | 400 | 1.1 | EditsSection, CategoryBanner heading |
| Section heading H2 (mobile) | Georgia | 26px | 400 | 1.1 | Below 1024px |
| Philosophy line | Georgia | 22px italic | 400 | 2 | PhilosophySection italic lines |
| Philosophy line (mobile) | Georgia | 18px italic | 400 | 2 | Below 1024px |
| Product page H1 | Georgia | 26px | 400 | 1.2 | ProductInfo title |
| Product card title | Georgia | 18px | 400 | 1.2 | Collection ProductCard, EditsSection card |
| Product card price | Georgia | 14px | 500 | 1.3 | Collection ProductCard |
| Product info price | system-ui | 20px | 500 | — | ProductInfo price |
| Submenu label (primary) | Playfair Display (serif) | 1rem (16px) | 400 | 1.5 | Desktop mega menu top-level items |
| Submenu label (children) | Playfair Display (serif) | clamp(1.25rem, 1.7vw, 1.625rem) | 400 | 1.1 | Desktop mega menu child items |
| Mobile submenu link | Playfair Display (serif) | 1.125rem | 400 | — | Mobile accordion sub-items |
| Mobile sub-sub link | Playfair Display (serif) | 0.9375rem | 400 | — | Mobile accordion children |
| Editorial body (submenu) | Playfair Display (serif) | clamp(0.875rem, 1.15vw, 1rem) italic | 400 | 1.8 | Submenu atmospheric copy |
| Card eyebrow / label | system / CSS | 9–10px | 400 | — | Edit card label, category eyebrow |
| Feature bullet | system-ui | 13px | 400 | 1.65 | ProductInfo feature bullets |
| Trust line | system-ui | 12px | 400 | — | ProductInfo trust line below price |
| Section label | system-ui | 11px | 400 | — | "AVAILABLE TONES", "SIZE" labels |
| Breadcrumb | system-ui | 11px | 400 | — | Back link in ProductInfo |
| Fabric note (italic) | Georgia | 11px italic | 400 | — | ProductCard fabric line |
| CTA button | system-ui | 11px | 500 | — | ProductInfo Add to Bag (uppercase, 0.18em tracking) |
| View CTA link | system-ui | 10px | 400 | — | ProductCard "View product →", CategoryBanner "View →" |
| Explore button | system-ui | 9px | 400 | — | EditsSection explore panel CTA |
| Submenu descriptor | Inter (sans) | 0.575rem | 400 | 1 | Mega menu category descriptor (hidden until hover) |
| Toast message | system-ui | 12px | 500 | — | Add-to-bag toast |
| Toast sub-line 1 | system-ui | 11px | 400 | — | Product name in toast |
| Toast sub-line 2 | system-ui | 10px | 400 | — | Colour + size in toast |
| Size guide modal title | system-ui | 11px | 500 | — | "SIZE GUIDE" label (uppercase, 0.18em tracking) |
| Proof text (Philosophy) | Georgia | 13px italic | 400 | 1.85 | PhilosophySection right column |

---

## Section 4 — Colour System

### 4.1 — UI Colours

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--nivenxa-bg-primary` | `#F2EDE6` | rgb(242, 237, 230) | Primary page + card background |
| `--nivenxa-bg-secondary` | `#EDEAE4` | rgb(237, 234, 228) | Section fills (EditsSection, PhilosophySection) |
| `--nivenxa-text-primary` | `#1A1A1A` | rgb(26, 26, 26) | All body text, headings, prices |
| `--nivenxa-text-muted` | `#888888` | rgb(136, 136, 136) | Labels, eyebrows, secondary descriptors |
| `--nivenxa-text-hint` | `#BBBBBB` | rgb(187, 187, 187) | Tertiary hints, placeholders |
| `--nivenxa-cta-forest` | `#1C2E1E` | rgb(28, 46, 30) | Product CTAs, explore buttons |
| `--nivenxa-cta-terracotta` | `#C47A4E` | rgb(196, 122, 78) | Hero CTAs, brand-level actions |
| `--color-canvas` | `#F5F2EB` | rgb(245, 242, 235) | Navbar + submenu panel background |
| `--color-ink` | `#2C2C2C` | rgb(44, 44, 44) | Navbar text, logo |
| `--color-accent` | `#B1684F` | rgb(177, 104, 79) | Hover states, underlines, active nav items |
| `--color-olive` | `#7A755E` | rgb(122, 117, 94) | Submenu borders, muted rules, descriptors |

### 4.2 — Product Colour Palette

#### Product 1 — Heavyweight Pocket Tee

| Colour Name | Slug | Hex | Folder Name | Notes |
|---|---|---|---|---|
| Raw Oat | `raw-oat` | `#D4C5A9` | OAT BEIGE | Default colour — first on product page |
| Bone | `bone` | `#F0EBE0` | WARM IVORY | Light neutral |
| Espresso | `espresso` | `#5C5248` | CHARCOAL EARTH | Dark warm brown |
| Mushroom | `mushroom` | `#A89888` | MUSHROOM TAUPE | Mid warm grey |
| Earth | `earth` | `#8B7355` | MINERAL BROWN | Warm tan |
| Red Earth | `red-earth` | `#C47A4E` | DESERT CLAY | Matches `--nivenxa-cta-terracotta` |

Pantone TCX references: [DATA MISSING — ADD MANUALLY]

#### Product 2 — Unisex Cargo Pants

| Colour Name | Slug | Hex | Image Status | Notes |
|---|---|---|---|---|
| Charcoal Grey | `charcoal-grey` | `#4A4A4A` | Real images on disk | Folder: `Unisex/cargos/charcoalgrey` |
| Dark Olive | `dark-olive` | `#4A5240` | Real images on disk | Folder: `Unisex/cargos/darkolive` |
| Stone Beige | `stone-beige` | `#C4B49A` | Placeholder (no folder) | — |
| Jet Black | `jet-black` | `#1A1A1A` | Placeholder | — |
| Mocha Brown | `mocha-brown` | `#7B5C47` | Placeholder | — |
| Rust Clay | `rust-clay` | `#B5572A` | Placeholder | — |

Pantone TCX references: [DATA MISSING — ADD MANUALLY]

#### Product 3 — A-line Kurta

| Colour Name | Slug | Hex | Notes |
|---|---|---|---|
| Warm Ivory | `warm-ivory` | `#F0EBE0` | Featured in Women's Edit |
| Soft Ecru | `soft-ecru` | `#EDE5D0` | — |
| Oat Beige | `oat-beige` | `#D8C9B0` | — |
| Sandstone | `sandstone` | `#C8A882` | — |
| Mushroom Taupe | `mushroom-taupe` | `#A89888` | — |
| Dust Sage | `dust-sage` | `#8C9E84` | — |
| Dust Olive | `dust-olive` | `#7A8060` | — |
| Mineral Brown | `mineral-brown` | `#8B7355` | — |
| Dusty Rose | `dusty-rose` | `#D4A8A0` | — |
| Desert Clay | `desert-clay` | `#C47A4E` | Matches `--nivenxa-cta-terracotta` |
| Soft Black | `soft-black` | `#1E1C1A` | — |

Pantone TCX references: [DATA MISSING — ADD MANUALLY]. All images use `placehold.co` fallback — no real images on disk.

#### Product 4 — Relaxed Co-ord Set

| Colour Name | Slug | Hex | Notes |
|---|---|---|---|
| Warm Ivory | `warm-ivory` | `#F0EBE0` | — |
| Dust Sage | `dust-sage` | `#8C9E84` | — |
| Dusty Rose | `dusty-rose` | `#D4A8A0` | — |

Pantone TCX references: [DATA MISSING — ADD MANUALLY]. All images use `placehold.co` fallback.

#### Product 5 — Long Sleeve Lounge Set

| Colour Name | Slug | Hex | Notes |
|---|---|---|---|
| Soft Cream | `soft-cream` | `#F5F0E8` | Featured in Rest Edit |
| Oat Beige | `oat-beige` | `#D8C9B0` | — |
| Dusty Rose | `dusty-rose` | `#D4A8A0` | — |
| Lavender Grey | `lavender-grey` | `#C4C0D8` | Only cool-toned colour in range |
| Olive Grey | `olive-grey` | `#8A8E7A` | — |

Pantone TCX references: [DATA MISSING — ADD MANUALLY]. All images use `placehold.co` fallback.

#### Product 6 — Kids Sleepwear Set

| Colour Name | Slug | Hex | Notes |
|---|---|---|---|
| Soft Cream | `soft-cream` | `#F5F0E8` | — |
| Oat Beige | `oat-beige` | `#D8C9B0` | — |
| Sage Green | `sage-green` | `#8E9E82` | — |
| Mushroom | `mushroom` | `#A89888` | — |

Pantone TCX references: [DATA MISSING — ADD MANUALLY]. All images use `placehold.co` fallback.

---

## Section 5 — Spacing & Layout

### Grid System

| Context | Columns | Gap | Notes |
|---|---|---|---|
| EditsSection card grid | 4 | 6px | `repeat(4, 1fr)` — collapses to 2-col at ≤1024px, 1-col at ≤600px |
| CategoryBanner | 4 cards | CSS Grid via `.grid` class | Responsive — see `.module.scss` |
| PhilosophySection inner | 2 + 1px divider | 3rem | `1fr 1px 1fr` — collapses to 1-col at ≤1024px |
| Product page (desktop) | 2 columns | — | Image gallery + sticky ProductInfo panel |

### Section Padding Values

| Token / Value | Usage |
|---|---|
| `clamp(6rem, 10vw, 8rem)` | `$space-page-top` — page top padding |
| `clamp(5rem, 10vw, 8rem)` | `$space-page-bot` — page bottom padding |
| `clamp(4rem, 8vw, 6rem)` | `$space-section` — hero bottom margin |
| `clamp(3.5rem, 7vw, 5.5rem)` | `$space-sections-gap` — flex gap between sections |
| `4rem 2.5rem` | PhilosophySection section padding |
| `3rem 1.25rem` | PhilosophySection mobile (≤1024px) |
| `0 2.5rem 3rem` | EditsSection section padding |
| `0 1.25rem 2rem` | EditsSection mobile (≤1024px) |

### Content Max-Width Values

| Value | Usage |
|---|---|
| `80rem` (1280px) | `$max-width` — page content container |
| `900px` | PhilosophySection inner max-width |
| `480px` | Size guide modal max-width |

### Header Height

| Token | Value | Notes |
|---|---|---|
| `--nivenxa-header-height` | `41px` | Used for scroll-margin-top calculations. Update via: `document.querySelector('nav, header').getBoundingClientRect().height` |

### Standard Spacing Scale (from `_variables.scss`)

| Variable | Value | Usage |
|---|---|---|
| `$space-page-top` | `clamp(6rem, 10vw, 8rem)` | Page padding-top |
| `$space-page-bot` | `clamp(5rem, 10vw, 8rem)` | Page padding-bottom |
| `$space-section` | `clamp(4rem, 8vw, 6rem)` | Hero margin-bottom |
| `$space-divider` | `clamp(2.5rem, 5vw, 4rem)` | Hero divider margin-top |
| `$space-subtitle` | `clamp(2rem, 4vw, 3rem)` | Subtitle margin-bottom |
| `$space-sections-gap` | `clamp(3.5rem, 7vw, 5.5rem)` | Flex gap between page sections |
| `$space-scroll-margin` | `clamp(7rem, 10vw, 9rem)` | Section scroll-margin-top |

### Breakpoints (from `_variables.scss`)

| Name | Value | Mixin |
|---|---|---|
| sm | 640px | `@include v.sm` |
| md | 768px | `@include v.md` |
| lg | 1024px | `@include v.lg` |
| xl | 1280px | `@include v.xl` |
| 2xl | 1536px | `@include v.xxl` |

### Z-Index Scale

| Variable | Value | Layer |
|---|---|---|
| `$z-base` | 0 | Default stacking |
| `$z-raised` | 1 | Raised elements |
| `$z-overlay` | 10 | Overlays |
| `$z-nav` | 50 | Fixed navbar |
| `$z-modal` | 100 | Modals |
| Toast z-index | 2000 | Add-to-bag toast (hardcoded) |

---

## Section 6 — Components

### Navbar

| Field | Value |
|---|---|
| File path | `src/components/global/Navbar.tsx` |
| Styles | `src/components/global/Navbar.module.scss` |
| Type | Client component (`'use client'`) |
| Description | Fixed top navigation bar with scroll state detection, desktop mega-menu with atmospheric preview panel, mobile hamburger accordion, cart count with animated counter, auth account link, language switcher. |

**Props:** None — reads from `CartContext`, `AuthContext`, `next-intl`, and `NAV_ITEMS` data.

**Key behaviours:**
- Scroll detection: navbar compresses at `window.scrollY > 24px` (padding-block `1.75rem` → `1.125rem`)
- Desktop mega menu: hover with 180ms close delay on mouse leave to prevent accidental dismiss
- Atmosphere panel: right column renders a gradient fragment from `navigation.ts` atmosphere data; animated with `framer-motion`
- Child flyout: secondary column appears when a submenu item with children is hovered
- Cart count: animated with `framer-motion` `AnimatePresence` on count change
- Mobile: collapsed via `max-height: 0` → `min(80vh, 38rem)`, scroll-responsive `top` offset

**Usage notes:**
- Rendered once in `src/app/[locale]/layout.tsx`
- Requires `<CartProvider>` and `<AuthProvider>` in the tree
- Nav items sourced from `src/data/navigation.ts`

---

### ProductCard

| Field | Value |
|---|---|
| File path | `src/components/collection/ProductCard/ProductCard.tsx` |
| Styles | `src/components/collection/ProductCard/ProductCard.module.css` |
| Type | Client component (`'use client'`) |
| Description | Collection grid card showing product image, title, fabric line, colour swatches, active colour name, price, and "View product →" CTA. Swatch click updates the displayed image and colour without page navigation. |

**Props:**

| Prop | Type | Required | Description |
|---|---|---|---|
| `product` | `Product` | Yes | Full product data object from `products.ts` |
| `defaultColourSlug` | `string` | No | Overrides first colour as default |
| `referrer` | `{ from, slug, name }` | No | Adds `?from=edit&refSlug=…` to product URL for breadcrumb back-navigation |

**Key behaviours:**
- Image hover: `transform: scale(1.03)` on `.card:hover .image`
- Swatch: 16×16px rounded square, `outline-offset` on hover, thick outline on active
- Fabric line: first segment of `compositionQuote` before the em dash
- Price: formatted with `toLocaleString('en-IN')` for Indian number format

---

### ProductInfo

| Field | Value |
|---|---|
| File path | `src/components/product/ProductInfo/ProductInfo.tsx` |
| Styles | `src/components/product/ProductInfo/ProductInfo.module.css` |
| Type | Client component (`'use client'`) |
| Description | Sticky right-panel on the product page. Contains breadcrumb, product title, price, trust line, colour selector (via ColourSwatch), size selector (via SizeSelector), feature bullets, Add to Bag CTA, Styled With cross-sell block, add-to-bag Toast, and portalled size guide modal. |

**Props:**

| Prop | Type | Description |
|---|---|---|
| `product` | `Product` | Full product data |
| `activeColour` | `ProductColour` | Currently displayed colour |
| `selectedSize` | `string \| null` | User's selected size |
| `onColourChange` | `(colour) => void` | Callback when colour swatch is clicked |
| `onSizeChange` | `(size) => void` | Callback when size is selected |
| `onAddToBag` | `() => void` | Callback on CTA click (writes to local cart hook) |
| `swatchExpanded` | `boolean` | Controls whether all swatches are visible or collapsed |
| `onSwatchExpandedChange` | `(value) => void` | Toggle swatch expansion |

**CTA states:**
- `OUT OF STOCK` — colour `available: false`
- `Choose Your Size` — no size selected (CTA disabled)
- `ADD TO BAG` — colour available and size selected

**Toast:** Auto-dismisses after 3.7 seconds. Shows product name, colour, and size. "View bag →" button opens CartDrawer.

**Size guide:** Portalled to `document.body` via `createPortal`. Closes on overlay click or Escape key.

---

### Toast

| Field | Value |
|---|---|
| File path | `src/components/global/Toast/Toast.tsx` |
| Styles | `src/components/global/Toast/Toast.module.css` |
| Type | Client component (`'use client'`) |
| Description | Fixed-position add-to-bag notification. Appears at bottom centre of screen. Fades and slides in/out via CSS transitions. Contains a message, optional sub-message (product name + colour/size on two lines), and "View bag →" button. |

**Props:**

| Prop | Type | Required | Description |
|---|---|---|---|
| `visible` | `boolean` | Yes | Controls show/hide |
| `message` | `string` | Yes | Primary message ("Added to your bag") |
| `subMessage` | `string` | No | Two-line detail — split on `\n` |
| `onViewBag` | `() => void` | No | Called when "View bag →" is clicked |
| `onClose` | `() => void` | Yes | Called to hide the toast |

**Key styling:**
- Background: `#7A7561` (warm muted olive — hardcoded, see technical debt)
- Text: `#F8F6F1` (off-white — hardcoded)
- Width: 340px fixed, `calc(100% - 2rem)` on mobile (≤600px)
- Mobile offset: `bottom: 80px` at ≤1024px to clear mobile sticky bars

---

### EditsSection

| Field | Value |
|---|---|
| File path | `src/components/home/EditsSection/EditsSection.tsx` |
| Styles | `src/components/home/EditsSection/EditsSection.module.css` |
| Type | Server component (no `'use client'`) |
| Description | 4-column grid of 5 editorial product cards plus an "Explore All" panel spanning 3 columns. Each card is a full `<Link>` with product image (or colour placeholder), ghost number, edit label, product name, and fabric spec. |

**Props:** None — data is hardcoded in `CARDS` array within the file.

**Grid layout:**
- 5 cards + 1 explore panel = 6 items in `repeat(4, 1fr)` grid
- Row 1: 4 cards fill the row
- Row 2: card 5 (1 col) + explore panel (`grid-column: span 3`)
- Mobile ≤1024px: collapses to 2 columns; explore panel spans 1
- Mobile ≤600px: single column

**Explore panel:**
- Background image: `TEE_OAT_WALKING` with dark gradient overlay
- Copy structure: eyebrow label → 4 category lines → tagline → "Explore All Edits →" CTA

---

### CategoryBanner

| Field | Value |
|---|---|
| File path | `src/components/blocks/CategoryBanner.tsx` |
| Styles | `src/components/blocks/CategoryBanner.module.scss` |
| Type | Server component (no `'use client'`) |
| Description | 4-card audience navigation grid. Each card is a full `<Link>` wrapping a colour block (or product image) with ghost number, category title, body copy, and fade-in "View →" CTA on hover. |

**Props:** None — uses `useTranslations('categories')` for eyebrow and heading copy from `en.json`.

**Collections displayed:**
1. Men's (`/shop/mens`) — colour block `#8B7355`
2. Women's (`/shop/womens`) — `.womenColor` class
3. Unisex (`/shop/unisex`) — real product image (dark olive cargo front)
4. Youth Studio (`/shop/youth-studio`) — `.kidsColor` class

**Hover behaviours:**
- `colorBlock`: `transform: scale(1.03)` with `transition: 0.5s ease`
- `viewCta`: fades in from `opacity: 0, translateY(3px)` to `opacity: 1, translateY(0)` with 0.1s delay
- Ghost number: `mix-blend-mode: overlay` for adaptability on light and dark backgrounds

---

### ImageZoom

| Field | Value |
|---|---|
| File path | `src/components/product/ImageZoom/ImageZoom.tsx` |
| Styles | `src/components/product/ImageZoom/ImageZoom.module.css` |
| Type | Client component (`'use client'`) |
| Description | Full-screen image lightbox overlay for the product page. Allows keyboard and click navigation between all product images for the active colour. Includes colour switcher for in-zoom colour changes. |

**Props:**

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `() => void` | Dismiss callback |
| `images` | `ProductImage[]` | All images for active colour |
| `activeIndex` | `number` | Starting image index |
| `product` | `Product` | Full product for metadata |
| `activeColour` | `ProductColour` | Currently displayed colour |
| `allColours` | `ProductColour[]` | All available colours for switching |
| `onColourClose` | `(colour) => void` | Callback when colour is changed inside zoom |

---

### CartContext

| Field | Value |
|---|---|
| File path | `src/context/CartContext.tsx` |
| Type | Client context + provider |
| Description | Dual-layer cart system. Local cart: in-memory React state for UI display (items, count, drawer). Shopify cart: Storefront API cart created and persisted via `localStorage` key `nivenxa_cart_id`. Both layers are accessible through `useCart()` hook. |

**Context value — Local cart:**

| Property | Type | Description |
|---|---|---|
| `items` | `CartItem[]` | Array of local cart items with quantity |
| `totalCount` | `number` | Sum of all item quantities (drives navbar badge) |
| `addItem` | `(item) => void` | Adds item or increments quantity if already present |
| `removeItem` | `(handle, slug, size) => void` | Removes specific variant |
| `clearCart` | `() => void` | Clears both local items and Shopify cart ID |

**Context value — Shopify cart:**

| Property | Type | Description |
|---|---|---|
| `cart` | `ShopifyCart \| null` | Shopify cart object |
| `loading` | `boolean` | True while restoring cart from localStorage |
| `addShopifyItem` | `(merchandiseId, qty?) => Promise<void>` | Adds Shopify variant |
| `updateShopifyItem` | `(lineId, qty) => Promise<void>` | Updates line quantity (qty ≤ 0 removes line) |
| `removeShopifyLine` | `(lineId) => Promise<void>` | Removes cart line |

**Context value — Drawer:**

| Property | Type | Description |
|---|---|---|
| `isDrawerOpen` | `boolean` | Cart drawer visibility |
| `openDrawer` | `() => void` | Opens CartDrawer |
| `closeDrawer` | `() => void` | Closes CartDrawer |

**Usage note:** Must be consumed inside `<CartProvider>`. Throws if used outside provider.

---

## SECTION 7 — IMAGE SPECIFICATIONS

Standard image slots — all products:

| Slot | Shot Type        | Dimensions  | Format   | Naming Convention          |
|------|------------------|-------------|----------|----------------------------|
| S1   | Front Studio     | 2000×2500px | WebP/JPG | [product]_[colour]_S1      |
| S2   | Back Studio      | 1200×1500px | WebP/JPG | [product]_[colour]_S2      |
| S3   | Side Studio      | 1200×1500px | WebP/JPG | [product]_[colour]_S3      |
| S4   | Walking          | 1200×1500px | WebP/JPG | [product]_[colour]_S4      |
| S5   | Garment Closure  | 1200×1500px | WebP/JPG | [product]_[colour]_S5      |

Additional slot — Six Pocket Cargo Pants only:

| Slot | Shot Type        | Dimensions  | Format   | Naming Convention          |
|------|------------------|-------------|----------|----------------------------|
| S6   | Flat Lay         | 1200×1500px | WebP/JPG

---

## Section 8 — Naming Conventions

### Product Handle Format

Hyphenated lowercase. Used in URL paths and as the `handle` property on Product objects.

| Product | Handle |
|---|---|
| Heavyweight Pocket Tee | `over-tee-shirts` |
| Unisex Cargo Pants | `cargo-pants` |
| A-line Kurta | `a-line-kurta` |
| Relaxed Co-ord Set | `women-lounge-sets` |
| Long Sleeve Lounge Set | `women-sleepwear` |
| Kids Sleepwear Set | `kids-sleepwear` |

### Colour Slug Format

Hyphenated lowercase. Derived from the colour name.

Examples: `raw-oat`, `dark-olive`, `mushroom-taupe`, `dusty-rose`, `lavender-grey`, `soft-black`

### Route Structure

```
/[locale]/shop                              → All collections
/[locale]/shop/[collectionSlug]             → Collection page (mens, womens, unisex, youth-studio)
/[locale]/shop/[handle]/[colour-slug]       → Product colour page
/[locale]/edits                             → All edits
/[locale]/edits/[edit-slug]                 → Edit page
/[locale]/edits/[edit-slug]/[sub-slug]      → Edit sub-item page
/[locale]/stories/[slug]                    → Story page
```

Locale prefix is always present — routing handled by `next-intl` via `src/i18n/routing.ts`.

### Edit Slug Format

Hyphenated lowercase.

| Edit | Slug |
|---|---|
| The Everyday Edit | `everyday-edit` |
| The Utility Edit | `utility-edit` |
| The Rest Edit | `rest-edit` |
| The Women's Edit | `womens-edit` |

### Image File Naming Convention

Files on disk use underscores. URL paths encode spaces in folder names to `%20`. The `localImg()` helper in `products.ts` handles this encoding automatically.

```
[shot_description]_view.webp    — Tee images
[shot_description]_view.png     — Cargo images
```

### Component File Naming

| Pattern | Convention | Examples |
|---|---|---|
| Component files | PascalCase | `ProductCard.tsx`, `CategoryBanner.tsx` |
| CSS Module files | Same name as component | `ProductCard.module.css` |
| SCSS Module files | Same name as component | `CategoryBanner.module.scss`, `Navbar.module.scss` |
| Context files | PascalCase + Context suffix | `CartContext.tsx`, `AuthContext.tsx` |
| Data files | camelCase | `products.ts`, `navigation.ts`, `edits.ts` |

### CSS Class Naming

All CSS Modules use camelCase for class names.

Examples: `.sectionTitle`, `.cardGrid`, `.imagePanel`, `.ghostNum`, `.explorePanel`, `.viewCta`, `.submenuLabel`

---

## Section 9 — Tone of Voice

### Core Principles

Extracted from product `compositionQuote`, `featureBullets`, `editorial.quote`, and edit `story` fields.

1. **State the material fact.** "240 GSM combed cotton jersey" — not "premium cotton". The number is the proof.
2. **Short sentences.** One thought per sentence. No conjunctions stringing three ideas together.
3. **No exclamation marks.** Confidence does not need punctuation.
4. **Describe the benefit through the construction.** "Shoulder seam sits 2–3 inches past the natural shoulder" — not "relaxed and comfortable".
5. **Acknowledge imperfection as character.** "Natural linen wrinkle is part of the character — embrace it." Wabi-sabi, not apology.
6. **Indian context, not generic global.** "Designed for the Indian climate and stride." "Made for Indian nights that deserve better fabric."

### What NIVENXA Says vs What It Does Not Say

| NIVENXA says | NIVENXA does not say |
|---|---|
| "Bio-enzyme washed for a lived-in softness from first wear." | "Super soft and comfortable!" |
| "300 GSM enzyme-washed canvas." | "High quality premium fabric." |
| "Six pockets, all functional. Nothing forced." | "Tons of pockets for all your essentials!" |
| "Designed for repeat wear and considered daily movement." | "Perfect for everyday use!" |
| "Improves with every wash." | "Durable and long-lasting!" |
| "The space between — for every day that deserves both." | "Versatile and stylish!" |
| "Soft enough for sleep. Built for everything that comes before it." | "So cosy and adorable!" |
| "Made in India." | "Proudly crafted in India!" |

### Examples of Correct Copy (from products.ts)

**Product description (compositionQuote):**
> Dense 240 GSM combed cotton jersey — midweight, structured, and soft to touch. Bio-enzyme washed for a lived-in softness from first wear — improves with every wash. A quiet neutral built for a minimal wardrobe.

**Editorial quote:**
> 300 GSM enzyme-washed canvas. Six-pocket utility silhouette. Built for movement, worn for life.

**Fit description (editorial byImage):**
> Shoulder seam sits 2–3 inches past the natural shoulder. Boxy through the chest and even through the waist — proportioned for a relaxed, unconstrained drape.

**Edit story:**
> Bio-washed comfortwear built for the rhythm of Indian daily life. Heavyweight enough to feel considered. Light enough to forget you're wearing it.

**Kids product:**
> Super combed cotton — enzyme washed, OEKO-TEX certified. Soft enough for sleep. Built for everything that comes before it.

### Punctuation Rules

- Em dash (—): used to introduce a specification or consequence. "300 GSM canvas — structured without stiffness."
- Full stop: sentences end with full stops. Fragments end with full stops.
- No exclamation marks in any product, editorial, or UI copy.
- Ellipsis: not used.
- Parentheses: used only for technical qualifications in size guides.
- Ampersand (&): not used in copy. Spell out "and".

### Vocabulary

**Words used:** bio-washed, enzyme-washed, bio-polished, combed cotton, GSM, canvas, twill, modal, slub, French Terry, silhouette, utility, considered, unhurried, minimal, structured, repeat wear, everyday, lived-in, softens.

**Words avoided:** luxury, premium, high-quality, best, amazing, perfect, cozy, stunning, exclusive, limited, must-have.

---

## Section 10 — Shopify Integration Points

### Two Primary Swap Points

#### 1. Product Data — `src/hooks/useProduct.ts`

Currently all product data is served from `src/data/products.ts` (local TypeScript objects). When Shopify is connected:

- Replace the `products.ts` import in `src/hooks/useProduct.ts` with a Shopify Storefront API query
- The normalisation layer in `src/utils/normalizeProduct.ts` maps the Shopify GraphQL response to the internal `Product` type defined in `src/types/product.ts`
- No component file needs to change — only the data source import changes

#### 2. Cart — `src/context/CartContext.tsx`

The CartContext already contains the full Shopify Storefront API cart implementation. The Shopify-side functions (`createCart`, `getCart`, `addCartLines`, `updateCartLines`, `removeCartLines`) are imported from `src/lib/shopify-cart.ts`.

Current state: Shopify cart is created and persisted (localStorage key: `nivenxa_cart_id`). Line mutations are implemented. The local in-memory cart (`items`, `addItem`, `removeItem`) runs in parallel for immediate UI feedback.

When Shopify variant IDs are available: call `addShopifyItem(merchandiseId)` alongside `addItem(localItem)` in `ProductInfo.tsx` `handleAddToBag`.

### Metafield Namespace

| Field | Value |
|---|---|
| Namespace | `nivenxa` |
| Required metafields | `colour_hex`, `colour_name`, `colour_slug` |

These metafields drive the colour system on the product page. Each Shopify variant must have all three set correctly for the colour switcher and image gallery to function.

### Shopify Variant Structure

Each product variant is the intersection of:

```
Product × Colour × Size
```

For example, Heavyweight Pocket Tee:
- 6 colours × 4 sizes = 24 variants per product
- Each variant needs: `merchandiseId` (Shopify GID), `colour_hex`, `colour_name`, `colour_slug` metafields

### Local Storage Keys

| Key | Value | Usage |
|---|---|---|
| `nivenxa_cart_id` | Shopify cart GID string | Persists Shopify cart across sessions |

### Locale Handling

The storefront uses `next-intl` with `[locale]` route prefix. Shopify Storefront API queries should include the `language` and `country` context variables derived from the active locale. RTL locales are defined in `layout.tsx` as `RTL_LOCALES = ['ar']`.

---

*Document generated from source code. Last updated: June 2026.*
*For missing data marked [DATA MISSING — ADD MANUALLY], update this document after completing the relevant production steps.*
