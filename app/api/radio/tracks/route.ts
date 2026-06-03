import { NextResponse } from 'next/server'
import { listRadioTracks } from '@/lib/radio'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET() {
  try {
    const tracks = await listRadioTracks()
    return NextResponse.json(tracks, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load tracks'
    console.error('R2 audio list error:', err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
