# NIVENXA Storefront — Functional Requirements Document

**Version:** 1.0  
**Date:** 2026-06-11  
**Status:** Draft  
**Audience:** Engineering, product, design, QA

---

## SECTION 1 — DOCUMENT OVERVIEW

### 1.1 Purpose

This document describes every user-facing feature, interaction, and data flow in the Nivenxa storefront as it exists in code today. It serves as the single authoritative reference for what is built, what is partially built, and what is not yet built. Sections 11 and 12 capture known gaps and pending integration requirements.

### 1.2 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Styling | CSS Modules (.module.css / .module.scss) |
| Animation | Framer Motion |
| Internationalisation | next-intl |
| E-commerce backend | Shopify Storefront API (partially wired) |
| Testing | Playwright |
| Deployment target | Not specified in codebase |

### 1.3 Base URL

Development: `http://localhost:3000`  
The test suite uses this base and the `en` locale: `http://localhost:3000/en/`

### 1.4 Localisation

Sixteen locales are configured. Every URL is prefixed with a locale segment: `/{locale}/...`  
Arabic (`ar`) triggers right-to-left layout (`dir="rtl"` on the HTML element). All other locales use left-to-right.  
Localisation strings are delivered via `next-intl`. Translation file locations are not enumerated in this document.

### 1.5 Provider Tree

The root layout wraps all pages in the following provider order, outermost first:

1. NextIntlClientProvider
2. CurrencyProvider
3. ToastProvider
4. AuthProvider
5. CartProvider

---

## SECTION 2 — SITE ARCHITECTURE

### 2.1 Route Map

| Route | Page Component | Notes |
|---|---|---|
| `/{locale}/` | Homepage | HeroSection + 5 blocks |
| `/{locale}/shop` | All-products grid | Uses ProductTile component |
| `/{locale}/shop/mens` | Men's collection | Dedicated route |
| `/{locale}/shop/mens/oversized-tee` | Product colour picker | Renders all colour cards for Oversized Tee |
| `/{locale}/shop/mens/cargo-pants` | Product colour picker | Renders all colour cards for Cargo Pants |
| `/{locale}/shop/womens` | Women's collection | Dedicated route |
| `/{locale}/shop/womens/a-line-kurta` | Product colour picker | Renders all colour cards for A-Line Kurta |
| `/{locale}/shop/womens/co-ord-set` | Product colour picker | Renders all colour cards for Co-ord Set |
| `/{locale}/shop/womens/sleepwear` | Product colour picker | Renders all colour cards for Sleepwear |
| `/{locale}/shop/unisex` | Unisex collection | Dedicated route |
| `/{locale}/shop/unisex/cargo-pants` | Product colour picker | Renders all colour cards for Cargo Pants |
| `/{locale}/shop/unisex/lounge-sets` | Product colour picker | Renders all colour cards for Lounge Sets |
| `/{locale}/shop/youth-studio` | Youth Studio collection | Dedicated route |
| `/{locale}/shop/youth-studio/kids-sleepwear` | Product colour picker | Renders all colour cards for Kids Sleepwear |
| `/{locale}/shop/youth-studio/kids-tee` | Coming Soon placeholder | Static page; no product content |
| `/{locale}/shop/[slug]` | Dynamic collection | Handles slugs: mens-essentials, unisex, womens, youth-studio |
| `/{locale}/shop/[slug]/[color]` | Product page | Full product detail page |
| `/{locale}/edits` | All Edits listing | Card grid linking to each edit |
| `/{locale}/edits/[editSlug]` | Edit landing page | Tab-based layout per edit |
| `/{locale}/edits/[editSlug]/[subItemSlug]` | Edit sub-item deep link | Static editorial page per sub-item |
| `/{locale}/stories/fabric-journal` | Story page | Fabric journal article |
| `/{locale}/stories/our-story` | Story page | Brand story article |
| `/{locale}/stories/made-in-india` | Story page | Made in India article |
| `/{locale}/stories/the-process` | Story page | Production process article |
| `/{locale}/stories/craftsmanship` | Story page | Craftsmanship article |
| `/{locale}/stories/campaigns` | Story page | Campaigns article |
| `/{locale}/account/login` | Login page | Standalone login form |
| `/{locale}/account/register` | Register page | Standalone registration form |

Note: A `/stories` index route is linked from the navbar and footer but is not enumerated in the source files. Its existence is unconfirmed. [NEEDS DECISION]  
Note: An `/account` root route is referenced in auth flows but not found in the enumerated route files. [NEEDS DECISION]

### 2.2 Dual Collection Routing

Two parallel routing mechanisms serve collections. They are functionally equivalent at the page level.

**Dedicated routes** — one file per collection: `/shop/mens`, `/shop/womens`, `/shop/unisex`, `/shop/youth-studio`. These call `getProductsByCollection(collectionName)` and render `CollectionPage`.

**Dynamic route** — `/shop/[slug]` handles slugs `mens-essentials`, `unisex`, `womens`, `youth-studio`. A `COLLECTIONS` config maps each slug to a display title and filter function. Products are filtered by `p.collectionSlug === slug`.

Both mechanisms render the same `CollectionPage` component. The duplicate coverage is a known architectural redundancy. [NEEDS DECISION — consolidate or document intentional separation]

### 2.3 Navigation Structure

The global navigation has three top-level items rendered in the `Navbar` component.

| Label | Behaviour | Children |
|---|---|---|
| SHOP | Link (has href) | Mega menu with Shop All, Men's Essentials, Women's, Unisex, Youth Studio, Six Pocket Cargo Pants |
| EDITS | Button (no href; renders as `<button>`) | Mega menu with individual edit cards |
| STORIES | Link (has href) | Mega menu with story links |

The mega menu uses a 180 ms close timer (hover delay before closing on mouse leave). Desktop renders `<Link>` for items with an `href` value and `<button>` for items without. Mobile renders an accordion with Framer Motion animations.

### 2.4 Navbar Behaviour

- Transparent on load; gains a background at `scrollY > 24`.
- Cart icon shows a Framer Motion animated count badge reflecting the total item quantity in the cart.
- "Account" button opens the SignInDrawer overlay.
- Mobile: hamburger button opens a full-height side panel with accordion-style nav items.

### 2.5 Footer

The footer is a server component. Its content comes from `src/data/footer`.

- Brand tagline displayed.
- Collections links: all collection pages.
- Stories links: all individual story pages.
- Social links: Instagram, YouTube.

### 2.6 Data Flow Summary

All product data is served from `src/data/products.ts`. There is no server-side data fetch at request time for product content; everything is static. Cart persistence uses the Shopify Storefront API for cart ID and line items (via `localStorage` key `nivenxa_cart_id`), with a local React state layer for immediate UI feedback.

---

## SECTION 3 — HOMEPAGE

The homepage renders six blocks in this order:

1. HeroSection
2. CategoryBanner
3. EditsSection
4. PhilosophySection
5. StoriesSection
6. NewsletterSection

### 3.1 HeroSection

Type: Client component (Framer Motion animations).

- Full-height hero with animated brand copy.
- Three editorial image blocks displayed in the right-side panel.
- Three CTAs:
  - "SHOP THE COLLECTION" — links to /shop
  - "EXPLORE THE EDITS" — links to /edits
  - "Our Story" — links to /stories/our-story
- Animated scroll indicator at bottom.

### 3.2 CategoryBanner

Type: Server component.

- Four audience-segment cards displayed in a row.
- Each card links to its dedicated collection page.

| Card Label | Target Route |
|---|---|
| Men's | /shop/mens |
| Women's | /shop/womens |
| Unisex | /shop/unisex |
| Youth Studio | /shop/youth-studio |

### 3.3 EditsSection

Type: Not fully enumerated. Renders edit cards linking to the `/edits` pages.

### 3.4 PhilosophySection

Type: Server component. Static copy only.

- Heading: "The Nivenxa Standard"
- Three lines of copy.
- One proof text statement.

### 3.5 StoriesSection

Type: Server component. Static content.

- Featured card: Fabric Journal (full-width layout).
- Four smaller cards: Craftsmanship, Made in India, Campaigns, The Process.
- Note: "Our Story" does NOT appear in the StoriesSection card grid. It is accessible via the HeroSection CTA and the navbar only.

### 3.6 NewsletterSection

Type: Client component.

- Left panel: heading "From The Atelier" with four editorial lines (Fabric developments / Production notes / New silhouettes / Quiet releases) and a "No spam. Occasional notes only." note.
- Right panel: email input form.
- Submission flow:
  1. User enters email and submits.
  2. Front-end validates that the email string contains "@". If invalid, submission is blocked.
  3. A 600 ms simulated async delay runs (marked for replacement with a real API call).
  4. On success: form is replaced with confirmation text "Noted. We will be in touch."
  5. On success: email field is cleared and `submitted` state is set to true.
- The "loading" state shows button label "Adding..." instead of "Subscribe".
- No real API integration exists. [NOT BUILT]

---

## SECTION 4 — COLLECTION PAGES

### 4.1 CollectionPage Component

Type: Server component.

Renders a product grid. Grid layout rules:

| Products in collection | Layout |
|---|---|
| 1 | FeaturedProductCard (full-width feature treatment) |
| 2 | Two-column grid of ProductCards |
| 3 or more | Three-column grid of ProductCards |

### 4.2 ProductCard

Type: Client component.

- Displays product name, fabric line (first segment of `compositionQuote` before an em dash), price, and colour swatches.
- Swatch click updates `activeColour` state locally. The displayed image changes to match the active colour.
- Clicking the card body or CTA navigates to the product colour page for the active colour.
- If a `referrer` prop is provided (edit name), the link href includes referrer query parameters. This allows the product page breadcrumb to show the edit name instead of the default collection name.
- Swatch aria-label: each swatch has `aria-pressed` reflecting its active state.

### 4.3 FeaturedProductCard

Type: Client component. Same behaviour as ProductCard with an additional "Featured piece" eyebrow label above the product name.

### 4.4 ProductColourPage

Type: Server component.

- Displays all available colour variants for a single product as a card grid.
- Each colour card links to `/shop/[handle]/[colour.slug]`.
- Used by dedicated collection sub-routes (e.g. `/shop/mens/oversized-tee`).

### 4.5 CollectionCarousel

Type: Client component.

- Horizontal scroll carousel.
- Left/right arrow buttons appear when overflow exists in the respective direction.
- Arrow visibility is tracked via `ResizeObserver`.
- Renders "MORE TONES" cross-sell items filtered to exclude the currently displayed product.
- Appears at the bottom of product pages.

### 4.6 Colour Swatch Behaviour (ColourSwatch component)

- Default visible count: 5 (`VISIBLE_DEFAULT = 5`).
- When a product has more than 5 colours, a toggle button is shown.
- Toggle button label when collapsed: "+ N more" (where N = colours beyond 5).
- Toggle button label when expanded: "Show less".
- Active colour swatch displays the colour name inline as a label next to it.
- Each swatch has `aria-pressed` state.

---

## SECTION 5 — PRODUCT PAGE

### 5.1 Route and Access

The product page is reached via `/{locale}/shop/[slug]/[color]`.  
The `ProductPage` component reads both `slug` (product handle) and `color` (colour slug) from URL params using `useParams()`.

### 5.2 Desktop Layout

Three-column grid, all columns sticky:

- Column 1 (left): ProductInfo panel (product name, price, colour swatches, size selector, CTA, styled-with, info accordions).
- Column 2 (centre): Hero image with zoom trigger.
- Column 3 (right): Scrollable image stack; each image has a zoom trigger.

### 5.3 ProductInfo Panel

Contains the following elements in order:

1. Breadcrumb — "← Men's" by default. Shows the edit name (e.g. "← Nivenxa Essentials") when the page was reached from an edit page via referrer params.
2. Product name (h1).
3. Price in local currency symbol (₹ for Indian Rupee).
4. Colour swatch row (via ColourSwatch component; VISIBLE_DEFAULT = 5; expand/collapse for 6+ colours).
5. Size selector row (via SizeSelector component).
6. Size guide button labelled "Size guide →".
7. Add-to-bag CTA button.
8. "Styled With" cross-sell block (via StyledWith component).
9. INFO accordions (via InfoAccordions component).

### 5.4 CTA States

| Condition | CTA label | CTA disabled |
|---|---|---|
| No size selected | "Choose Your Size" | Yes |
| Size selected, in stock | "ADD TO BAG" | No |
| Size selected, out of stock | [NOT BUILT — no explicit out-of-stock CTA state on desktop] | N/A |

### 5.5 Add-to-Bag Flow

1. User selects a size.
2. CTA becomes active and shows "ADD TO BAG".
3. User clicks CTA.
4. Item is added to the local React cart state immediately.
5. A toast notification appears.
6. Shopify Storefront API cart is updated asynchronously via CartContext.
7. Cart icon count badge in the navbar increments.

### 5.6 Toast Notification

- Appears after a successful add-to-bag action.
- Displays two lines: product name on the first line; colour and size on the second line.
- Contains a "View Bag" link that opens the CartDrawer.
- Visible for at least 3 seconds.
- Auto-dismisses after approximately 4 seconds.
- Managed by ToastProvider context.

### 5.7 Size Guide

- A "Size guide →" button appears in the ProductInfo panel.
- Clicking it opens a modal overlay with `aria-label="Size guide"`.
- The modal contains a size chart (content not enumerated in this document).
- A "Close size guide" button closes the modal.

### 5.8 Colour Swatch Navigation

- Clicking a colour swatch on the product page routes the user to the URL for that colour (`/shop/[handle]/[colourSlug]`).
- The currently active colour swatch has `aria-pressed="true"`.
- The first colour rendered has `aria-pressed="true"` by default (Raw Oat for the Heavyweight Pocket Tee).

### 5.9 Image Zoom (ImageZoom component)

Type: Client component.

- Triggered by clicking any image with `aria-label="Open image zoom"`.
- There are 5 zoom triggers per default product page: 1 hero image + 4 stack images.
- Opens a full-screen overlay with three columns:
  - Left: thumbnail strip.
  - Centre: zoomable image.
  - Right: editorial text panel.
- Zoom levels cycle on click: 1.4 → 2.2 → 1.0 → 1.4 (repeating).
- Scroll wheel navigates between images (`addEventListener` with `passive: false`).
- Touch swipe (threshold ≥ 40 px) navigates between images.
- Colour switching within the overlay is supported. If the user switches colour inside ImageZoom and then closes, the product page updates to reflect the chosen colour.
- A "Will apply on close" indicator is shown when the selected colour inside ImageZoom differs from the active colour on the product page.
- `handleClose` fires `onColourClose(internalColour)` on every exit path (ESC key, close button, backdrop).

### 5.10 Mobile Carousel (MobileCarousel component)

Type: Client component. Visible on mobile only.

- Horizontal scroll image carousel replacing the desktop three-column image layout.
- Dot indicators track the active image via `IntersectionObserver` (threshold 0.5).
- Scroll position resets to index 0 when the colour changes (image array changes).

### 5.11 Mobile Sticky Bar (MobileStickyBar component)

Type: Client component. Visible on mobile only.

- Fixed to the bottom of the viewport.
- Displays: colour dot + colour name + size selection buttons + CTA.
- CTA states on mobile:

| Condition | CTA label |
|---|---|
| Item is out of stock | "OUT OF STOCK" |
| No size selected | "SELECT A SIZE" |
| Size selected | "ADD TO BAG" |

### 5.12 Styled With (StyledWith component)

- Shows one cross-sell item ("Styled With") beneath the ProductInfo swatch/CTA area.
- Layout: 3-column grid — image box (120×150 px, 4:5 ratio) | product info | "View →" button.
- Mobile: image box reduces to 100×125 px at ≤ 600 px viewport width.
- Image box currently renders a coloured `<div>` placeholder using the pairing product's hex colour. There is no `<img>` element. [NOT BUILT — real product image]
- CSS rules for `.imageBox img` (with `object-fit: cover` and `object-position: center top`) are in place ready for when real images are added.
- "View →" button links to the pairing product's colour page.

### 5.13 FabricStory (editorial block)

Appears below the main product panel on product pages. Composed of:

1. CompositionHero — eyebrow "MATERIAL" + blockquote of `compositionQuote`.
2. FabricPillars — grid of value/unit/subLabel/description pillars.
3. ProductSpecs — two columns: Garment Specifications (grouped or flat list) + Fit Guide + Care Instructions.
4. InfoAccordions — expandable sections for additional product information.

### 5.14 InfoAccordions

- One accordion open at a time (opening a new one closes the previously open one).
- Accordion content rendered via `dangerouslySetInnerHTML`.
- Each accordion item has `aria-expanded` attribute reflecting open/closed state.

### 5.15 Breadcrumb Referrer Behaviour

- When a user arrives at a product page from a ProductCard inside an edit page, the ProductCard includes referrer query params in the link href.
- The product page breadcrumb reads these params and displays the edit name instead of "← Men's".
- When no referrer params are present, the breadcrumb defaults to "← Men's".

---

## SECTION 6 — EDIT PAGES

### 6.1 Edits Landing Page (`/{locale}/edits`)

- Displays a grid of cards, one per edit.
- Each card links to the edit's landing page.

### 6.2 Edit Landing Page (`/{locale}/edits/[editSlug]`)

Type: Client component.

- Tab-based layout. Each tab corresponds to a sub-item (product or curated selection) within the edit.
- The first sub-item (index 0) is always the active default tab on page load.
- An additional "All Products" view is available. It is triggered by "View All Products →" anchor, which calls `setActiveTab('all')`.
- When `activeTab === 'all'`, the editorial intro is hidden; only the product grid is visible.
- The hero image is computed from `featuredProductHandle` + `featuredColourSlug` properties of the edit data.
- Sub-item tabs render product cards with referrer params so that navigating to a product from an edit page enables the referrer breadcrumb.

### 6.3 Edit Data Structure

Four edits are defined in `src/data/edits.ts`:

- Each edit has a `slug`, `title`, `description`, `featuredProductHandle`, `featuredColourSlug`, and an array of `subItems`.
- Each sub-item has a `slug`, `label`, and associated product handle/colour.
- `heroImageUrl` is NOT set in the data file; it is computed at render time from product data.

### 6.4 Edit Sub-Item Deep Link (`/{locale}/edits/[editSlug]/[subItemSlug]`)

Type: Server component.

- A standalone editorial page for a specific sub-item.
- Prose content for each sub-item is looked up from a `DESCRIPTORS` map by sub-item slug.
- Renders the editorial description alongside the product detail.

---

## SECTION 7 — CART

### 7.1 CartContext

All cart state and operations are managed by `CartProvider` (`src/context/CartContext.tsx`).

Cart item interface:

| Field | Type | Notes |
|---|---|---|
| productHandle | string | Product identifier |
| colourSlug | string | Colour identifier |
| size | string | Selected size |
| productTitle | string | Display name |
| colourName | string | Display name for colour |
| colourHex | string | Hex colour for swatch display in drawer |
| imageUrl | string (optional) | Product image |
| price | string | Price as formatted string |
| quantity | number | Item quantity |

Deduplication key: `productHandle + colourSlug + size`. Adding the same combination increments quantity.

Shopify persistence: on mount, CartProvider checks `localStorage` for key `nivenxa_cart_id`. A `loading` state is `true` until this check completes.

### 7.2 Cart Drawer (CartDrawer component)

Type: Client component. Triggered by clicking the cart icon in the navbar.

- Slides in from the right with Framer Motion animation.
- Backdrop click closes the drawer.
- Escape key closes the drawer.

Empty state:
- Displays an empty-cart message.

With items:
- Lists each cart item with product name, colour, size, quantity, and price.
- Remove button per item. Removing the last item shows the empty state.
- Subtotal is computed by parsing the price strings of all items.
- "Checkout" button shows `alert('Checkout coming soon')`. [NOT BUILT]

### 7.3 Cart Count Badge

- Displayed on the cart icon in the navbar.
- Animated via Framer Motion.
- Reflects the total item quantity (sum of `quantity` across all cart items).

---

## SECTION 8 — STORIES

### 8.1 Story Pages

Six story pages exist as individual routes under `/{locale}/stories/`:

| Slug | Title |
|---|---|
| fabric-journal | Fabric Journal |
| our-story | Our Story |
| made-in-india | Made in India |
| the-process | The Process |
| craftsmanship | Craftsmanship |
| campaigns | Campaigns |

### 8.2 Stories Index

A `/stories` index route is referenced in the navbar mega menu and the footer. Whether this route exists as a built page is unconfirmed from the enumerated source files. [NEEDS DECISION]

### 8.3 StoriesSection on Homepage

The StoriesSection on the homepage (Section 3.5 above) features five stories. "Our Story" is not in this grid — it appears only via the HeroSection CTA and navbar.

---

## SECTION 9 — NEWSLETTER

The newsletter feature is described in full in Section 3.6 (NewsletterSection). Key points:

- Front-end validation: checks for "@" in the email string only.
- Confirmation state replaces the form on success. There is no mechanism to re-show the form after confirmation within a session.
- No backend integration. The 600 ms delay is a placeholder `setTimeout`. [NOT BUILT]
- No double opt-in, GDPR consent checkbox, or unsubscribe mechanism is present. [NOT BUILT]

---

## SECTION 10 — MOBILE BEHAVIOUR

### 10.1 Breakpoints

| Breakpoint | Usage |
|---|---|
| ≤ 600 px | StyledWith image box reduces from 120×150 px to 100×125 px |
| Mobile (not exact px defined) | MobileCarousel replaces desktop three-column image stack |
| Mobile (not exact px defined) | MobileStickyBar appears at bottom of product page |
| Mobile (not exact px defined) | Navbar switches from mega-menu to hamburger + accordion |

### 10.2 Mobile Product Page

- The desktop three-column layout (ProductInfo / hero image / image stack) collapses to a single-column layout.
- The MobileCarousel provides horizontal swipe navigation through product images.
- The MobileStickyBar at the bottom of the viewport provides size selection and the add-to-bag CTA.
- All desktop ProductInfo panel content (accordions, fabric story, etc.) remains visible below the carousel in the single-column flow.

### 10.3 Mobile Navigation

- The top navigation bar collapses to a hamburger button.
- Clicking the hamburger opens a full-height side panel.
- Navigation items within the panel use Framer Motion accordion animations.
- The cart icon and account button remain visible in the mobile nav bar.

### 10.4 Mobile Test Coverage

Playwright test MOB-04 verifies that the product page loads at 375 px viewport width.

---

## SECTION 11 — FEATURES NOT YET BUILT

The following features are referenced in the codebase or implied by the UI but are not functionally implemented.

### 11.1 Checkout

Location: `CartDrawer.tsx`  
Current state: Checkout button triggers `alert('Checkout coming soon')`.  
Required: Full Shopify checkout integration using the Storefront API cart ID stored in `nivenxa_cart_id` localStorage key.

### 11.2 Password Reset — OTP Flow

Location: `SignInDrawer.tsx`  
Current state: Forgot password flow has three steps (identifier → OTP → new password). The OTP send handler and OTP verify handler are stubbed with `// TODO: await sendPasswordResetOtp()` and `// TODO: await verifyOtp()` comments respectively.  
A 30-second countdown timer for OTP resend is implemented in the UI but the underlying OTP service call does nothing.  
Required: OTP send and verify API calls wired to Shopify or a third-party auth provider.

### 11.3 Kids Tee Product Page

Location: `/{locale}/shop/youth-studio/kids-tee`  
Current state: Static "Coming Soon" placeholder page. No product data, images, or purchase flow.  
Required: Product data, colour variants, size selector, and full product page.

### 11.4 Newsletter Backend

Location: `NewsletterSection.tsx`  
Current state: Form submission triggers a 600 ms `setTimeout` then shows a confirmation message. No data is sent anywhere.  
Required: API endpoint for email subscription, error handling, and optionally a GDPR consent mechanism.

### 11.5 StyledWith Product Images

Location: `StyledWith.tsx`, `StyledWith.module.css`  
Current state: The image box renders a coloured `<div>` placeholder using the pairing product's hex value. No `<img>` element is present.  
CSS rules for `.imageBox img` with `object-fit: cover` and `object-position: center top` are already written and will apply automatically once a real `<img>` tag is added to the component.  
Required: Replace the `<div className={styles.imagePlaceholder} style={{ background: pairing.hex }}>` with an `<img>` tag pointing to a real product image asset.

### 11.6 Account Dashboard

An `/account` root route is referenced in authentication flows but is not present in the enumerated source files.  
Required: Post-login account dashboard (order history, profile, address management). [NEEDS DECISION on scope]

### 11.7 Stories Index Page

A `/stories` index listing is linked from both the navbar mega menu and the footer. No route file for a stories index was found in the enumerated source files. [NEEDS DECISION — build a stories index page or remove the link]

### 11.8 NEW SEASON Badge

Test PP-23 is skipped with annotation: "badge not rendered in ProductInfo component".  
The `NEW SEASON` badge was expected to be visible on the product page but is not currently rendered.  
Required: Add badge rendering to the ProductInfo component, tied to a product-level `isNewSeason` flag. [NEEDS DECISION on design]

### 11.9 Product Images (General)

All product images are currently served from local static assets built with placeholder/local helpers (`localImg()`, `buildPlaceholderImages()`).  
Required: All product colour images replaced with real photography assets following the image specification in Section 7 of the Brand Design System document.

### 11.10 Cart Persistence Across Sessions

The Shopify cart ID is persisted to localStorage (`nivenxa_cart_id`) but the cart line items themselves are only in React state and are lost on page refresh. The Shopify API cart is updated asynchronously but there is no mechanism to re-hydrate local state from the Shopify cart on session restore.  
Required: On mount, if `nivenxa_cart_id` exists, fetch the cart from the Shopify API and populate local state from the response.

---

## SECTION 12 — SHOPIFY INTEGRATION REQUIREMENTS

### 12.1 Current Integration State

The codebase references Shopify Storefront API integration in `CartContext.tsx`. The cart ID is persisted to `localStorage`. However, the full integration is incomplete.

### 12.2 Required Shopify API Operations

| Operation | Location | Status |
|---|---|---|
| Create cart | CartContext | Partial — cart ID stored |
| Add line item to cart | CartContext | Partial — async update |
| Remove line item from cart | CartContext | Partial — async update |
| Fetch cart by ID (for session restore) | CartContext | Not built |
| Initiate checkout | CartDrawer | Not built — `alert()` placeholder |
| Send OTP for password reset | SignInDrawer | Not built — TODO comment |
| Verify OTP | SignInDrawer | Not built — TODO comment |
| User login | LoginForm, SignInDrawer | Not built — form exists, no API call |
| User registration | RegisterForm, SignInDrawer | Not built — form exists, no API call |
| Forgot password | SignInDrawer | Not built — form exists, no API call |

### 12.3 Storefront API Credentials

A `.env.local.example` file exists at the project root indicating the following environment variables are required:

- Shopify Storefront API endpoint
- Shopify Storefront API access token

Actual credential values must be sourced from the Shopify partner dashboard for the Nivenxa store. These values are not present in the repository.

### 12.4 Checkout Flow Requirements

When checkout is implemented, the expected flow is:

1. User clicks "Checkout" in the CartDrawer.
2. The Shopify cart ID from `nivenxa_cart_id` localStorage is retrieved.
3. A Shopify checkout URL is obtained for that cart (via Storefront API).
4. The user is redirected to the Shopify-hosted checkout page.
5. Post-purchase: Shopify handles payment, order confirmation, and fulfilment notifications.

### 12.5 Authentication Integration

The storefront uses Shopify Customer API (or a Shopify-compatible auth service) for user accounts. The signin/register/forgot-password UI is fully built in `SignInDrawer.tsx`. All API calls are marked TODO. The standalone login and register pages (`/account/login`, `/account/register`) also have form UI built but no API integration.

### 12.6 Currency

A `CurrencyProvider` context wraps the application. Currency display uses ₹ (Indian Rupee) in current test fixtures. Multi-currency support scope is not defined in the codebase. [NEEDS DECISION]

### 12.7 Inventory and Availability

Size availability is currently defined as static data in `src/data/products.ts` (e.g. XL is marked unavailable for the Heavyweight Pocket Tee). There is no real-time inventory lookup from Shopify.  
Required: Replace static availability flags with Shopify inventory API responses, or define a sync strategy for keeping the static data current.

---

*End of document.*
