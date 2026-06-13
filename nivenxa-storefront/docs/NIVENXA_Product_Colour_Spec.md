# NIVENXA — Product & Colour Specification Document

**Version:** 1.0  
**Date:** 2026-06-11  
**Status:** Draft  
**Audience:** Photographer · Factory · Shopify Developer

---

## SECTION 1 — PRODUCT CATALOGUE OVERVIEW

| # | Product | Handle | Collection | Colours | Price | Images Required |
|---|---|---|---|---|---|---|
| 1 | Heavyweight Pocket Tee | `over-tee-shirts` | Men's | 6 | ₹1,999 | 30 (5 shots × 6 colours) |
| 2 | Unisex Cargo Pants | `cargo-pants` | Unisex | 6 | ₹3,499 | 32 (5 standard + 1 lifestyle for 2 colours already shot; 5 × 4 remaining) |
| 3 | A-line Kurta | `a-line-kurta` | Women's | 5 | ₹2,499 | 25 (5 shots × 5 colours) |
| 4 | Relaxed Co-ord Set | `women-lounge-sets` | Women's | 3 | ₹3,299 | 15 (5 shots × 3 colours) |
| 5 | Long Sleeve Lounge Set | `women-sleepwear` | Women's | 5 | ₹2,499 | 25 (5 shots × 5 colours) |
| 6 | Kids Sleepwear Set | `kids-sleepwear` | Youth Studio | 4 | ₹1,499 | 20 (5 shots × 4 colours) |

**Note on Unisex Cargo Pants:** Charcoal Grey and Dark Olive have real photographs on disk (6 images each, including a lifestyle shot). Stone Beige, Jet Black, Mocha Brown, and Rust Clay have no photography yet — placeholder images only.

**Note on Heavyweight Pocket Tee:** All 30 images (6 colours × 5 shots) are real files on disk. No new photography is required unless reshooting is planned.

---

## SECTION 2 — PRODUCT SPECIFICATIONS

---

### 2.1 Heavyweight Pocket Tee

**Overview**

| Field | Value |
|---|---|
| Handle | `over-tee-shirts` |
| Collection | Men's (`collectionSlug: mens`) |
| Price | ₹1,999 |
| Size Range | S, M, L (XL currently unavailable — marked disabled in data) |
| Fabric | 100% Combed Cotton, 240 GSM, Single Jersey |
| Fit | Drop-shoulder, boxy oversized |
| Badge | New Season |
| Model Note | Mritunjay is 5'11" wearing size L. Model weight 72 kg |
| Edits | The Everyday Edit (Everyday Silhouettes, Relaxed Utility, Bio-Washed Essentials); The Utility Edit (Urban Movement) |

**Colour Palette**

| # | Colour Name | Slug | Hex | Pantone TCX | Dye Method | Status |
|---|---|---|---|---|---|---|
| 1 | Raw Oat | `raw-oat` | #D4C5A9 | [SEE TEE SPEC] | Garment dyed | Active |
| 2 | Bone | `bone` | #F0EBE0 | [SEE TEE SPEC] | Garment dyed | Active |
| 3 | Espresso | `espresso` | #5C5248 | [SEE TEE SPEC] | Garment dyed | Active |
| 4 | Mushroom | `mushroom` | #A89888 | [SEE TEE SPEC] | Garment dyed | Active |
| 5 | Earth | `earth` | #8B7355 | [SEE TEE SPEC] | Garment dyed | Active |
| 6 | Red Earth | `red-earth` | #C47A4E | [SEE TEE SPEC] | Garment dyed | Active |

Note: Dye method confirmed as garment dyed in `specs` array (`{ group: 'Production', label: 'Finish', value: 'Garment dyed' }`). Pantone TCX values are not stored in `products.ts` — refer to the separate Tee specification document.

**Image Slots**

All 30 images are real files on disk. Folder paths: `public/images/Men/OversizedTee's/[FOLDER]/`. All colours share the same five filenames on disk (`front_studio_view.webp`, `back_studio_view.webp`, `side_studio_view.webp`, `walking_view.webp`, `fabric_close_up.webp`).

| Colour | Slot | Shot Type | Delivery File Name | Dimensions | Status |
|---|---|---|---|---|---|
| Raw Oat | S1 | Front Studio | HeavyweightPocketTee_RawOat_S1.jpg | 2000×2500 | Shot |
| Raw Oat | S2 | Back Studio | HeavyweightPocketTee_RawOat_S2.jpg | 1200×1500 | Shot |
| Raw Oat | S3 | Side Studio | HeavyweightPocketTee_RawOat_S3.jpg | 1200×1500 | Shot |
| Raw Oat | S4 | Walking | HeavyweightPocketTee_RawOat_S4.jpg | 1200×1500 | Shot |
| Raw Oat | S5 | Garment Closure | HeavyweightPocketTee_RawOat_S5.jpg | 1200×1500 | Shot |
| Bone | S1 | Front Studio | HeavyweightPocketTee_Bone_S1.jpg | 2000×2500 | Shot |
| Bone | S2 | Back Studio | HeavyweightPocketTee_Bone_S2.jpg | 1200×1500 | Shot |
| Bone | S3 | Side Studio | HeavyweightPocketTee_Bone_S3.jpg | 1200×1500 | Shot |
| Bone | S4 | Walking | HeavyweightPocketTee_Bone_S4.jpg | 1200×1500 | Shot |
| Bone | S5 | Garment Closure | HeavyweightPocketTee_Bone_S5.jpg | 1200×1500 | Shot |
| Espresso | S1 | Front Studio | HeavyweightPocketTee_Espresso_S1.jpg | 2000×2500 | Shot |
| Espresso | S2 | Back Studio | HeavyweightPocketTee_Espresso_S2.jpg | 1200×1500 | Shot |
| Espresso | S3 | Side Studio | HeavyweightPocketTee_Espresso_S3.jpg | 1200×1500 | Shot |
| Espresso | S4 | Walking | HeavyweightPocketTee_Espresso_S4.jpg | 1200×1500 | Shot |
| Espresso | S5 | Garment Closure | HeavyweightPocketTee_Espresso_S5.jpg | 1200×1500 | Shot |
| Mushroom | S1 | Front Studio | HeavyweightPocketTee_Mushroom_S1.jpg | 2000×2500 | Shot |
| Mushroom | S2 | Back Studio | HeavyweightPocketTee_Mushroom_S2.jpg | 1200×1500 | Shot |
| Mushroom | S3 | Side Studio | HeavyweightPocketTee_Mushroom_S3.jpg | 1200×1500 | Shot |
| Mushroom | S4 | Walking | HeavyweightPocketTee_Mushroom_S4.jpg | 1200×1500 | Shot |
| Mushroom | S5 | Garment Closure | HeavyweightPocketTee_Mushroom_S5.jpg | 1200×1500 | Shot |
| Earth | S1 | Front Studio | HeavyweightPocketTee_Earth_S1.jpg | 2000×2500 | Shot |
| Earth | S2 | Back Studio | HeavyweightPocketTee_Earth_S2.jpg | 1200×1500 | Shot |
| Earth | S3 | Side Studio | HeavyweightPocketTee_Earth_S3.jpg | 1200×1500 | Shot |
| Earth | S4 | Walking | HeavyweightPocketTee_Earth_S4.jpg | 1200×1500 | Shot |
| Earth | S5 | Garment Closure | HeavyweightPocketTee_Earth_S5.jpg | 1200×1500 | Shot |
| Red Earth | S1 | Front Studio | HeavyweightPocketTee_RedEarth_S1.jpg | 2000×2500 | Shot |
| Red Earth | S2 | Back Studio | HeavyweightPocketTee_RedEarth_S2.jpg | 1200×1500 | Shot |
| Red Earth | S3 | Side Studio | HeavyweightPocketTee_RedEarth_S3.jpg | 1200×1500 | Shot |
| Red Earth | S4 | Walking | HeavyweightPocketTee_RedEarth_S4.jpg | 1200×1500 | Shot |
| Red Earth | S5 | Garment Closure | HeavyweightPocketTee_RedEarth_S5.jpg | 1200×1500 | Shot |

---

### 2.2 Unisex Cargo Pants

**Overview**

| Field | Value |
|---|---|
| Handle | `cargo-pants` |
| Collection | Unisex (`collectionSlug: unisex`) |
| Price | ₹3,499 |
| Size Range | S, M, L, XL (XXL currently unavailable — marked disabled in data) |
| Fabric | 100% Cotton Canvas, 300 GSM, Twill Weave |
| Fit | Relaxed straight leg, mid-rise |
| Pockets | Six fully functional (two front slash, two side cargo with flap, two back patch) |
| Waistband | Partial elastic at back, flat front, internal drawcord |
| Badge | None |
| Model Note | Priya is 5'6" wearing size M. Model weight 58 kg |
| Edits | The Everyday Edit (Relaxed Utility, Bio-Washed Essentials); The Utility Edit (Relaxed Utility, Urban Movement, Heavyweight Canvas) |

Note: In `products.ts` this product is named "Unisex Cargo Pants". The image alt text within the file uses "Six-Pocket Cargo Pant". The Shopify product title should be confirmed with the brand team. [DATA MISSING — ADD MANUALLY]

**Colour Palette**

| # | Colour Name | Slug | Hex | Pantone TCX | Dye Method | Status |
|---|---|---|---|---|---|---|
| 1 | Charcoal Grey | `charcoal-grey` | #4A4A4A | 18-0601 TCX | Garment washed | Active |
| 2 | Dark Olive | `dark-olive` | #4A5240 | 19-0417 TCX | Garment washed | Active |
| 3 | Stone Beige | `stone-beige` | #C4B49A | 12-0712 TCX | Garment washed | Active |
| 4 | Jet Black | `jet-black` | #1A1A1A | 19-4005 TCX | Garment washed | Active |
| 5 | Mocha Brown | `mocha-brown` | #7B5C47 | 18-1048 TCX | Garment washed | Active |
| 6 | Rust Clay | `rust-clay` | #B5572A | 18-1250 TCX | Garment washed | Active |

Note: Pantone TCX values above are the confirmed brand values provided separately. Dye method listed as "Garment washed" from `specs` array (`{ label: 'Finish', value: 'Garment washed' }`). Actual dyeing process (reactive, vat, pigment) not specified in `products.ts`. [DATA MISSING — ADD MANUALLY]

**Hex flag for review:** `stone-beige` hex in `products.ts` is `#C4B49A` but the `styledWith` pairings map in the Tee product references Stone Beige as `#C8B89A`. Minor discrepancy — confirm correct value. [FLAG FOR REVIEW]

**Image Slots**

Charcoal Grey and Dark Olive have real images on disk. Stone Beige, Jet Black, Mocha Brown, and Rust Clay require photography.

An additional slot S6 (Lifestyle/Editorial) exists for Charcoal Grey and Dark Olive. This is a lifestyle image (`lifestyle_view.png` / `cargo_lifestyle_view.png`) captured alongside the standard 5 shots. It is recommended for all 6 colours when the remaining 4 are shot.

Folder paths for existing shots: `public/images/Unisex/cargos/charcoalgrey/` and `public/images/Unisex/cargos/darkolive/`.

| Colour | Slot | Shot Type | Delivery File Name | Dimensions | Status |
|---|---|---|---|---|---|
| Charcoal Grey | S1 | Front Studio | SixPocketCargoPants_CharcoalGrey_S1.jpg | 2000×2500 | Shot |
| Charcoal Grey | S2 | Back Studio | SixPocketCargoPants_CharcoalGrey_S2.jpg | 1200×1500 | Shot |
| Charcoal Grey | S3 | Side Studio | SixPocketCargoPants_CharcoalGrey_S3.jpg | 1200×1500 | Shot |
| Charcoal Grey | S4 | Walking | SixPocketCargoPants_CharcoalGrey_S4.jpg | 1200×1500 | Shot |
| Charcoal Grey | S5 | Garment Closure | SixPocketCargoPants_CharcoalGrey_S5.jpg | 1200×1500 | Shot |
| Charcoal Grey | S6 | Lifestyle / Editorial | SixPocketCargoPants_CharcoalGrey_S6.jpg | 1200×1500 | Shot |
| Dark Olive | S1 | Front Studio | SixPocketCargoPants_DarkOlive_S1.jpg | 2000×2500 | Shot |
| Dark Olive | S2 | Back Studio | SixPocketCargoPants_DarkOlive_S2.jpg | 1200×1500 | Shot |
| Dark Olive | S3 | Side Studio | SixPocketCargoPants_DarkOlive_S3.jpg | 1200×1500 | Shot |
| Dark Olive | S4 | Walking | SixPocketCargoPants_DarkOlive_S4.jpg | 1200×1500 | Shot |
| Dark Olive | S5 | Garment Closure | SixPocketCargoPants_DarkOlive_S5.jpg | 1200×1500 | Shot |
| Dark Olive | S6 | Lifestyle / Editorial | SixPocketCargoPants_DarkOlive_S6.jpg | 1200×1500 | Shot |
| Stone Beige | S1 | Front Studio | SixPocketCargoPants_StoneBeige_S1.jpg | 2000×2500 | Placeholder |
| Stone Beige | S2 | Back Studio | SixPocketCargoPants_StoneBeige_S2.jpg | 1200×1500 | Placeholder |
| Stone Beige | S3 | Side Studio | SixPocketCargoPants_StoneBeige_S3.jpg | 1200×1500 | Placeholder |
| Stone Beige | S4 | Walking | SixPocketCargoPants_StoneBeige_S4.jpg | 1200×1500 | Placeholder |
| Stone Beige | S5 | Garment Closure | SixPocketCargoPants_StoneBeige_S5.jpg | 1200×1500 | Placeholder |
| Jet Black | S1 | Front Studio | SixPocketCargoPants_JetBlack_S1.jpg | 2000×2500 | Placeholder |
| Jet Black | S2 | Back Studio | SixPocketCargoPants_JetBlack_S2.jpg | 1200×1500 | Placeholder |
| Jet Black | S3 | Side Studio | SixPocketCargoPants_JetBlack_S3.jpg | 1200×1500 | Placeholder |
| Jet Black | S4 | Walking | SixPocketCargoPants_JetBlack_S4.jpg | 1200×1500 | Placeholder |
| Jet Black | S5 | Garment Closure | SixPocketCargoPants_JetBlack_S5.jpg | 1200×1500 | Placeholder |
| Mocha Brown | S1 | Front Studio | SixPocketCargoPants_MochaBrown_S1.jpg | 2000×2500 | Placeholder |
| Mocha Brown | S2 | Back Studio | SixPocketCargoPants_MochaBrown_S2.jpg | 1200×1500 | Placeholder |
| Mocha Brown | S3 | Side Studio | SixPocketCargoPants_MochaBrown_S3.jpg | 1200×1500 | Placeholder |
| Mocha Brown | S4 | Walking | SixPocketCargoPants_MochaBrown_S4.jpg | 1200×1500 | Placeholder |
| Mocha Brown | S5 | Garment Closure | SixPocketCargoPants_MochaBrown_S5.jpg | 1200×1500 | Placeholder |
| Rust Clay | S1 | Front Studio | SixPocketCargoPants_RustClay_S1.jpg | 2000×2500 | Placeholder |
| Rust Clay | S2 | Back Studio | SixPocketCargoPants_RustClay_S2.jpg | 1200×1500 | Placeholder |
| Rust Clay | S3 | Side Studio | SixPocketCargoPants_RustClay_S3.jpg | 1200×1500 | Placeholder |
| Rust Clay | S4 | Walking | SixPocketCargoPants_RustClay_S4.jpg | 1200×1500 | Placeholder |
| Rust Clay | S5 | Garment Closure | SixPocketCargoPants_RustClay_S5.jpg | 1200×1500 | Placeholder |

---

### 2.3 A-line Kurta

**Overview**

| Field | Value |
|---|---|
| Handle | `a-line-kurta` |
| Collection | Women's (`collectionSlug: womens`) |
| Price | ₹2,499 |
| Size Range | XS, S, M, L, XL |
| Fabric | 60% Cotton / 40% Modal, 160 GSM, Cotton-Modal slub |
| Fit | A-line silhouette, knee length |
| Neckline | Mandarin collar, 3.5 cm height, five-button front placket |
| Finish | Bio-wash + silicone softener |
| Certification | OEKO-TEX Standard 100 |
| Badge | None |
| Model Note | Model is 5'6" wearing size S |
| Edits | The Everyday Edit (Everyday Silhouettes, Bio-Washed Essentials); The Women's Edit (Indo-Western Silhouettes, A-line Kurta) |

**Colour Palette**

| # | Colour Name | Slug | Hex | Pantone TCX | Dye Method | Status |
|---|---|---|---|---|---|---|
| 1 | Warm Ivory | `warm-ivory` | #F0EBE0 | [PANTONE TBC] | [DATA MISSING] | Active |
| 2 | Sandstone | `sandstone` | #C8A882 | [PANTONE TBC] | [DATA MISSING] | Active |
| 3 | Dust Sage | `dust-sage` | #8C9E84 | [PANTONE TBC] | [DATA MISSING] | Active |
| 4 | Dusty Rose | `dusty-rose` | #D4A8A0 | [PANTONE TBC] | [DATA MISSING] | Active |
| 5 | Desert Clay | `desert-clay` | #C47A4E | [PANTONE TBC] | [DATA MISSING] | Active |

Note: Pantone TCX values and dye method not stored in `products.ts` for this product. Add manually once confirmed with factory/colour team. Finish confirmed as Bio-wash + silicone softener from `specs` array.

**Image Slots**

All 25 images are currently placeholder (auto-generated coloured rectangles via placehold.co). All require real photography.

| Colour | Slot | Shot Type | Delivery File Name | Dimensions | Status |
|---|---|---|---|---|---|
| Warm Ivory | S1 | Front Studio | ALineKurta_WarmIvory_S1.jpg | 2000×2500 | Placeholder |
| Warm Ivory | S2 | Back Studio | ALineKurta_WarmIvory_S2.jpg | 1200×1500 | Placeholder |
| Warm Ivory | S3 | Side Studio | ALineKurta_WarmIvory_S3.jpg | 1200×1500 | Placeholder |
| Warm Ivory | S4 | Walking | ALineKurta_WarmIvory_S4.jpg | 1200×1500 | Placeholder |
| Warm Ivory | S5 | Garment Closure | ALineKurta_WarmIvory_S5.jpg | 1200×1500 | Placeholder |
| Sandstone | S1 | Front Studio | ALineKurta_Sandstone_S1.jpg | 2000×2500 | Placeholder |
| Sandstone | S2 | Back Studio | ALineKurta_Sandstone_S2.jpg | 1200×1500 | Placeholder |
| Sandstone | S3 | Side Studio | ALineKurta_Sandstone_S3.jpg | 1200×1500 | Placeholder |
| Sandstone | S4 | Walking | ALineKurta_Sandstone_S4.jpg | 1200×1500 | Placeholder |
| Sandstone | S5 | Garment Closure | ALineKurta_Sandstone_S5.jpg | 1200×1500 | Placeholder |
| Dust Sage | S1 | Front Studio | ALineKurta_DustSage_S1.jpg | 2000×2500 | Placeholder |
| Dust Sage | S2 | Back Studio | ALineKurta_DustSage_S2.jpg | 1200×1500 | Placeholder |
| Dust Sage | S3 | Side Studio | ALineKurta_DustSage_S3.jpg | 1200×1500 | Placeholder |
| Dust Sage | S4 | Walking | ALineKurta_DustSage_S4.jpg | 1200×1500 | Placeholder |
| Dust Sage | S5 | Garment Closure | ALineKurta_DustSage_S5.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S1 | Front Studio | ALineKurta_DustyRose_S1.jpg | 2000×2500 | Placeholder |
| Dusty Rose | S2 | Back Studio | ALineKurta_DustyRose_S2.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S3 | Side Studio | ALineKurta_DustyRose_S3.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S4 | Walking | ALineKurta_DustyRose_S4.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S5 | Garment Closure | ALineKurta_DustyRose_S5.jpg | 1200×1500 | Placeholder |
| Desert Clay | S1 | Front Studio | ALineKurta_DesertClay_S1.jpg | 2000×2500 | Placeholder |
| Desert Clay | S2 | Back Studio | ALineKurta_DesertClay_S2.jpg | 1200×1500 | Placeholder |
| Desert Clay | S3 | Side Studio | ALineKurta_DesertClay_S3.jpg | 1200×1500 | Placeholder |
| Desert Clay | S4 | Walking | ALineKurta_DesertClay_S4.jpg | 1200×1500 | Placeholder |
| Desert Clay | S5 | Garment Closure | ALineKurta_DesertClay_S5.jpg | 1200×1500 | Placeholder |

---

### 2.4 Relaxed Co-ord Set

**Overview**

| Field | Value |
|---|---|
| Handle | `women-lounge-sets` |
| Collection | Women's (`collectionSlug: womens`) |
| Price | ₹3,299 |
| Size Range | XS, S, M, L, XL |
| Fabric | Linen-cotton blend (blend ratio not specified in `products.ts`) |
| Fit | Top: relaxed shirt collar. Trouser: straight leg, mid-rise |
| Finish | Garment washed |
| Set includes | Top + trouser (sold together) |
| Badge | None |
| Model Note | Model is 5'6" wearing size S |
| Edits | The Rest Edit (Unisex Lounge Sets); The Women's Edit (Indo-Western Silhouettes, Co-ord Set) |

Note: Linen-cotton blend ratio is not specified in `products.ts` (`value: 'Linen-cotton blend'`). Confirm exact composition (e.g. 55% Linen / 45% Cotton) with the factory. [DATA MISSING — ADD MANUALLY]

**Colour Palette**

| # | Colour Name | Slug | Hex | Pantone TCX | Dye Method | Status |
|---|---|---|---|---|---|---|
| 1 | Warm Ivory | `warm-ivory` | #F0EBE0 | [PANTONE TBC] | [DATA MISSING] | Active |
| 2 | Dust Sage | `dust-sage` | #8C9E84 | [PANTONE TBC] | [DATA MISSING] | Active |
| 3 | Dusty Rose | `dusty-rose` | #D4A8A0 | [PANTONE TBC] | [DATA MISSING] | Active |

**Image Slots**

All 15 images are currently placeholder. All require real photography.

| Colour | Slot | Shot Type | Delivery File Name | Dimensions | Status |
|---|---|---|---|---|---|
| Warm Ivory | S1 | Front Studio | RelaxedCoordSet_WarmIvory_S1.jpg | 2000×2500 | Placeholder |
| Warm Ivory | S2 | Back Studio | RelaxedCoordSet_WarmIvory_S2.jpg | 1200×1500 | Placeholder |
| Warm Ivory | S3 | Side Studio | RelaxedCoordSet_WarmIvory_S3.jpg | 1200×1500 | Placeholder |
| Warm Ivory | S4 | Walking | RelaxedCoordSet_WarmIvory_S4.jpg | 1200×1500 | Placeholder |
| Warm Ivory | S5 | Garment Closure | RelaxedCoordSet_WarmIvory_S5.jpg | 1200×1500 | Placeholder |
| Dust Sage | S1 | Front Studio | RelaxedCoordSet_DustSage_S1.jpg | 2000×2500 | Placeholder |
| Dust Sage | S2 | Back Studio | RelaxedCoordSet_DustSage_S2.jpg | 1200×1500 | Placeholder |
| Dust Sage | S3 | Side Studio | RelaxedCoordSet_DustSage_S3.jpg | 1200×1500 | Placeholder |
| Dust Sage | S4 | Walking | RelaxedCoordSet_DustSage_S4.jpg | 1200×1500 | Placeholder |
| Dust Sage | S5 | Garment Closure | RelaxedCoordSet_DustSage_S5.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S1 | Front Studio | RelaxedCoordSet_DustyRose_S1.jpg | 2000×2500 | Placeholder |
| Dusty Rose | S2 | Back Studio | RelaxedCoordSet_DustyRose_S2.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S3 | Side Studio | RelaxedCoordSet_DustyRose_S3.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S4 | Walking | RelaxedCoordSet_DustyRose_S4.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S5 | Garment Closure | RelaxedCoordSet_DustyRose_S5.jpg | 1200×1500 | Placeholder |

---

### 2.5 Long Sleeve Lounge Set

**Overview**

| Field | Value |
|---|---|
| Handle | `women-sleepwear` |
| Collection | Women's (`collectionSlug: womens`) |
| Price | ₹2,499 |
| Size Range | XS, S, M, L, XL |
| Fabric | 280 GSM French Terry, 95% Combed Cotton / 5% Elastane |
| Fit | Top: relaxed. Trouser: tapered leg to ankle cuff |
| Cuffs | 4×4 ribbed at sleeve + ankle |
| Waistband | Elastic + internal drawcord |
| Finish | Bio-polished |
| Certification | OEKO-TEX Standard 100 |
| Badge | None |
| Model Note | Model is 5'6" wearing size S |
| Edits | The Rest Edit (Women's Sleepwear, Unisex Lounge Sets) |

**Colour Palette**

| # | Colour Name | Slug | Hex | Pantone TCX | Dye Method | Status |
|---|---|---|---|---|---|---|
| 1 | Soft Cream | `soft-cream` | #F5F0E8 | [PANTONE TBC] | [DATA MISSING] | Active |
| 2 | Oat Beige | `oat-beige` | #D8C9B0 | [PANTONE TBC] | [DATA MISSING] | Active |
| 3 | Dusty Rose | `dusty-rose` | #D4A8A0 | [PANTONE TBC] | [DATA MISSING] | Active |
| 4 | Lavender Grey | `lavender-grey` | #C4C0D8 | [PANTONE TBC] | [DATA MISSING] | Active |
| 5 | Olive Grey | `olive-grey` | #8A8E7A | [PANTONE TBC] | [DATA MISSING] | Active |

**Image Slots**

All 25 images are currently placeholder. All require real photography.

| Colour | Slot | Shot Type | Delivery File Name | Dimensions | Status |
|---|---|---|---|---|---|
| Soft Cream | S1 | Front Studio | LongSleeveLoungeset_SoftCream_S1.jpg | 2000×2500 | Placeholder |
| Soft Cream | S2 | Back Studio | LongSleeveLoungeset_SoftCream_S2.jpg | 1200×1500 | Placeholder |
| Soft Cream | S3 | Side Studio | LongSleeveLoungeset_SoftCream_S3.jpg | 1200×1500 | Placeholder |
| Soft Cream | S4 | Walking | LongSleeveLoungeset_SoftCream_S4.jpg | 1200×1500 | Placeholder |
| Soft Cream | S5 | Garment Closure | LongSleeveLoungeset_SoftCream_S5.jpg | 1200×1500 | Placeholder |
| Oat Beige | S1 | Front Studio | LongSleeveLoungeset_OatBeige_S1.jpg | 2000×2500 | Placeholder |
| Oat Beige | S2 | Back Studio | LongSleeveLoungeset_OatBeige_S2.jpg | 1200×1500 | Placeholder |
| Oat Beige | S3 | Side Studio | LongSleeveLoungeset_OatBeige_S3.jpg | 1200×1500 | Placeholder |
| Oat Beige | S4 | Walking | LongSleeveLoungeset_OatBeige_S4.jpg | 1200×1500 | Placeholder |
| Oat Beige | S5 | Garment Closure | LongSleeveLoungeset_OatBeige_S5.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S1 | Front Studio | LongSleeveLoungeset_DustyRose_S1.jpg | 2000×2500 | Placeholder |
| Dusty Rose | S2 | Back Studio | LongSleeveLoungeset_DustyRose_S2.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S3 | Side Studio | LongSleeveLoungeset_DustyRose_S3.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S4 | Walking | LongSleeveLoungeset_DustyRose_S4.jpg | 1200×1500 | Placeholder |
| Dusty Rose | S5 | Garment Closure | LongSleeveLoungeset_DustyRose_S5.jpg | 1200×1500 | Placeholder |
| Lavender Grey | S1 | Front Studio | LongSleeveLoungeset_LavenderGrey_S1.jpg | 2000×2500 | Placeholder |
| Lavender Grey | S2 | Back Studio | LongSleeveLoungeset_LavenderGrey_S2.jpg | 1200×1500 | Placeholder |
| Lavender Grey | S3 | Side Studio | LongSleeveLoungeset_LavenderGrey_S3.jpg | 1200×1500 | Placeholder |
| Lavender Grey | S4 | Walking | LongSleeveLoungeset_LavenderGrey_S4.jpg | 1200×1500 | Placeholder |
| Lavender Grey | S5 | Garment Closure | LongSleeveLoungeset_LavenderGrey_S5.jpg | 1200×1500 | Placeholder |
| Olive Grey | S1 | Front Studio | LongSleeveLoungeset_OliveGrey_S1.jpg | 2000×2500 | Placeholder |
| Olive Grey | S2 | Back Studio | LongSleeveLoungeset_OliveGrey_S2.jpg | 1200×1500 | Placeholder |
| Olive Grey | S3 | Side Studio | LongSleeveLoungeset_OliveGrey_S3.jpg | 1200×1500 | Placeholder |
| Olive Grey | S4 | Walking | LongSleeveLoungeset_OliveGrey_S4.jpg | 1200×1500 | Placeholder |
| Olive Grey | S5 | Garment Closure | LongSleeveLoungeset_OliveGrey_S5.jpg | 1200×1500 | Placeholder |

---

### 2.6 Kids Sleepwear Set

**Overview**

| Field | Value |
|---|---|
| Handle | `kids-sleepwear` |
| Collection | Youth Studio (`collectionSlug: youth-studio`) |
| Price | ₹1,499 |
| Size Range | 2Y, 4Y, 6Y, 8Y, 10Y, 12Y (unisex) |
| Fabric | Super combed cotton (GSM not specified in `products.ts`) |
| Fit | Relaxed comfort, extended body length, roomy seat |
| Set includes | Top + trouser/shorts |
| Seams | Flat construction throughout |
| Label | Heat printed (no sewn label) |
| Finish | Enzyme washed |
| Certification | OEKO-TEX Standard 100 (all components) |
| Badge | None |
| Model Note | Model is 6 years old wearing size 6Y |
| Edits | The Everyday Edit (Bio-Washed Essentials); The Rest Edit (Kids Sleepwear) |

Note: GSM weight for the Kids Sleepwear fabric is not specified in `products.ts`. The `featureBullets` and `specs` arrays reference "Super combed cotton" only. Confirm GSM with factory. [DATA MISSING — ADD MANUALLY]

**Colour Palette**

| # | Colour Name | Slug | Hex | Pantone TCX | Dye Method | Status |
|---|---|---|---|---|---|---|
| 1 | Soft Cream | `soft-cream` | #F5F0E8 | [PANTONE TBC] | [DATA MISSING] | Active |
| 2 | Oat Beige | `oat-beige` | #D8C9B0 | [PANTONE TBC] | [DATA MISSING] | Active |
| 3 | Sage Green | `sage-green` | #8E9E82 | [PANTONE TBC] | [DATA MISSING] | Active |
| 4 | Mushroom | `mushroom` | #A89888 | [PANTONE TBC] | [DATA MISSING] | Active |

**Image Slots**

All 20 images are currently placeholder. All require real photography.

| Colour | Slot | Shot Type | Delivery File Name | Dimensions | Status |
|---|---|---|---|---|---|
| Soft Cream | S1 | Front Studio | KidsSleepwearSet_SoftCream_S1.jpg | 2000×2500 | Placeholder |
| Soft Cream | S2 | Back Studio | KidsSleepwearSet_SoftCream_S2.jpg | 1200×1500 | Placeholder |
| Soft Cream | S3 | Side Studio | KidsSleepwearSet_SoftCream_S3.jpg | 1200×1500 | Placeholder |
| Soft Cream | S4 | Walking | KidsSleepwearSet_SoftCream_S4.jpg | 1200×1500 | Placeholder |
| Soft Cream | S5 | Garment Closure | KidsSleepwearSet_SoftCream_S5.jpg | 1200×1500 | Placeholder |
| Oat Beige | S1 | Front Studio | KidsSleepwearSet_OatBeige_S1.jpg | 2000×2500 | Placeholder |
| Oat Beige | S2 | Back Studio | KidsSleepwearSet_OatBeige_S2.jpg | 1200×1500 | Placeholder |
| Oat Beige | S3 | Side Studio | KidsSleepwearSet_OatBeige_S3.jpg | 1200×1500 | Placeholder |
| Oat Beige | S4 | Walking | KidsSleepwearSet_OatBeige_S4.jpg | 1200×1500 | Placeholder |
| Oat Beige | S5 | Garment Closure | KidsSleepwearSet_OatBeige_S5.jpg | 1200×1500 | Placeholder |
| Sage Green | S1 | Front Studio | KidsSleepwearSet_SageGreen_S1.jpg | 2000×2500 | Placeholder |
| Sage Green | S2 | Back Studio | KidsSleepwearSet_SageGreen_S2.jpg | 1200×1500 | Placeholder |
| Sage Green | S3 | Side Studio | KidsSleepwearSet_SageGreen_S3.jpg | 1200×1500 | Placeholder |
| Sage Green | S4 | Walking | KidsSleepwearSet_SageGreen_S4.jpg | 1200×1500 | Placeholder |
| Sage Green | S5 | Garment Closure | KidsSleepwearSet_SageGreen_S5.jpg | 1200×1500 | Placeholder |
| Mushroom | S1 | Front Studio | KidsSleepwearSet_Mushroom_S1.jpg | 2000×2500 | Placeholder |
| Mushroom | S2 | Back Studio | KidsSleepwearSet_Mushroom_S2.jpg | 1200×1500 | Placeholder |
| Mushroom | S3 | Side Studio | KidsSleepwearSet_Mushroom_S3.jpg | 1200×1500 | Placeholder |
| Mushroom | S4 | Walking | KidsSleepwearSet_Mushroom_S4.jpg | 1200×1500 | Placeholder |
| Mushroom | S5 | Garment Closure | KidsSleepwearSet_Mushroom_S5.jpg | 1200×1500 | Placeholder |

---

## SECTION 3 — IMAGE REQUIREMENTS SUMMARY

### 3.1 Per-Product Breakdown

| Product | Colours | Shots per Colour | Total Images | Images Shot | Images Required |
|---|---|---|---|---|---|
| Heavyweight Pocket Tee | 6 | 5 | 30 | 30 | 0 |
| Unisex Cargo Pants | 6 | 5 standard + 1 lifestyle for 2 | 32 | 12 (Charcoal Grey + Dark Olive, 6 each) | 20 (4 remaining colours × 5 shots) |
| A-line Kurta | 5 | 5 | 25 | 0 | 25 |
| Relaxed Co-ord Set | 3 | 5 | 15 | 0 | 15 |
| Long Sleeve Lounge Set | 5 | 5 | 25 | 0 | 25 |
| Kids Sleepwear Set | 4 | 5 | 20 | 0 | 20 |

### 3.2 Running Total

| | Count |
|---|---|
| Total images required across entire catalogue (5 shots × all colours) | **147** |
| Images already shot (real files on disk) | **42** (30 Tee + 12 Cargo) |
| Images still needed | **105** |

Notes on the 42 count: The Cargo Pants Charcoal Grey and Dark Olive have 6 real images each (5 standard + 1 lifestyle/editorial), giving 12 real cargo images. The 20 remaining cargo images (4 colours × 5 shots) are still needed. For the purposes of the total-required count of 177, only the standard 5-shot slots are counted. The 2 lifestyle/editorial shots already exist as a bonus above the 5-shot spec.

---

## SECTION 4 — PHOTOGRAPHY BRIEF (SUMMARY)

### 4.1 Shot Type Reference

**S1 — Front Studio**  
Full-length, straight-on front view. Clean studio background (colour matched to garment — see Section 4.2). No top, no shoes. Ankle stacking visible. Full product visible from collar to hem.

**S2 — Back Studio**  
Full-length rear view. All back pocket details visible (pockets, back seams, label). Same clean studio background as S1.

**S3 — Side Studio**  
Clean side profile. Pocket depth and silhouette proportion visible. Same background as S1. Arm relaxed by side.

**S4 — Walking**  
Mid-stride. Natural movement visible. For adult products: styled with a neutral tee (for bottoms) or neutral trousers (for tops) and white sneakers. For kids: natural play stance acceptable.

**S5 — Garment Closure**  
Close-up macro. Hardware, zip, button, pocket flap, topstitching, fabric texture. No full figure. Shows construction quality. For garments with no visible closure hardware (e.g. tee): captures fabric weave texture, pocket stitching, hem finish.

**S6 — Lifestyle / Editorial (Cargo Pants only — recommended for all 6 colours)**  
Contextual lifestyle image. Subject in natural environment or clean editorial setting. Movement implied. Not a clean studio shot. This slot exists for Charcoal Grey and Dark Olive; recommended when Stone Beige, Jet Black, Mocha Brown, and Rust Clay are shot.

### 4.2 Background Colours per Colourway (Cargo Pants)

| Colourway | Background |
|---|---|
| Stone Beige | Warm off-white / cream |
| Rust Clay | Warm light grey |
| Charcoal Grey | Clean light warm grey |
| Mocha Brown | Warm cream |
| Jet Black | Pure white |
| Dark Olive | Soft warm white |

Note: Background guidance above applies to the Cargo Pants colourways as specified. Background guidance for other product colourways is not defined in current brand documentation. [DATA MISSING — ADD MANUALLY]

### 4.3 General Guidance

- All images: 4:5 aspect ratio (portrait). Hero images (S1) at 2000×2500 px. All other slots at 1200×1500 px.
- Format: WebP (preferred) or JPG, minimum 90% quality.
- No branding, overlays, or text in the raw files.
- Deliver files using the naming convention in Section 2 image tables.
- All existing Heavyweight Pocket Tee images are `.webp`. Maintain WebP format for consistency when delivering new photography.

---

## SECTION 5 — CANVA PROMPT REFERENCE

Note: Full AI image generation prompts are maintained separately per product. Status below reflects what is known from the codebase and the confirmed information provided. Prompt files are not stored in `products.ts`, `edits.ts`, or `navigation.ts`.

| Product | Colours | Shots per Colour | Total Prompts Required | Prompts Written | Prompts Pending |
|---|---|---|---|---|---|
| Heavyweight Pocket Tee | 6 | 5 | 30 | [DATA MISSING — ADD MANUALLY] | [DATA MISSING — ADD MANUALLY] |
| Unisex Cargo Pants | 6 | 5 | 30 | 30 (complete) | 0 |
| A-line Kurta | 11 | 5 | 55 | [DATA MISSING — ADD MANUALLY] | [DATA MISSING — ADD MANUALLY] |
| Relaxed Co-ord Set | 3 | 5 | 15 | [DATA MISSING — ADD MANUALLY] | [DATA MISSING — ADD MANUALLY] |
| Long Sleeve Lounge Set | 5 | 5 | 25 | [DATA MISSING — ADD MANUALLY] | [DATA MISSING — ADD MANUALLY] |
| Kids Sleepwear Set | 4 | 5 | 20 | [DATA MISSING — ADD MANUALLY] | [DATA MISSING — ADD MANUALLY] |

Total prompts required (standard 5-shot set): **175**  
Total prompts confirmed written: **30** (Six Pocket Cargo Pants, all colours complete)  
Total prompts status unknown: **145** (add manually)

---

## SECTION 6 — SHOPIFY PRODUCT SETUP REFERENCE

### 6.1 Heavyweight Pocket Tee

| Field | Value |
|---|---|
| Product Title | Heavyweight Pocket Tee |
| Handle | `over-tee-shirts` ← must match exactly |
| Collections | Men's |
| Variant count | 24 (6 colours × 4 sizes: S, M, L, XL) |
| Note on XL | XL is defined in sizes array but marked `available: false`. Create the Shopify variant but set inventory to 0 and disable selling when out of stock. |
| Images per variant | 5 (S1–S5 per colour) |

Variants:

| Colour | Sizes |
|---|---|
| Raw Oat | S, M, L, XL |
| Bone | S, M, L, XL |
| Espresso | S, M, L, XL |
| Mushroom | S, M, L, XL |
| Earth | S, M, L, XL |
| Red Earth | S, M, L, XL |

Metafields required per variant:

| Metafield Key | Type | Example Value |
|---|---|---|
| `nivenxa.colour_hex` | string | #D4C5A9 |
| `nivenxa.colour_name` | string | Raw Oat |
| `nivenxa.colour_slug` | string | raw-oat |

---

### 6.2 Unisex Cargo Pants

| Field | Value |
|---|---|
| Product Title | Unisex Cargo Pants (confirm marketing title with brand team — see note in Section 2.2) |
| Handle | `cargo-pants` ← must match exactly |
| Collections | Unisex; also appears under Men's in navigation |
| Variant count | 30 (6 colours × 5 sizes: S, M, L, XL, XXL) |
| Note on XXL | XXL is defined in sizes array but marked `available: false`. Create the Shopify variant but set inventory to 0 and disable selling when out of stock. |
| Images per variant | 5 standard (S1–S5). A 6th lifestyle image (S6) exists for Charcoal Grey and Dark Olive — upload as additional image for those variants. |

Variants:

| Colour | Sizes |
|---|---|
| Charcoal Grey | S, M, L, XL, XXL |
| Dark Olive | S, M, L, XL, XXL |
| Stone Beige | S, M, L, XL, XXL |
| Jet Black | S, M, L, XL, XXL |
| Mocha Brown | S, M, L, XL, XXL |
| Rust Clay | S, M, L, XL, XXL |

Metafields required per variant:

| Metafield Key | Type | Example Value |
|---|---|---|
| `nivenxa.colour_hex` | string | #4A4A4A |
| `nivenxa.colour_name` | string | Charcoal Grey |
| `nivenxa.colour_slug` | string | charcoal-grey |

---

### 6.3 A-line Kurta

| Field | Value |
|---|---|
| Product Title | A-line Kurta |
| Handle | `a-line-kurta` ← must match exactly |
| Collections | Women's |
| Variant count | 25 (5 colours × 5 sizes: XS, S, M, L, XL) |
| Images per variant | 5 (S1–S5 per colour) |

Variants:

| Colour | Sizes |
|---|---|
| Warm Ivory | XS, S, M, L, XL |
| Sandstone | XS, S, M, L, XL |
| Dust Sage | XS, S, M, L, XL |
| Dusty Rose | XS, S, M, L, XL |
| Desert Clay | XS, S, M, L, XL |

Metafields required per variant: same three keys as above (`nivenxa.colour_hex`, `nivenxa.colour_name`, `nivenxa.colour_slug`).

---

### 6.4 Relaxed Co-ord Set

| Field | Value |
|---|---|
| Product Title | Relaxed Co-ord Set |
| Handle | `women-lounge-sets` ← must match exactly |
| Collections | Women's |
| Variant count | 15 (3 colours × 5 sizes: XS, S, M, L, XL) |
| Images per variant | 5 (S1–S5 per colour) |
| Note | Set includes top and trouser. Shopify product should be set up as a complete set, not as separate items. |

Variants:

| Colour | Sizes |
|---|---|
| Warm Ivory | XS, S, M, L, XL |
| Dust Sage | XS, S, M, L, XL |
| Dusty Rose | XS, S, M, L, XL |

Metafields required per variant: same three keys.

---

### 6.5 Long Sleeve Lounge Set

| Field | Value |
|---|---|
| Product Title | Long Sleeve Lounge Set |
| Handle | `women-sleepwear` ← must match exactly |
| Collections | Women's |
| Variant count | 25 (5 colours × 5 sizes: XS, S, M, L, XL) |
| Images per variant | 5 (S1–S5 per colour) |
| Note | Set includes top + jogger trouser. Shopify product should be set up as a complete set. |

Variants:

| Colour | Sizes |
|---|---|
| Soft Cream | XS, S, M, L, XL |
| Oat Beige | XS, S, M, L, XL |
| Dusty Rose | XS, S, M, L, XL |
| Lavender Grey | XS, S, M, L, XL |
| Olive Grey | XS, S, M, L, XL |

Metafields required per variant: same three keys.

---

### 6.6 Kids Sleepwear Set

| Field | Value |
|---|---|
| Product Title | Kids Sleepwear Set |
| Handle | `kids-sleepwear` ← must match exactly |
| Collections | Youth Studio |
| Variant count | 24 (4 colours × 6 sizes: 2Y, 4Y, 6Y, 8Y, 10Y, 12Y) |
| Images per variant | 5 (S1–S5 per colour) |
| Note | Set includes top + trouser/shorts. Confirm which bottom type (trouser or shorts) ships per size group with factory. [DATA MISSING — ADD MANUALLY] |

Variants:

| Colour | Sizes |
|---|---|
| Soft Cream | 2Y, 4Y, 6Y, 8Y, 10Y, 12Y |
| Oat Beige | 2Y, 4Y, 6Y, 8Y, 10Y, 12Y |
| Sage Green | 2Y, 4Y, 6Y, 8Y, 10Y, 12Y |
| Mushroom | 2Y, 4Y, 6Y, 8Y, 10Y, 12Y |

Metafields required per variant: same three keys.

---

## APPENDIX — DATA FLAGS SUMMARY

The following fields were not found in `products.ts`, `edits.ts`, or `navigation.ts` and must be added manually to this document once confirmed.

| # | Product | Missing Data |
|---|---|---|
| 1 | All products except Cargo Pants | Pantone TCX values — not stored in `products.ts` |
| 2 | All products | Dye method (reactive / vat / pigment / garment-dye process) — finish is listed but not the dye process |
| 3 | A-line Kurta (and others) | Canva prompt status — no prompt files in codebase |
| 4 | Relaxed Co-ord Set | Linen-cotton blend ratio — listed only as "Linen-cotton blend" without percentages |
| 5 | Kids Sleepwear Set | GSM weight — "Super combed cotton" listed but no GSM figure |
| 6 | Kids Sleepwear Set | Whether bottom is trouser or shorts per size group |
| 7 | Unisex Cargo Pants | Shopify product marketing title — "Unisex Cargo Pants" in data vs "Six Pocket Cargo Pants" in alt text |
| 8 | All remaining products | Photography studio background colour per colourway — only Cargo Pants backgrounds are documented |

**Hex value flag for review:**

| Product | Colour | Hex in Product Object | Hex in StyledWith Pairing | Action |
|---|---|---|---|---|
| Unisex Cargo Pants | Stone Beige | #C4B49A | #C8B89A | Confirm correct value with brand team |

---

*End of document.*
