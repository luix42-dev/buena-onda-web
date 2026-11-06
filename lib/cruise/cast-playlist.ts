export type CastPlaylistPosition = { trackId: string; position: number }
export type CastPlaylistTrack = { src: string; title: string; artist: string; sourcePage?: string }

/** An opaque catalog identity, never a sender-supplied playback URL. */
export function playlistTrackId(src: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < src.length; index++) {
    first = Math.imul(first ^ src.charCodeAt(index), 0x01000193)
    second = Math.imul(second ^ src.charCodeAt(index), 0x85ebca6b)
  }
  return `track-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}

export function parsePlaylistPosition(value: unknown): CastPlaylistPosition | undefined {
  if (!value || typeof value !== 'object') return undefined
  const cursor = value as CastPlaylistPosition
  if (typeof cursor.trackId !== 'string' || !/^track-[a-f0-9]{16}$/.test(cursor.trackId)
    || !Number.isFinite(cursor.position) || cursor.position < 0 || cursor.position > 86400) return undefined
  return { trackId: cursor.trackId, position: cursor.position }
}

export function resolvePlaylistPosition(tracks: readonly Pick<CastPlaylistTrack, 'src'>[], value: unknown) {
  const cursor = parsePlaylistPosition(value)
  if (!cursor) return null
  const index = tracks.findIndex(track => playlistTrackId(track.src) === cursor.trackId)
  return index < 0 ? null : { index, position: cursor.position }
}

/** Metadata from the receiver is display-only; resume resolves its ID against our own catalog. */
export function parsePlaylistTrack(value: unknown, cursor?: CastPlaylistPosition): CastPlaylistTrack | null {
  if (!cursor || !value || typeof value !== 'object') return null
  const track = value as CastPlaylistTrack
  if (typeof track.src !== 'string' || track.src.length > 4096
    || typeof track.title !== 'string' || track.title.length > 500
    || typeof track.artist !== 'string' || track.artist.length > 500
    || playlistTrackId(track.src) !== cursor.trackId) return null
  try {
    const url = new URL(track.src, 'https://buenaondalifestyle.com')
    if (url.protocol !== 'https:' || url.username || url.password) return null
  } catch { return null }
  return { src: track.src, title: track.title, artist: track.artist,
    ...(typeof track.sourcePage === 'string' && track.sourcePage.length < 2048 ? { sourcePage: track.sourcePage } : {}) }
}
