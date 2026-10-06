import type { CruiseRadioMood, CruiseStation } from './types'

export const CRUISE_STATIONS = [
  {
    id: 'buena-onda-radio',
    name: 'Buena Onda Radio',
    enabled: true,
    source: '/api/radio/tracks',
    provider: 'buena-onda',
    rightsStatus: 'owned',
    playback: 'playlist',
    moods: ['miami-local'],
  },
  {
    id: 'jolt-radio', name: 'Jolt Radio', provider: 'jolt',
    // Published as Jolt's desktop/mobile ListenAction on its official homepage.
    enabled: true, source: 'https://streamer.radio.co/sd8ab6b5aa/listen', rightsStatus: 'approved', playback: 'stream',
    moods: ['miami-local'], externalUrl: 'https://www.joltradio.org/',
  },
  {
    // NTS publishes these exact URLs for custom media players. This is direct
    // listener playback, not permission to record, restream or sponsor NTS audio.
    id: 'nts-radio', name: 'NTS 1', provider: 'nts',
    enabled: true, source: 'https://stream-relay-geo.ntslive.net/stream?client=direct', rightsStatus: 'approved', playback: 'stream',
    moods: ['leftfield', 'global'], externalUrl: 'https://www.nts.live/radio',
  },
  {
    id: 'nts-radio-2', name: 'NTS 2', provider: 'nts',
    enabled: true, source: 'https://stream-relay-geo.ntslive.net/stream2?client=direct', rightsStatus: 'approved', playback: 'stream',
    moods: ['leftfield', 'global'], externalUrl: 'https://www.nts.live/radio',
  },
  {
    id: 'poolsuite', name: 'Poolsuite', provider: 'poolsuite',
    enabled: false, source: null, rightsStatus: 'permission-required', playback: 'external',
    moods: ['poolside'], externalUrl: 'https://poolsuite.net/',
    unavailableReason: 'Listen on Poolsuite',
  },
] as const satisfies readonly CruiseStation[]

export const DEFAULT_CRUISE_STATION = CRUISE_STATIONS[0]

export const CRUISE_RADIO_MOODS: readonly { id: CruiseRadioMood; name: string }[] = [
  { id: 'miami-local', name: 'Miami Local' },
  { id: 'leftfield', name: 'Leftfield' },
  { id: 'poolside', name: 'Poolside' },
  { id: 'night-drive', name: 'Night Drive' },
  { id: 'tropical', name: 'Tropical' },
  { id: 'ambient', name: 'Ambient' },
  { id: 'global', name: 'Global' },
  { id: 'guest', name: 'Guest' },
]

export function canPlayCruiseStation(station: CruiseStation): boolean {
  return station.enabled &&
    (station.rightsStatus === 'owned' || station.rightsStatus === 'approved') &&
    (station.playback === 'playlist' || station.playback === 'stream') &&
    typeof station.source === 'string' && station.source.trim().length > 0
}

export function getCruiseStation(id: string): CruiseStation | undefined {
  return CRUISE_STATIONS.find(station => station.id === id)
}

export function getCruiseStationsForMood(mood: CruiseRadioMood | 'all'): readonly CruiseStation[] {
  return mood === 'all' ? CRUISE_STATIONS : CRUISE_STATIONS.filter(station =>
    (station.moods as readonly CruiseRadioMood[]).includes(mood))
}
