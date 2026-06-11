/**
 * Merge class names (no external dep needed).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format episode duration from seconds to "Xhr Xmin"
 */
export function formatDuration(seconds: number): string {
  const h   = Math.floor(seconds / 3600)
  const m   = Math.floor((seconds % 3600) / 60)
  const s   = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

/**
 * Format a date string to "Month YYYY"
 */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(iso)
  )
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Truncate text to a max character count.
 */
export function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '…'
}
