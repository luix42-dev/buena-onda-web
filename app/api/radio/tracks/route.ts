import { NextResponse, type NextRequest } from 'next/server'
import { listRadioTracks } from '@/lib/radio'
import {
  mergeTrackMetadata,
  reorderTracks,
} from '@/lib/radio-metadata'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { readLimitedJson, RequestBodyError, requestErrorResponse } from '@/lib/api/request-security'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const merged = await mergeTrackMetadata(await listRadioTracks())

    return NextResponse.json(merged, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Radio tracks error:', err)
    return NextResponse.json(
      { error: 'Failed to load tracks' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  try {
    const body = await readLimitedJson(request, 262_144) as { orderedKeys?: unknown }
    const orderedKeys = Array.isArray(body?.orderedKeys)
      ? body.orderedKeys.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 1024)
      : []

    if (orderedKeys.length === 0) {
      return NextResponse.json({ error: 'orderedKeys required' }, { status: 400 })
    }

    await reorderTracks(orderedKeys)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof RequestBodyError) return requestErrorResponse(err)
    return NextResponse.json({ error: 'Could not save track order.' }, { status: 500 })
  }
}
