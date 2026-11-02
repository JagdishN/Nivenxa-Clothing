import type { Product } from '@/types/product'
import CompositionHero from '../CompositionHero/CompositionHero'
import FabricPillars from '../FabricPillars/FabricPillars'
import ProductSpecs from '../ProductSpecs/ProductSpecs'
import InfoAccordions from '../InfoAccordions/InfoAccordions'
import styles from './FabricStory.module.css'

interface Props {
  product: Product
}

export default function FabricStory({ product }: Props) {
  return (
    <div className={styles.wrapper}>
      {product.compositionQuote && (
        <CompositionHero
          category={product.category}
          compositionQuote={product.compositionQuote}
        />
      )}
      {product.fabricPillars.length > 0 && <FabricPillars pillars={product.fabricPillars} />}
      {(product.specs.length > 0 || product.fitBars.length > 0 || product.care.length > 0) && (
        <ProductSpecs
          specs={product.specs}
          fitBars={product.fitBars}
          modelNote={product.modelNote}
          care={product.care}
        />
      )}
      {product.accordions.length > 0 && <InfoAccordions accordions={product.accordions} />}
    </div>
  )
}
