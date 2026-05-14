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
        label: "Women's Collections",
        href: '/shop/women',
        descriptor: 'Relaxed Indo-Western comfortwear',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #C89080 0%, #A87060 55%, #8A5548 100%)',
          text: "Relaxed women's forms\nin bio-washed and natural fibres.",
          ghost: 'WOMEN',
          editorial: [
            'Relaxed silhouettes rooted in softness, movement, and quiet structure.',
            'Designed for contemporary Indian wardrobes where comfort and everyday elegance coexist naturally.',
          ],
        },
      },
      {
        label: 'Unisex Essentials',
        href: '/shop/unisex',
        descriptor: 'Heavyweight everyday silhouettes',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #C8C4B0 0%, #B0AC9A 50%, #9A9888 100%)',
          text: 'Heavy GSM unisex staples\nfor the considered wardrobe.',
          ghost: 'UNISEX',
          editorial: [
            'Heavyweight everyday silhouettes built around movement, utility, and repetition.',
            'Oversized fits, washed textures, and structured fabrics designed to soften naturally over time.',
          ],
        },
      },
      {
        label: 'Youth Studio',
        href: '/shop/kids',
        descriptor: 'Playful comfortwear for younger wardrobes',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #8EA890 0%, #728C74 50%, #5A7060 100%)',
          text: 'Premium kids collections\nbuilt to last, made to wear.',
          ghost: 'YOUTH',
          editorial: [
            'Soft everyday essentials designed for comfort, ease, and playful movement.',
            'Relaxed forms and breathable fabrics made for daily life and growing individuality.',
          ],
        },
      },
    ],
  },
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
        label: 'Slow Comfort',
        href: '/shop/women-lounge-sets',
        descriptor: 'Cloud-soft modal for slow mornings',
        atmosphere: {
          gradient: 'linear-gradient(155deg, #EDE8DC 0%, #D8D0C0 40%, #C8BEA8 100%)',
          text: 'Cloud-soft modal co-ords\nfor slow, considered mornings.',
          ghost: 'COMFORT',
          editorial: [
            'Cloud-soft modal co-ords\nfor slow, considered mornings.',
            'Relaxed silhouettes designed\nfor comfort without excess.',
          ],
        },
      },
      {
        label: 'Utility Cargo',
        href: '/shop/cargo-pants',
        descriptor: 'Six-pocket bio-washed canvas',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #4A4840 0%, #3A3730 55%, #2E2C26 100%)',
          text: 'Six-pocket utility cuts\nin 320 GSM bio-washed canvas twill.',
          ghost: 'CARGO',
          editorial: [
            'Utility-focused silhouettes designed with washed structure, oversized proportions, and heavyweight movement.',
          ],
          tags: ['240–340 GSM cottons', 'Bio-washed finishes', 'Built for repetition'],
        },
        children: [
          { label: 'Relaxed Utility',    href: '/shop/cargo-pants' },
          { label: 'Urban Movement',     href: '/shop/cargo-pants' },
          { label: 'Heavyweight Canvas', href: '/shop/cargo-pants' },
        ],
      },
      {
        label: 'Everyday Silhouettes',
        href: '/shop/women-indo-western',
        descriptor: 'Modern Indo-western forms',
        atmosphere: {
          gradient: 'linear-gradient(140deg, #C87060 0%, #A85848 60%, #8A4538 100%)',
          text: 'Modern Indo-western forms\nfor elevated everyday ease.',
          ghost: 'FORM',
          editorial: [
            'Modern Indo-western forms\ndesigned for effortless movement.',
            'Relaxed structure balanced\nwith softness and quiet ease.',
          ],
        },
      },
      {
        label: 'Bio-Washed Essentials',
        href: '/shop/unisex',
        descriptor: 'Heavy GSM unisex staples',
        atmosphere: {
          gradient: 'linear-gradient(145deg, #D4CFBA 0%, #BFBA9E 55%, #ACA890 100%)',
          text: 'Heavyweight bio-washed essentials\ncrafted for elevated everyday wear.',
          ghost: 'WASHED',
          editorial: [
            'Heavyweight essentials\nwith softened structure and ease.',
            'Designed to feel lived-in\nfrom the very first wear.',
          ],
        },
      },
      {
        label: 'Oversized Tees',
        href: '/shop/over-tee-shirts',
        descriptor: 'Boxy heritage drop-shoulder cuts',
        atmosphere: {
          gradient: 'linear-gradient(150deg, #4A4844 0%, #383432 55%, #282826 100%)',
          text: 'Dense combed cotton\nin boxy heritage drop-shoulder silhouettes.',
          ghost: 'OVERSIZED',
          editorial: [
            'Boxy heritage silhouettes\nwith softened structure and weight.',
            'Everyday tees designed\nto drape naturally over time.',
          ],
        },
      },
      {
        label: 'Everyday Essentials',
        href: '/shop/unisex',
        descriptor: 'Unisex staples for elevated daily wear',
        atmosphere: {
          gradient: 'linear-gradient(142deg, #D8D4C4 0%, #C4C0AE 50%, #B4B0A0 100%)',
          text: 'Unisex staples in heavy GSM\nfor effortless, elevated daily wear.',
          ghost: 'DAILY',
          editorial: [
            'Clean everyday layers\nrooted in utility and softness.',
            'Designed for effortless wear\nacross changing routines.',
          ],
        },
      },
      {
        label: 'Sleepwear',
        href: null,
        descriptor: 'Considered rest, ultra-soft fabrics',
        atmosphere: {
          gradient: 'linear-gradient(148deg, #EAE6DC 0%, #DEDAD0 50%, #CCC8C0 100%)',
          text: 'Ultra-soft nightwear\nfor considered rest.',
          ghost: 'REST',
        },
        children: [
          { label: "Women's Sleepwear", href: '/shop/women-lounge-sets' },
          { label: 'Kids Sleepwear',    href: '/shop/kids-nightwear'    },
          { label: 'Unisex Lounge Sets',href: '/shop/unisex'            },
        ],
      },
    ],
  },
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
