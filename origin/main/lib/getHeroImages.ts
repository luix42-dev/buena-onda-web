const FALLBACK_HERO_IMAGES = [
  '/images/hero/01.jpg',
  '/images/hero/02.jpg',
  '/images/hero/06.jpg',
  '/images/hero/08.jpg',
]

type HeroMediaManifest = {
  images?: unknown
}

export async function getHeroImages(): Promise<string[]> {
  try {
    const res = await fetch('/hero-media.json', { cache: 'no-store' })
    if (!res.ok) return FALLBACK_HERO_IMAGES

    const manifest = await res.json() as HeroMediaManifest
    const images = Array.isArray(manifest.images)
      ? manifest.images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0)
      : []

    return images.length > 0 ? images : FALLBACK_HERO_IMAGES
  } catch {
    return FALLBACK_HERO_IMAGES
  }
}
