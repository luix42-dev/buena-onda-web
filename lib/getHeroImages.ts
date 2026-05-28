import { listHeroImageFiles } from '@/lib/hero-media'

export function getHeroImages(): string[] {
  return listHeroImageFiles().map(fileName => `/api/ig-img?f=${encodeURIComponent(fileName)}`)
}
