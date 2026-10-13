import { NextRequest, NextResponse } from 'next/server'
import { getCruiseNowPlaying } from '../../../../lib/real-miami/now-playing'
import { MIAMI_CRUISE_STATIONS } from '../../../../lib/real-miami/stations'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const station = request.nextUrl.searchParams.get('station') || ''
  if (!MIAMI_CRUISE_STATIONS.some(s => s.id === station)) {
    return NextResponse.json({ error: 'Unknown station' }, { status: 400 })
  }
  return NextResponse.json(await getCruiseNowPlaying(station), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
