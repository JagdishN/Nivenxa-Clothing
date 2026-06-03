import type { Product } from '@/types/product'
import CompositionHero from '../CompositionHero/CompositionHero'
import FabricPillars from '../FabricPillars/FabricPillars'
import ProductSpecs from '../ProductSpecs/ProductSpecs'
import CareInstructions from '../CareInstructions/CareInstructions'
import InfoAccordions from '../InfoAccordions/InfoAccordions'
import styles from './FabricStory.module.css'

interface Props {
  product: Product
}

export default function FabricStory({ product }: Props) {
  return (
    <div className={styles.wrapper}>
      <CompositionHero
        category={product.category}
        compositionQuote={product.compositionQuote}
      />
      <FabricPillars pillars={product.fabricPillars} />
      <ProductSpecs
        specs={product.specs}
        fitBars={product.fitBars}
        modelNote={product.modelNote}
      />
      <CareInstructions care={product.care} />
      <InfoAccordions accordions={product.accordions} />
    </div>
  )
}
