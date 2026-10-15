import { MIAMI_CRUISE_STATIONS } from '../real-miami/stations'
import type { CruiseStation } from '../real-miami/types'

export interface StationDetails {
  city: string
  country: string
  genres: readonly string[]
  description: string
  website: string
  permissionNote: string
}

const publicListenerNote = 'Existing direct listener stream. Public availability does not establish embedding, commercial, recording or redistribution rights; review before launch.'
const externalNote = 'Listen on the station website. Third-party playback and metadata permissions have not been established.'

/** Editorial navigation only: no behavioral ranking or personalized selection. */
export const STATION_DETAILS: Readonly<Record<string, StationDetails>> = {
  'buena-onda-radio': { city: 'Miami', country: 'United States', genres: ['Eclectic'], description: 'The existing Buena Onda music selection.', website: '/radio', permissionNote: 'Existing owned catalog designation retained; underlying recording licenses still require launch review.' },
  'jolt-radio': { city: 'Miami', country: 'United States', genres: ['Eclectic', 'Electronic'], description: 'Miami community radio with resident shows and guest selectors.', website: 'https://www.joltradio.org/', permissionNote: publicListenerNote },
  'nts-radio': { city: 'London', country: 'United Kingdom', genres: ['Eclectic', 'Experimental'], description: 'NTS channel one: resident and guest broadcasts spanning music scenes.', website: 'https://www.nts.live/', permissionNote: publicListenerNote },
  'nts-radio-2': { city: 'London', country: 'United Kingdom', genres: ['Eclectic', 'Experimental'], description: 'NTS channel two: a second live channel of resident and guest broadcasts.', website: 'https://www.nts.live/', permissionNote: publicListenerNote },
  'poolsuite': { city: 'Worldwide', country: 'Worldwide', genres: ['Eclectic'], description: 'An independent online listening destination; opens in its own player.', website: 'https://poolsuite.net/', permissionNote: externalNote },
  'rinse-france': { city: 'Paris', country: 'France', genres: ['Electronic'], description: 'The French channel of Rinse, with DJs and club music broadcasts.', website: 'https://www.rinse.fm/channels/france', permissionNote: publicListenerNote },
  'the-lot-radio': { city: 'New York', country: 'United States', genres: ['Electronic', 'Eclectic'], description: 'Independent radio broadcasting DJ sets from Brooklyn.', website: 'https://www.thelotradio.com/', permissionNote: publicListenerNote },
  'kiosk-radio': { city: 'Brussels', country: 'Belgium', genres: ['Electronic', 'Eclectic'], description: 'Community radio broadcasting from a wooden kiosk in Brussels.', website: 'https://www.kioskradio.com/', permissionNote: 'Official player stream returned HTTP 404 during the audit. Opens externally until a working source is verified. ' + publicListenerNote },
  'dublab': { city: 'Los Angeles', country: 'United States', genres: ['Experimental', 'Eclectic'], description: 'Nonprofit radio exploring adventurous music and creative communities.', website: 'https://www.dublab.com/', permissionNote: publicListenerNote },
  'wdna': { city: 'Miami', country: 'United States', genres: ['Jazz', 'Latin'], description: 'Miami public radio with jazz programming and local music culture.', website: 'https://wdna.org/how-to-listen/', permissionNote: externalNote },
  'depa-radio': { city: 'Mexico City', country: 'Mexico', genres: ['Electronic', 'Eclectic'], description: 'Broadcasts and DJ sets from Departamento Studio Bar in Mexico City.', website: 'https://depa.radio/', permissionNote: externalNote },
  'sucker-free-radio': { city: 'Unverified', country: 'Unverified', genres: ['Funk', 'Hip Hop'], description: 'Sucker Free Radio show archive. Live station identity and a current official stream remain unverified.', website: 'https://www.mixcloud.com/SuckerFreeRadio/', permissionNote: 'Identified show archive only; confirm this is the intended station before integrating any live feed. ' + externalNote },
  'radio-fg': { city: 'Paris', country: 'France', genres: ['Electronic'], description: 'French radio focused on DJs and electronic music.', website: 'https://www.radiofg.com/', permissionNote: externalNote },
  'kexp': { city: 'Seattle', country: 'United States', genres: ['Eclectic', 'Rock'], description: 'Listener-powered radio with DJ selected music, shows and live sessions.', website: 'https://www.kexp.org/', permissionNote: 'Official third-party player URLs exist. Investigated only; no stream added. Commercial integration still needs review.' },
  'radio-alhara': { city: 'Worldwide', country: 'Palestine', genres: ['Experimental', 'Eclectic'], description: 'Radio alHara shares community broadcasts and an extensive program archive.', website: 'https://radioalhara.net/', permissionNote: externalNote },
  'radio-nopal': { city: 'Mexico City', country: 'Mexico', genres: ['Eclectic'], description: 'Radio Nopal is a candidate for editorial review; current technical availability is unverified.', website: 'https://radionopal.com/', permissionNote: externalNote },
  'kchung': { city: 'Los Angeles', country: 'United States', genres: ['Experimental', 'Eclectic'], description: 'Community radio with an independently programmed broadcast schedule.', website: 'https://www.kchungradio.org/', permissionNote: externalNote },
  'kpiss': { city: 'New York', country: 'United States', genres: ['Eclectic'], description: 'Independent radio candidate; browse its own player and programming.', website: 'https://kpiss.fm/', permissionNote: externalNote },
  'wfmu': { city: 'Jersey City', country: 'United States', genres: ['Eclectic', 'Experimental'], description: 'Listener-supported freeform radio with independent programmers.', website: 'https://www.wfmu.org/', permissionNote: externalNote },
}

const externalIds = ['wdna', 'depa-radio', 'sucker-free-radio', 'radio-fg', 'kexp', 'radio-alhara', 'radio-nopal', 'kchung', 'kpiss', 'wfmu'] as const

/** Separate experimental catalog; never mutates either successful Cruise catalog. */
export const HUMAN_RADIO_STATIONS: readonly CruiseStation[] = [
  ...MIAMI_CRUISE_STATIONS.map(station => station.id === 'kiosk-radio'
    ? { ...station, enabled: false, source: null, playback: 'external' as const, unavailableReason: 'Official stream unavailable; listen on Kiosk Radio' }
    : station),
  ...externalIds.map(id => ({ id, name: ({ wdna: 'WDNA', 'depa-radio': 'Depa.Radio', 'sucker-free-radio': 'Sucker Free Radio', 'radio-fg': 'Radio FG', kexp: 'KEXP', 'radio-alhara': 'Radio alHara', 'radio-nopal': 'Radio Nopal', kchung: 'KCHUNG', kpiss: 'KPISS', wfmu: 'WFMU' } as const)[id], enabled: false, source: null, provider: 'custom' as const, rightsStatus: 'external-only' as const, playback: 'external' as const, moods: ['global'] as const, externalUrl: STATION_DETAILS[id].website, unavailableReason: 'Listen on the station website' })),
]
