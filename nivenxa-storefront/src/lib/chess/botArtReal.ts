import type { StaticImageData } from 'next/image'
import type { BotId } from './botRoster'
import kelvo from '@/assets/chess-bots/kelvo.webp'
import lumio from '@/assets/chess-bots/lumio.webp'
import mivro from '@/assets/chess-bots/mivro.webp'
import orvyn from '@/assets/chess-bots/orvyn.webp'
import piplo from '@/assets/chess-bots/piplo.webp'
import tivvi from '@/assets/chess-bots/tivvi.webp'
import veluno from '@/assets/chess-bots/veluno.webp'
import zorvi from '@/assets/chess-bots/zorvi.webp'

// Optimised 128 px display derivatives only (masters and sources stay in the private asset folder). In a build made WITHOUT the
// opponent feature this module is replaced by botArtStub.ts (see next.config.ts), so the images are not even built. A displayed
// image can always be captured by whoever sees it: nothing here is a copy-protection measure.
const ART: Record<BotId, StaticImageData> = { lumio, tivvi, piplo, zorvi, veluno, mivro, orvyn, kelvo }
export default ART
