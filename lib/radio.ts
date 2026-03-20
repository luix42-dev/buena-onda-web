export interface Track {
  title:  string
  artist: string
  src:    string   // path to audio file or external stream URL
  cover?: string   // optional cover art
}

/**
 * Add tracks here as audio files become available.
 * Drop MP3s into /public/audio/ and reference them as '/audio/filename.mp3'
 * Or use external URLs (SoundCloud direct stream, etc.)
 */
export const playlist: Track[] = [
  // Example:
  // {
  //   title:  'Onda Tropical Vol. 1',
  //   artist: 'Buena Onda',
  //   src:    '/audio/onda-tropical-01.mp3',
  // },
]
