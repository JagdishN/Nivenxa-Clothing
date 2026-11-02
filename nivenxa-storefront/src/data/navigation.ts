export interface Atmosphere {
  gradient: string
  text: string
  ghost?: string
  editorial?: string[]
  tags?: string[]
  image?: string   // real model/product photo — shown instead of the fabric-texture gradient when set
}

export interface ChildItem {
  label: string
  href: string
}

export interface SubItem {
  label: string
  href: string | null
  descriptor?: string
  atmosphere?: Atmosphere
  children?: ChildItem[]
}

export interface NavItem {
  label: string
  href: string | null
  atmosphere?: Atmosphere
  submenu: SubItem[] | null
}

export const NAV_ITEMS: NavItem[] = [
  // ── SHOP — Shop all, Unisex, Women, Kids (same order on desktop and mobile) ──
  // There is no men's-specific category. Kids products appear under Kids only.
  {
    label: 'SHOP',
    href: '/shop',
    atmosphere: {
      gradient: 'linear-gradient(150deg, #EDE8DC 0%, #D5CFC0 45%, #C2BAA8 100%)',
      text: 'Elevated Indian comfortwear\nrooted in heritage craft.',
      ghost: 'NIVENXA',
    },
    submenu: [
      {
        label: 'Shop all',
        href: '/shop',
        descriptor: 'The SS2026 range',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #EDE8DC 0%, #D5CFC0 45%, #C2BAA8 100%)',
          text: 'Everyday pieces for the\nconsidered wardrobe.',
          ghost: 'SHOP',
        },
      },
      {
        label: 'Unisex',
        href: '/shop/unisex',
        descriptor: 'Tees & Utility Cargos',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #C8C4B0 0%, #B0AC9A 50%, #9A9888 100%)',
          text: 'Shared essentials\nfor the considered wardrobe.',
          ghost: 'UNISEX',
          editorial: [
            'Everyday silhouettes designed for movement, utility, and repetition.',
          ],
          image: '/images/Unisex/cargos/SANDBEIGE/walking_view.webp',
        },
      },
      {
        label: 'Women',
        href: '/shop/womens',
        descriptor: 'Relaxed Indian Comfortwear',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #C89080 0%, #A87060 55%, #8A5548 100%)',
          text: "Relaxed women's forms\nfor everyday ease.",
          ghost: 'WOMEN',
          editorial: [
            'Relaxed silhouettes rooted in softness, movement, and quiet structure.',
          ],
        },
      },
      {
        label: 'Kids',
        href: '/shop/kids',
        descriptor: 'Playful Comfort, Designed to Last',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #8EA890 0%, #728C74 50%, #5A7060 100%)',
          text: 'Everyday kids pieces\nbuilt to last, made to wear.',
          ghost: 'KIDS',
          editorial: [
            'Soft everyday essentials designed for comfort, ease, and playful movement.',
          ],
        },
      },
    ],
  },

  // ── STORIES — unchanged ────────────────────────────────────────────────────
  {
    label: 'STORIES',
    href: '/stories',
    atmosphere: {
      gradient: 'linear-gradient(148deg, #C8C0A8 0%, #B0A890 50%, #9A9278 100%)',
      text: 'Garments shaped through fabric,\nmovement, utility, and time.\n\nStories exploring the materials,\nprocesses, and rhythms behind\nthe NIVENXA wardrobe.',
      ghost: 'STORIES',
    },
    submenu: [
      {
        label: 'Craftsmanship',
        href: '/stories/craftsmanship',
        descriptor: 'Hands that weave with intention',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #D4CABC 0%, #C0B4A4 50%, #A89C8C 100%)',
          text: 'Hands that weave,\nstitch, and finish with intention.',
          ghost: 'CRAFT',
        },
      },
      {
        label: 'Fabric Journal',
        href: '/stories/fabric-journal',
        descriptor: 'GSM weights and weave science',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #D8D0C0 0%, #C8C0AE 50%, #B4ACA0 100%)',
          text: 'GSM weights, weave counts,\nand the science of feel.',
          ghost: 'FABRIC',
        },
      },
      {
        label: 'Made in India',
        href: '/stories/made-in-india',
        descriptor: 'Heritage roots, modern form',
        atmosphere: {
          gradient: 'linear-gradient(142deg, #D07E62 0%, #C46E52 55%, #A45840 100%)',
          text: 'Rooted in Indian heritage,\nbuilt for the modern wardrobe.',
          ghost: 'INDIA',
        },
      },
      {
        label: 'Campaigns',
        href: '/stories/campaigns',
        descriptor: 'Editorial imagery for slow living',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #4A4840 0%, #3A3730 55%, #2A2824 100%)',
          text: 'Editorial imagery\nfor a considered lifestyle.',
          ghost: 'VISUAL',
        },
      },
      {
        label: 'The Process',
        href: '/stories/the-process',
        descriptor: 'From loom to label',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #8EA890 0%, #708070 55%, #526055 100%)',
          text: 'From loom to label —\nevery step, considered.',
          ghost: 'PROCESS',
        },
      },
    ],
  },
]
