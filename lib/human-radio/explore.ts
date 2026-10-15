import type { Discovery } from './finds'

/** The caller supplies only currently eligible stations. No history is read. */
export function randomStation(ids: readonly string[], current: string, random = Math.random): string | null {
  const choices = [...new Set(ids)].filter(id => id !== current)
  if (!choices.length) return ids[0] ?? null
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))]
}

export type RadioSharePath = '/cruise/human-radio' | '/cruise/experience'
export function stationShareUrl(origin: string, stationId: string, path: RadioSharePath = '/cruise/human-radio') {
  const safePath = path === '/cruise/experience' ? path : '/cruise/human-radio'
  const url = new URL(safePath, origin)
  url.search = new URLSearchParams({ station: stationId }).toString()
  return url.href
}

const xml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
/** Original vector typography; no artwork or recorded station audio is included. */
export function discoveryCard(item: Discovery): string {
  const title = xml(item.title.slice(0, 58)), artist = xml((item.artist || item.show || 'A human-selected broadcast').slice(0, 64))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#15362d"/><path d="M0 860H1080M0 880H1080" stroke="#edac7c" opacity=".5"/><text x="76" y="116" fill="#f5ecdc" font-family="Georgia,serif" font-style="italic" font-size="45">Buena Onda Cruise</text><text x="76" y="190" fill="#edac7c" font-family="Arial,sans-serif" font-size="18" letter-spacing="4">FOUND ON THE LONG WAY HOME</text><text x="76" y="440" fill="#f5ecdc" font-family="Georgia,serif" font-size="34">${title}</text><text x="76" y="510" fill="#edac7c" font-family="Arial,sans-serif" font-size="27">${artist}</text><text x="76" y="650" fill="#f5ecdc" font-family="Arial,sans-serif" font-size="24">${xml(item.stationName.slice(0, 60))}</text><text x="76" y="700" fill="#b8c9ba" font-family="Arial,sans-serif" font-size="18">${xml(item.savedAt.slice(0, 10))} · ${item.kind === 'show' ? 'SHOW BOOKMARK' : 'TRACK DISCOVERY'}</text><text x="76" y="960" fill="#f5ecdc" font-family="Arial,sans-serif" font-size="22" letter-spacing="2">NO ALGORITHMS. JUST FREQUENCIES.</text></svg>`
}
