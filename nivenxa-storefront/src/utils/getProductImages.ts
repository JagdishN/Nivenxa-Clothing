import type { ProductImage, ImageType } from '@/types/product'

export function getPrimaryImage(images: ProductImage[]): ProductImage {
  // Priority: studio-front → walking → editorial → studio-back → detail
  const priority: ImageType[] = [
    'studio-front',
    'walking',
    'editorial',
    'studio-back',
    'detail',
  ]
  for (const type of priority) {
    const match = images.find(img => img.type === type)
    if (match) return match
  }
  return images[0]
}

export function getGalleryImages(images: ProductImage[]): ProductImage[] {
  // Display order — first slot is always the sticky hero (studio-front);
  // the scrolling stack (slice(1)) follows:
  //   walking → studio-back → studio-side → detail (pocket) →
  //   front → back → side (non-studio on-location poses) → editorial
  const order: ImageType[] = [
    'studio-front',
    'walking',
    'studio-back',
    'studio-side',
    'detail',
    'front',
    'back',
    'side',
    'editorial',
  ]
  return [...images].sort((a, b) => {
    const ai = order.indexOf(a.type)
    const bi = order.indexOf(b.type)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

export function getCrossSellImage(images: ProductImage[]): ProductImage {
  // Cross-sell: never show studio-back or detail
  const priority: ImageType[] = [
    'studio-front',
    'walking',
    'editorial',
  ]
  for (const type of priority) {
    const match = images.find(img => img.type === type)
    if (match) return match
  }
  return images[0]
}

export function getImagesByColour(
  images: ProductImage[],
  colourSlug: string
): ProductImage[] {
  return images.filter(img => img.colourSlug === colourSlug)
}
