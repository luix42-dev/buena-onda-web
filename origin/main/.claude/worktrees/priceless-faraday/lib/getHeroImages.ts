import fs from 'fs'
import path from 'path'

function scanForImages(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...scanForImages(fullPath))
      } else if (
        entry.isFile() &&
        /\.(jpg|jpeg|png|webp)$/i.test(entry.name) &&
        path.basename(dir) === 'media'
      ) {
        const publicPath = fullPath
          .replace(path.join(process.cwd(), 'public'), '')
          .replace(/\\/g, '/')
        results.push(publicPath)
      }
    }
  } catch {
    // Folder doesn't exist yet — return empty
  }
  return results
}

export function getHeroImages(): string[] {
  const root = path.join(process.cwd(), 'public', 'instagram-raw')
  return scanForImages(root)
}
