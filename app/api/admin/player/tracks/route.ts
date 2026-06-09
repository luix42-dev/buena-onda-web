import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getR2Config, listRadioTracks } from '@/lib/radio'
import {
  mergeTrackMetadata,
  RADIO_META_KV_MISSING_MESSAGE,
  renameTrackTitle,
} from '@/lib/radio-metadata'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export const dynamic = 'force-dynamic'

const SETTINGS_KEY = 'track_labels'

async function getLabels(supabase: Awaited<ReturnType<typeof createServiceClient>>): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single()
  if (!data?.value || typeof data.value !== 'object') return {}
  return data.value as Record<string, string>
}

async function resolveTrackKey(identifier: string) {
  const trimmed = identifier.trim()
  if (!trimmed) return null

  const tracks = await listRadioTracks()
  const match = tracks.find(track => track.key === trimmed || track.fileName === trimmed)
  return match?.key ?? null
}

export async function GET(request: NextRequest) {
  if (!isStudioAuthorized(request)) return unauthorizedStudioResponse()

  const tracks = await mergeTrackMetadata(await listRadioTracks())
  const labels = Object.fromEntries(
    tracks
      .filter((track): track is typeof track & { key: string } => typeof track.key === 'string' && track.key.length > 0)
      .map(track => [track.key, track.title])
  )

  return NextResponse.json(labels)
}

export async function PATCH(request: NextRequest) {
  if (!isStudioAuthorized(request)) return unauthorizedStudioResponse()

  const { key, fileName, displayName } = await request.json()
  const identifier = typeof key === 'string' && key.trim().length > 0 ? key : fileName

  if (!identifier || !displayName) {
    return NextResponse.json({ error: 'key/fileName and displayName required' }, { status: 400 })
  }

  const trackKey = await resolveTrackKey(identifier)
  if (!trackKey) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  try {
    await renameTrackTitle(trackKey, String(displayName).trim())
    return NextResponse.json({ ok: true, key: trackKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save track title.'
    const status = message === RADIO_META_KV_MISSING_MESSAGE ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  if (!isStudioAuthorized(request)) return unauthorizedStudioResponse()

  const { key } = await request.json()
  if (typeof key !== 'string') {
    return NextResponse.json({ error: 'key required' }, { status: 400 })
  }

  const trackKey = key.trim()

  if (
    !trackKey.startsWith('audio/') ||
    trackKey === 'audio/' ||
    trackKey.includes('..') ||
    trackKey.includes('\\') ||
    trackKey.startsWith('/')
  ) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  console.log('[player] deleteTrack: attempting delete', { key: trackKey })

  const supabase = await createServiceClient()
  const { client, bucketName } = getR2Config()

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: trackKey,
    }))
    console.log('[player] deleteTrack: delete succeeded', { key: trackKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete track from R2.'
    console.error('[player] deleteTrack: delete failed', { key: trackKey, message })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const labels = await getLabels(supabase)
  if (labels[trackKey]) {
    delete labels[trackKey]
    await supabase.from('site_settings').upsert({ key: SETTINGS_KEY, value: labels }, { onConflict: 'key' })
  }

  return NextResponse.json({ ok: true })
}
