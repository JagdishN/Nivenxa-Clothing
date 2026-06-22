export interface Atmosphere {
  gradient: string
  text: string
  ghost?: string
  editorial?: string[]
  tags?: string[]
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
  // ── SHOP — audience-based entry point ──────────────────────────────────────
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
        label: "Men's",
        href: '/shop/mens',
        descriptor: 'Elevated Everyday Essentials',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #3A3830 0%, #2E2C26 55%, #222018 100%)',
          text: "Heavyweight combed cotton\nand utility canvas for the modern wardrobe.",
          ghost: 'MEN',
          editorial: [
            'Oversized tees and utility cargo in heavyweight fabrics.',
            'Designed for repeat wear and considered daily movement.',
          ],
        },
        children: [
          { label: 'Oversized Tee', href: '/shop/mens/oversized-tee' },
          { label: 'Cargo Pants',   href: '/shop/mens/cargo-pants'   },
        ],
      },
      {
        label: "Women's",
        href: '/shop/womens',
        descriptor: 'Relaxed Indian Comfortwear',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #C89080 0%, #A87060 55%, #8A5548 100%)',
          text: "Relaxed women's forms\nin bio-washed and natural fibres.",
          ghost: 'WOMEN',
          editorial: [
            'Relaxed silhouettes rooted in softness, movement, and quiet structure.',
            'Designed for contemporary Indian wardrobes where comfort and everyday elegance coexist naturally.',
          ],
        },
        children: [
          { label: 'A-line Kurta', href: '/shop/womens/a-line-kurta' },
          { label: 'Co-ord Set',   href: '/shop/womens/co-ord-set'   },
          { label: 'Sleepwear',    href: '/shop/womens/sleepwear'     },
        ],
      },
      {
        label: 'Unisex',
        href: '/shop/unisex',
        descriptor: 'Utility Cargos & Shared Essentials',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #C8C4B0 0%, #B0AC9A 50%, #9A9888 100%)',
          text: 'Heavy GSM unisex staples\nfor the considered wardrobe.',
          ghost: 'UNISEX',
          editorial: [
            'Heavyweight everyday silhouettes built around movement, utility, and repetition.',
            'Oversized fits, washed textures, and structured fabrics designed to soften naturally over time.',
          ],
        },
        children: [
          { label: 'Cargo Pants', href: '/shop/unisex/cargo-pants' },
          { label: 'Lounge Sets', href: '/shop/unisex/lounge-sets' },
        ],
      },
      {
        label: 'Youth Studio',
        href: '/shop/youth-studio',
        descriptor: 'Playful Comfort, Designed to Last',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #8EA890 0%, #728C74 50%, #5A7060 100%)',
          text: 'Premium kids collections\nbuilt to last, made to wear.',
          ghost: 'YOUTH',
          editorial: [
            'Soft everyday essentials designed for comfort, ease, and playful movement.',
            'Relaxed forms and breathable fabrics made for daily life and growing individuality.',
          ],
        },
        children: [
          { label: 'Sleepwear', href: '/shop/youth-studio/kids-sleepwear' },
          { label: 'Kids Tee',  href: '/shop/youth-studio/kids-tee'       },
        ],
      },
    ],
  },

  // ── EDITS — mood/story-based entry point ───────────────────────────────────
  {
    label: 'EDITS',
    href: null,
    atmosphere: {
      gradient: 'linear-gradient(148deg, #D4CFBA 0%, #BFBA9E 50%, #ACA890 100%)',
      text: 'Heavyweight bio-washed essentials\ncrafted for elevated everyday wear.',
      ghost: 'NIVENXA',
    },
    submenu: [
      {
        label: "The Indian Edit",
        href: '/edits/womens-edit',
        descriptor: 'Relaxed Indian Comfortwear',
        atmosphere: {
          gradient: 'linear-gradient(140deg, #C87060 0%, #A85848 60%, #8A4538 100%)',
          text: 'Modern Indo-western forms\nfor elevated everyday ease.',
          ghost: 'WOMEN',
          editorial: [
            'Indo-Western comfortwear designed for contemporary Indian wardrobes.',
            'Relaxed silhouettes balanced with softness and quiet elegance.',
          ],
        },
        children: [
          { label: 'A-line Kurta', href: '/edits/womens-edit/a-line-kurta' },
          { label: 'Co-ord Set',   href: '/edits/womens-edit/co-ord-set'   },
          { label: 'Sleepwear',    href: '/edits/womens-edit/sleepwear'    },
        ],
      },
      {
        label: 'The Ease Edit',
        href: '/edits/ease-edit',
        descriptor: 'Relaxed linen-cotton co-ords',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #E5E8DD 0%, #C9CDB8 50%, #AEB39A 100%)',
          text: 'Linen-cotton co-ords\nworn together or apart.',
          ghost: 'EASE',
        },
        children: [
          { label: 'Co-ord Set', href: '/edits/ease-edit/co-ord-set' },
        ],
      },
      {
        label: 'The Everyday Edit',
        href: '/edits/everyday-edit',
        descriptor: 'Bio-washed comfortwear for daily wear',
        atmosphere: {
          gradient: 'linear-gradient(155deg, #EDE8DC 0%, #D8D0C0 40%, #C8BEA8 100%)',
          text: 'Bio-washed comfortwear\nbuilt for daily wear and repeat wash.',
          ghost: 'EVERYDAY',
          editorial: [
            'Bio-washed essentials for the unhurried wardrobe.',
            'Designed for comfort, ease, and the rhythm of daily life.',
          ],
        },
        children: [
          { label: 'Relaxed Utility',       href: '/edits/everyday-edit/relaxed-utility'       },
          { label: 'Everyday Silhouettes',  href: '/edits/everyday-edit/everyday-silhouettes'  },
          { label: 'Bio-Washed Essentials', href: '/edits/everyday-edit/bio-washed-essentials' },
        ],
      },
      {
        label: 'The Utility Edit',
        href: '/edits/utility-edit',
        descriptor: 'Six-pocket bio-washed twill',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #4A4840 0%, #3A3730 55%, #2E2C26 100%)',
          text: 'Six-pocket utility cuts\nin 320 GSM bio-washed twill.',
          ghost: 'CARGO',
          editorial: [
            'Utility-focused silhouettes designed with washed structure, oversized proportions, and heavyweight movement.',
          ],
          tags: ['240–340 GSM cottons', 'Bio-washed finishes', 'Built for repetition'],
        },
        children: [
          { label: 'Relaxed Utility',    href: '/edits/utility-edit/relaxed-utility'    },
          { label: 'Urban Movement',     href: '/edits/utility-edit/urban-movement'     },
          { label: 'Heavyweight Canvas', href: '/edits/utility-edit/heavyweight-canvas' },
        ],
      },
      {
        label: 'The Dream Edit',
        href: '/edits/dream-edit',
        descriptor: 'Soft organic sleepwear',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #E2DCD0 0%, #CFC8B6 50%, #B8B098 100%)',
          text: 'Soft organic sleepwear\nfor every season.',
          ghost: 'DREAM',
        },
        children: [
          { label: 'The Rest Sleep Set',   href: '/edits/dream-edit/kids-rest-sleep-set'   },
          { label: 'The Summer Sleep Set', href: '/edits/dream-edit/kids-summer-sleep-set' },
        ],
      },
      {
        label: 'The Rest Edit',
        href: '/edits/rest-edit',
        descriptor: 'Considered rest. Ultra-soft fabrics.',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #EAE6DC 0%, #DEDAD0 50%, #CCC8C0 100%)',
          text: 'Ultra-soft nightwear\nfor considered rest.',
          ghost: 'REST',
        },
        children: [
          { label: "Women's Sleepwear", href: '/edits/rest-edit/womens-sleepwear' },
          { label: 'Kids Sleepwear',    href: '/edits/rest-edit/kids-sleepwear'   },
        ],
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
