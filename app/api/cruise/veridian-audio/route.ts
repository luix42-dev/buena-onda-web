import { NextResponse } from 'next/server'
import tracks from '@/public/cruise/radio/veridian-tracks.json'
import { publicWriteGuard } from '@/lib/api/request-security'

export const dynamic = 'force-dynamic'
const guard = publicWriteGuard(90, 60)
const headers = { 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
const catalog = new Map(tracks.map(track => [/\/tracks\/(\d+)\.mp3$/.exec(new URL(track.src).pathname)?.[1], track.src]))

/** Resolve only known official tracks. Audio still streams directly from Veridian's host. */
export async function GET(request: Request) {
  const refused = guard(request)
  if (refused) return refused
  const id = new URL(request.url).searchParams.get('track') || ''
  const source = /^\d{1,12}$/.test(id) ? catalog.get(id) : null
  if (!source) return NextResponse.json({ error: 'Unknown track' }, { status: 404, headers })
  try {
    const response = await fetch(source, { redirect: 'manual', cache: 'no-store',
      signal: AbortSignal.timeout(8000), headers: { range: 'bytes=0-0' } })
    const location = response.headers.get('location')
    await response.body?.cancel()
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) throw new Error('Missing audio redirect')
    const target = new URL(location)
    if (target.protocol !== 'https:' || target.username || target.password
      || !['bzglfiles.s3.ca-central-1.amazonaws.com', 'bzglfiles.s3.amazonaws.com'].includes(target.hostname)) throw new Error('Unexpected audio host')
    return new NextResponse(null, { status: 307, headers: { ...headers, location: target.href } })
  } catch {
    return NextResponse.json({ error: 'Veridian audio is temporarily unavailable' }, { status: 502, headers })
  }
}
