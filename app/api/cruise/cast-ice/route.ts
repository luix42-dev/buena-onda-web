import { NextResponse } from 'next/server'
import { publicWriteGuard } from '@/lib/api/request-security'
import { STUN_ONLY, sanitizeIceServers } from '@/lib/cruise/cast-ice'

export const dynamic = 'force-dynamic'
const guard = publicWriteGuard(12, 12)
const noStore = { 'cache-control': 'no-store' }

/** Short-lived TURN credentials (Cloudflare Realtime TURN) for phone-to-TV casting.
 * Without CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_API_TOKEN it returns STUN only. */
export async function GET(request: Request) {
  const refused = guard(request)
  if (refused) return refused
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID, token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (!keyId || !token) return NextResponse.json({ iceServers: STUN_ONLY, relay: false }, { headers: noStore })
  try {
    const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(2000),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: 3 * 60 * 60 }),
    })
    if (!response.ok) throw new Error(`TURN ${response.status}`)
    // Cloudflare also lists port-53 URLs, which many browsers and networks block; they only add delay.
    const raw = (await response.json() as { iceServers?: unknown }).iceServers
    const list = (Array.isArray(raw) ? raw : [raw]).map(entry => entry && typeof entry === 'object'
      ? { ...entry, urls: ([] as unknown[]).concat((entry as { urls?: unknown }).urls).filter(url => typeof url === 'string' && !/:53(\?|$)/.test(url)) }
      : entry)
    const servers = sanitizeIceServers(list)
    if (!servers) throw new Error('TURN response invalid')
    return NextResponse.json({ iceServers: [...STUN_ONLY, ...servers], relay: true }, { headers: noStore })
  } catch (error) {
    console.warn('[cruise-cast-ice] relay unavailable', String(error).slice(0, 120))
    return NextResponse.json({ iceServers: STUN_ONLY, relay: false }, { headers: noStore })
  }
}
