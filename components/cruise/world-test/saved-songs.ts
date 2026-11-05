import type { CruiseStation } from '@/lib/cruise/types'

export const SONG_LIBRARY_KEY = 'buena-onda-world-test-songs-v1'
export const SONG_LIBRARY_LIMIT = 200
export type SongLibraryAudio = {
  station: CruiseStation; trackTitle: string; available: boolean; loading: boolean; error: string | null
}
export type SavedSong = {
  label: string
  stationId: 'buena-onda-radio'
  stationName: 'Buena Onda Radio'
  metadataSource: '/api/radio/tracks'
  savedAt: string
}

/** The hook exposes a catalog label, not separate artist/title or a stable song ID. */
export function currentSong(audio: SongLibraryAudio, savedAt = new Date().toISOString()): SavedSong | null {
  const { station, trackTitle } = audio
  if (station.id !== 'buena-onda-radio' || station.provider !== 'buena-onda' || station.playback !== 'playlist'
    || station.rightsStatus !== 'owned' || station.source !== '/api/radio/tracks'
    || !audio.available || audio.loading || audio.error || !trackTitle.trim() || trackTitle === station.name) return null
  return { label: trackTitle, stationId: 'buena-onda-radio', stationName: 'Buena Onda Radio',
    metadataSource: '/api/radio/tracks', savedAt }
}

function isSavedSong(value: unknown): value is SavedSong {
  if (!value || typeof value !== 'object') return false
  const song = value as Partial<SavedSong>
  return song.stationId === 'buena-onda-radio' && song.stationName === 'Buena Onda Radio'
    && song.metadataSource === '/api/radio/tracks' && typeof song.label === 'string'
    && song.label.trim().length > 0 && song.label.length <= 2000
    && typeof song.savedAt === 'string' && Number.isFinite(Date.parse(song.savedAt))
}

export function readSavedSongs(raw: string | null): SavedSong[] {
  if (raw === null) return []
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1
    || !('songs' in data) || !Array.isArray(data.songs)) throw new Error('Invalid saved song library')
  const seen = new Set<string>()
  return data.songs.filter(isSavedSong).filter(song => {
    if (seen.has(song.label)) return false
    seen.add(song.label)
    return true
  }).slice(0, SONG_LIBRARY_LIMIT).map(song => ({ label: song.label, stationId: song.stationId,
    stationName: song.stationName, metadataSource: song.metadataSource, savedAt: song.savedAt }))
}

export function addSavedSong(songs: readonly SavedSong[], song: SavedSong): SavedSong[] {
  if (!isSavedSong(song)) throw new Error('Track information is unavailable')
  if (songs.some(saved => saved.label === song.label)) return [...songs]
  if (songs.length >= SONG_LIBRARY_LIMIT) throw new Error('Your library is full. Remove a song before saving another.')
  return [song, ...songs]
}

export function writeSavedSongs(songs: readonly SavedSong[]): string {
  return JSON.stringify({ version: 1, songs })
}
