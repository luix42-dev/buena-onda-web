/** Keep catalog/playlist identities unchanged while resolving this player's CORS redirect. */
export function cruiseAudioSource(source: string) {
  try {
    const url = new URL(source)
    const id = /\/tracks\/(\d+)\.mp3$/.exec(url.pathname)?.[1]
    if (url.protocol === 'https:' && url.hostname === 'veridian.club' && id) {
      return `/api/cruise/veridian-audio?track=${id}`
    }
  } catch { /* Relative and other station sources retain their existing playback path. */ }
  return source
}
