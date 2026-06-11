import type { Track } from '@/lib/radio'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type PlayerTrackRow = {
  key: string
  title: string | null
  position: number | null
}

function trackTimestamp(track: Track) {
  return track.lastModified ? Date.parse(track.lastModified) || 0 : 0
}

function trackKey(track: Track): track is Track & { key: string } {
  return typeof track.key === 'string' && track.key.length > 0
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^\d{10,}-/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function defaultTitleForKey(key: string) {
  const fileName = key.split('/').pop() ?? key
  return titleFromFileName(fileName) || fileName
}

export async function mergeTrackMetadata(rawTracks: Track[]): Promise<Track[]> {
  if (rawTracks.length === 0) return rawTracks

  const keys = rawTracks.filter(trackKey).map(track => track.key)
  if (keys.length === 0) return rawTracks.map((track, index) => ({ ...track, position: index }))

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('player_tracks')
    .select('key,title,position')
    .in('key', keys)

  if (error) throw error

  const metadataByKey = new Map((data ?? []).map((row: PlayerTrackRow) => [row.key, row]))

  return rawTracks
    .map((track, index) => {
      if (!trackKey(track)) return { ...track, position: index }

      const metadata = metadataByKey.get(track.key)
      const title = metadata?.title?.trim()

      return {
        ...track,
        title: title || track.title,
        position: metadata?.position ?? Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => {
      const positionDelta = (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
      if (positionDelta !== 0) return positionDelta
      return trackTimestamp(b) - trackTimestamp(a)
    })
}

export async function registerTrack(key: string, title?: string | null) {
  const trackTitle = title?.trim() || defaultTitleForKey(key)
  const supabase = createServiceRoleClient()

  const { data: existing, error: existingError } = await supabase
    .from('player_tracks')
    .select('key')
    .eq('key', key)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    const { error } = await supabase
      .from('player_tracks')
      .update({ title: trackTitle, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (error) throw error
    return
  }

  const { data: maxRow, error: maxError } = await supabase
    .from('player_tracks')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxError) throw maxError

  const nextPosition = typeof maxRow?.position === 'number' ? maxRow.position + 1 : 0
  const { error } = await supabase
    .from('player_tracks')
    .insert({ key, title: trackTitle, position: nextPosition })

  if (error) throw error
}

export async function renameTrackTitle(key: string, title: string) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('player_tracks')
    .upsert(
      { key, title: title.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )

  if (error) throw error
}

export async function reorderTracks(orderedKeys: string[]) {
  const supabase = createServiceRoleClient()
  const { data, error: existingError } = await supabase
    .from('player_tracks')
    .select('key')
    .in('key', orderedKeys)

  if (existingError) throw existingError

  const existingKeys = new Set((data ?? []).map((row: Pick<PlayerTrackRow, 'key'>) => row.key))

  for (let index = 0; index < orderedKeys.length; index += 1) {
    const key = orderedKeys[index]
    const timestamp = new Date().toISOString()
    const { error } = existingKeys.has(key)
      ? await supabase
        .from('player_tracks')
        .update({ position: index, updated_at: timestamp })
        .eq('key', key)
      : await supabase
        .from('player_tracks')
        .insert({
          key,
          title: defaultTitleForKey(key),
          position: index,
          updated_at: timestamp,
        })

    if (error) throw error
  }
}
