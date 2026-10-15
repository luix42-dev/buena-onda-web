import { NextRequest, NextResponse } from 'next/server'
import { getHumanRadioMetadata } from '../../../../../lib/human-radio/metadata'
import { HUMAN_RADIO_STATIONS } from '../../../../../lib/human-radio/stations'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const stationId = request.nextUrl.searchParams.get('station') || ''
  if (!HUMAN_RADIO_STATIONS.some(station => station.id === stationId)) {
    return NextResponse.json({ error: 'Unknown station' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } })
  }
  return NextResponse.json(await getHumanRadioMetadata(stationId), { headers: { 'Cache-Control': 'private, no-store' } })
}
