import type { CruiseStation } from './types'

/** Neon Run: an imaginary retrowave/cyberpunk world (Syd Mead futurism under a smog sunset).
 * Everything here is original: no film characters, logos, props or locations are reproduced. */
export const NEON_WORLD = { id: 'neon', label: 'NEON RUN', subtitle: 'RETROWAVE / IMAGINARY CITY', district: 'Neon Avenue 9' } as const

/** Only these stations play in Neon Run. Nightride FM publishes these listener streams
 * (CORS open, so the live spectrum works). Public listener URLs are not rebroadcast rights. */
export const NEON_STATIONS: readonly CruiseStation[] = [
  { id: 'nightride', name: 'Nightride FM', provider: 'custom', enabled: true, source: 'https://stream.nightride.fm/nightride.mp3', playback: 'stream', rightsStatus: 'public-stream', moods: ['night-drive'], externalUrl: 'https://nightride.fm/' },
  { id: 'darksynth', name: 'Darksynth', provider: 'custom', enabled: true, source: 'https://stream.nightride.fm/darksynth.mp3', playback: 'stream', rightsStatus: 'public-stream', moods: ['night-drive'], externalUrl: 'https://nightride.fm/stations/darksynth' },
  { id: 'chillsynth', name: 'Chillsynth', provider: 'custom', enabled: true, source: 'https://stream.nightride.fm/chillsynth.mp3', playback: 'stream', rightsStatus: 'public-stream', moods: ['night-drive', 'ambient'], externalUrl: 'https://nightride.fm/stations/chillsynth' },
  { id: 'datawave', name: 'Datawave', provider: 'custom', enabled: true, source: 'https://stream.nightride.fm/datawave.mp3', playback: 'stream', rightsStatus: 'public-stream', moods: ['night-drive'], externalUrl: 'https://nightride.fm/stations/datawave' },
  { id: 'spacesynth', name: 'Spacesynth', provider: 'custom', enabled: true, source: 'https://stream.nightride.fm/spacesynth.mp3', playback: 'stream', rightsStatus: 'public-stream', moods: ['night-drive'], externalUrl: 'https://nightride.fm/stations/spacesynth' },
]

/** VESPER is an original holographic host, not any film character. Lines are house ads for
 * Buena Onda campaigns; each is short enough to whisper over the radio while it ducks. */
export const HOST_NAME = 'VESPER'
export const HOST_LINES: readonly { campaignId: string; text: string; cta: string; destination: string }[] = [
  { campaignId: 'buena-onda', text: 'You look like someone who stays for one more song.', cta: 'Buena Onda Radio', destination: '/radio' },
  { campaignId: 'vice-nights', text: 'After dark, the city remembers your name. Vice Nights.', cta: 'Vice Nights', destination: '/events' },
  { campaignId: 'onda-tropical', text: 'Somewhere it is still summer. Onda Tropical.', cta: 'Onda Tropical', destination: '/radio' },
  { campaignId: 'natsu-service', text: 'Late service. Warm sound. Natsu is open all night.', cta: 'Natsu Service', destination: '/radio' },
  { campaignId: 'buena-onda', text: 'Good taste takes detours. Take this one.', cta: 'Buena Onda Themes', destination: '/themes' },
  { campaignId: 'buena-onda-motel', text: 'Buena Onda Motel. Take the long way home.', cta: 'Buena Onda Motel', destination: '/cruise?place=tideway' },
  // Look v2 Retrowave: original lines asking you to stay. Written for VESPER; no film dialogue or taglines.
  { campaignId: 'buena-onda', text: "Don't go yet. The night hasn't finished playing.", cta: 'Stay on Buena Onda Radio', destination: '/radio' },
  { campaignId: 'buena-onda', text: 'Stay a little longer. I saved you the next song.', cta: 'Stay for one song', destination: '/radio' },
  { campaignId: 'vice-nights', text: 'Everyone else went home. You and I have the whole city. Vice Nights.', cta: 'Vice Nights', destination: '/events' },
  { campaignId: 'buena-onda', text: 'One more mile. The skyline looks better with you in it.', cta: 'Keep driving', destination: '/radio' },
]
/** Retrowave order: alternate a reason to stay with a house ad, so she never reads as a sales loop. */
export const RETRO_LINE_ORDER = [6, 0, 7, 1, 8, 3, 9, 2, 4, 5] as const

/** Seconds between appearances, and how long one lasts. */
export const HOST_TIMING = { firstAfter: 14, every: 38, jitter: 14, stay: 7.5 }
