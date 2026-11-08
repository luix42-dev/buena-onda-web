export const STUN_ONLY: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

/** Keep only well-formed STUN/TURN entries from the relay provider. */
export function sanitizeIceServers(input: unknown): RTCIceServer[] | null {
  if (!Array.isArray(input) || !input.length || input.length > 8) return null
  const out: RTCIceServer[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return null
    const value = raw as Record<string, unknown>
    const urls = (Array.isArray(value.urls) ? value.urls : [value.urls]).filter(
      (url): url is string => typeof url === 'string' && url.length < 300 && /^(stun|turns?):/i.test(url))
    if (!urls.length || urls.length > 12) return null
    const server: RTCIceServer = { urls }
    if (typeof value.username === 'string' && value.username.length < 600) server.username = value.username
    if (typeof value.credential === 'string' && value.credential.length < 600) server.credential = value.credential
    out.push(server)
  }
  return out
}

/** Phone side: short-lived relay credentials so the stream survives networks where the
 * phone cannot reach the TV directly. Falls back to STUN if the relay is unavailable. */
export async function fetchCastIceServers(timeoutMs = 2500): Promise<RTCIceServer[]> {
  if (typeof fetch === 'undefined') return STUN_ONLY
  const controller = typeof AbortController === 'undefined' ? null : new AbortController()
  const timer = setTimeout(() => controller?.abort(), timeoutMs)
  try {
    const response = await fetch('/api/cruise/cast-ice', { cache: 'no-store', credentials: 'same-origin', signal: controller?.signal })
    if (!response.ok) return STUN_ONLY
    const body = await response.json() as { iceServers?: unknown }
    return sanitizeIceServers(body.iceServers) ?? STUN_ONLY
  } catch { return STUN_ONLY } finally { clearTimeout(timer) }
}
