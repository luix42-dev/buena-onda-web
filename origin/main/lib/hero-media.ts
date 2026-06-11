import fs from 'fs'
import path from 'path'

const IMAGE_FILE_RE = /\.(jpg|jpeg|png|webp)$/i
const DEFAULT_HERO_MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'hero')

export function getHeroMediaDir() {
  const configured = process.env.HERO_MEDIA_DIR?.trim()
  if (!configured) return DEFAULT_HERO_MEDIA_DIR
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured)
}

export function isHeroImageFile(fileName: string) {
  return IMAGE_FILE_RE.test(fileName)
}

export function listHeroImageFiles() {
  try {
    const mediaDir = getHeroMediaDir()
    return fs.readdirSync(mediaDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && isHeroImageFile(entry.name))
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}
