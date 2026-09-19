/** Asset paths under /public — drop images here when ready. */

export function gamingImagePath(slug: string): string {
  return `/assets/gaming/${slug}.webp`;
}

export function productImagePath(slug: string): string {
  return `/assets/products/${slug}.webp`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const MEDIA_FALLBACKS = {
  gaming: '/assets/gaming/fallback.svg',
  product: '/assets/products/placeholder.svg',
  venueHero: '/assets/venue/hero.webp',
  logoMark: '/assets/brand/logo-mark.svg',
  emptyCart: '/assets/illustrations/empty-cart.svg',
  success: '/assets/illustrations/success.svg',
} as const;
