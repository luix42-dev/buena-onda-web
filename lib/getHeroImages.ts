import fs from 'fs'
import path from 'path'

const MEDIA_DIR = 'D:\\BuenaOnda_Audit\\01_instagram_raw\\MEDIA'

export function getHeroImages(): string[] {
  try {
    const entries = fs.readdirSync(MEDIA_DIR, { withFileTypes: true })
    return entries
      .filter(e => e.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(e.name))
      .map(e => `/api/ig-img?f=${encodeURIComponent(e.name)}`)
  } catch {
    // Folder doesn't exist or isn't accessible — return empty, HeroGrid uses fallback
    return []
  }
}
