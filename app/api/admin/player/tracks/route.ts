import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listRadioTracks } from '@/lib/radio'
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

  const { fileName } = await request.json()
  if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 })

  const supabase = await createServiceClient()

  const { error: storageError } = await supabase.storage.from('audio').remove([fileName])
  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  const labels = await getLabels(supabase)
  if (labels[fileName]) {
    delete labels[fileName]
    await supabase.from('site_settings').upsert({ key: SETTINGS_KEY, value: labels }, { onConflict: 'key' })
  }

  return NextResponse.json({ ok: true })
}
