import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit'
import { createServiceClient } from '@/lib/supabase/server'
import { getR2Config, listRadioTracks } from '@/lib/radio'
import {
  mergeTrackMetadata,
  registerTrack,
  renameTrackTitle,
} from '@/lib/radio-metadata'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export const dynamic = 'force-dynamic'

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

export async function POST(request: NextRequest) {
  if (!isStudioAuthorized(request)) return unauthorizedStudioResponse()

  const { key, fileName, displayName } = await request.json()
  const identifier = typeof key === 'string' && key.trim().length > 0 ? key : fileName

  if (!identifier) {
    return NextResponse.json({ error: 'key/fileName required' }, { status: 400 })
  }

  const trackKey = await resolveTrackKey(identifier)
  if (!trackKey) {
    void logAudit({
      subsystem: 'player',
      action: 'create',
      item_type: 'track',
      item_key: typeof identifier === 'string' ? identifier : undefined,
      success: false,
      error_message: 'Track not found',
      metadata: { fileName, displayName },
    })
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  const title = typeof displayName === 'string' ? displayName : typeof fileName === 'string' ? fileName : trackKey
  try {
    await registerTrack(trackKey, title)
    void logAudit({
      subsystem: 'player',
      action: 'create',
      item_type: 'track',
      item_key: trackKey,
      success: true,
      metadata: { title },
    })
    return NextResponse.json({ ok: true, key: trackKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not register track.'
    void logAudit({
      subsystem: 'player',
      action: 'create',
      item_type: 'track',
      item_key: trackKey,
      success: false,
      error_message: message,
      metadata: { title },
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
    void logAudit({
      subsystem: 'player',
      action: 'rename',
      item_type: 'track',
      item_key: typeof identifier === 'string' ? identifier : undefined,
      success: false,
      error_message: 'Track not found',
      metadata: { displayName },
    })
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  try {
    await renameTrackTitle(trackKey, String(displayName).trim())
    void logAudit({
      subsystem: 'player',
      action: 'rename',
      item_type: 'track',
      item_key: trackKey,
      success: true,
      metadata: { displayName: String(displayName).trim() },
    })
    return NextResponse.json({ ok: true, key: trackKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save track title.'
    void logAudit({
      subsystem: 'player',
      action: 'rename',
      item_type: 'track',
      item_key: trackKey,
      success: false,
      error_message: message,
      metadata: { displayName },
    })
    return NextResponse.json({ error: message }, { status: 500 })
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
    void logAudit({
      subsystem: 'player',
      action: 'delete',
      item_type: 'track',
      item_key: trackKey,
      success: false,
      error_message: 'Invalid key',
    })
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
    void logAudit({
      subsystem: 'player',
      action: 'delete',
      item_type: 'track',
      item_key: trackKey,
      success: false,
      error_message: message,
      metadata: { stage: 'r2' },
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { error } = await supabase.from('player_tracks').delete().eq('key', trackKey)
  if (error) {
    void logAudit({
      subsystem: 'player',
      action: 'delete',
      item_type: 'track',
      item_key: trackKey,
      success: false,
      error_message: error.message,
      metadata: { stage: 'metadata' },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  void logAudit({
    subsystem: 'player',
    action: 'delete',
    item_type: 'track',
    item_key: trackKey,
    success: true,
  })
  return NextResponse.json({ ok: true })
}
