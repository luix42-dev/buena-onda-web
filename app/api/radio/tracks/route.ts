import { NextResponse, type NextRequest } from 'next/server'
import { listRadioTracks } from '@/lib/radio'
import {
  mergeTrackMetadata,
  reorderTracks,
} from '@/lib/radio-metadata'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const merged = await mergeTrackMetadata(await listRadioTracks())

    return NextResponse.json(merged, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load tracks'
    console.error('Radio tracks error:', err)
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!isStudioAuthorized(request)) {
    return unauthorizedStudioResponse()
  }

  try {
    const body = await request.json()
    const orderedKeys = Array.isArray(body?.orderedKeys)
      ? body.orderedKeys.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : []

    if (orderedKeys.length === 0) {
      return NextResponse.json({ error: 'orderedKeys required' }, { status: 400 })
    }

    await reorderTracks(orderedKeys)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save track order.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
