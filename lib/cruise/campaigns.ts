import type { CruiseAdCreative, CruiseAdFormat, CruiseCampaign } from './types'

const creative = (
  eyebrow: string,
  headline: string,
  footer: string,
  background: `#${string}`,
  foreground: `#${string}`,
  accent: `#${string}`,
): Readonly<Record<CruiseAdFormat, CruiseAdCreative>> => ({
  billboard: { eyebrow, headline, footer, background, foreground, accent },
  wall: { eyebrow, headline, footer, background, foreground, accent },
  poster: { eyebrow, headline, footer, background, foreground, accent },
})

/** Only the Buena Onda world lives in Cruise (Luis, 2026-10-22): Buena Onda itself, its own projects (Vice Nights,
 * Onda Tropical, Natsu Service, Open Decks) and products from the Buena Onda catalog. No outside brands: catalog
 * items are named generically when their titles carry another company's mark. Every creative says BUENA ONDA. */
export const CRUISE_CAMPAIGNS = [
  {
    id: 'buena-onda', name: 'Buena Onda', analyticsId: 'house_buena_onda', destination: '/radio',
    creatives: creative('BUENA ONDA RADIO', 'REAL RADIO RIDES AGAIN.', 'HUMAN FREQUENCIES. NO ALGORITHMS.', '#17120f', '#f5eee8', '#ff4fa3'),
  },
  {
    id: 'vice-nights', name: 'Vice Nights', analyticsId: 'house_vice_nights', destination: '/events',
    enabled: true, priority: 0,
    digitalVideo: '/cruise/campaigns/vice-nights/house-loop.webm',
    digitalFallbackImage: '/cruise/campaigns/vice-nights/fallback.png',
    creatives: creative('AFTER DARK', 'VICE NIGHTS', 'BUENA ONDA · MIAMI', '#10171b', '#f6e8dc', '#ff4fa3'),
  },
  {
    id: 'onda-tropical', name: 'Onda Tropical', analyticsId: 'house_onda_tropical', destination: '/radio',
    creatives: creative('SUN ALL YEAR', 'ONDA TROPICAL', 'BUENA ONDA · RHYTHMS FROM THE WATER', '#0b5551', '#fff7db', '#ffbf47'),
  },
  {
    id: 'natsu-service', name: 'Natsu Service', analyticsId: 'house_natsu_service', destination: '/radio',
    creatives: creative('LATE SERVICE', 'NATSU', 'BUENA ONDA · SOUND FOR WARM NIGHTS', '#251b35', '#f7edf2', '#59dfd5'),
  },
  {
    id: 'open-decks', name: 'Open Decks', analyticsId: 'house_open_decks', destination: '/events',
    creatives: creative('COME PLAY', 'OPEN DECKS', 'BUENA ONDA · MIAMI', '#1b1410', '#f8eedf', '#ff7a3c'),
  },
  {
    id: 'catalog-miami-soundscapes', name: 'Miami Soundscapes Cassette', analyticsId: 'house_catalog_miami_soundscapes',
    destination: '/items/miami-soundscapes-cassette-tape-buena-onda-edition-a62d932f',
    billboardImage: '/cruise/catalog/miami-soundscapes.jpg',
    digitalFallbackImage: '/cruise/catalog/miami-soundscapes.jpg',
    creatives: creative('BUENA ONDA EDITION', 'MIAMI SOUNDSCAPES', 'CASSETTE · BUENA ONDA OBJECTS', '#13212a', '#f3ead9', '#ffb15c'),
  },
  {
    id: 'catalog-low-cabinet', name: 'Low Cabinet No. 4', analyticsId: 'house_catalog_low_cabinet', destination: '/items/low-cabinet-no-4',
    billboardImage: '/cruise/catalog/low-cabinet-no-4.jpg',
    digitalFallbackImage: '/cruise/catalog/low-cabinet-no-4.jpg',
    creatives: creative('CURATED VINTAGE', 'LOW CABINET NO. 4', 'BUENA ONDA OBJECTS', '#2a2118', '#f6ecdc', '#d5ad78'),
  },
  {
    id: 'catalog-instant-camera', name: 'Instant Camera', analyticsId: 'house_catalog_instant_camera',
    destination: '/items/polaroid-onestep-600-instant-camera-with-original-box-1781036708155',
    billboardImage: '/cruise/campaigns/product-ads/instant-camera.png',
    digitalFallbackImage: '/cruise/campaigns/product-ads/instant-camera.png',
    creatives: creative('ANALOG OBJECTS', 'INSTANT CAMERA', 'ORIGINAL BOX · BUENA ONDA OBJECTS', '#151a22', '#f4efe6', '#59dfd5'),
  },
  {
    id: 'catalog-racing-jacket', name: "'90s Racing Jacket", analyticsId: 'house_catalog_racing_jacket',
    destination: '/items/1990s-nascar-winston-cup-dupont-automotive-finishes-jacket-d00f31ea',
    billboardImage: '/cruise/campaigns/product-ads/racing-jacket.png',
    digitalFallbackImage: '/cruise/campaigns/product-ads/racing-jacket.png',
    creatives: creative('CURATED VINTAGE', "'90S RACING JACKET", 'BUENA ONDA OBJECTS', '#1c1530', '#f7edf2', '#ff4fa3'),
  },
  {
    id: 'buena-onda-vintage', name: 'Buena Onda Vintage', analyticsId: 'house_buena_onda_vintage', destination: '/themes', priority: -1,
    creatives: creative('GOOD TASTE TAKES DETOURS', 'BUENA ONDA VINTAGE', 'OBJECTS WITH A PAST', '#263c32', '#fff0cd', '#d5ad78'),
  },
  {
    id: 'buena-onda-motel', name: 'Buena Onda Motel', analyticsId: 'house_buena_onda_motel', destination: '/cruise?place=tideway', priority: -1,
    creatives: creative('COASTAL MOTOR LODGE', 'BUENA ONDA MOTEL', 'TAKE THE LONG WAY HOME', '#123a43', '#fff0dc', '#f1b782'),
  },
] as const satisfies readonly CruiseCampaign[]

export const DEFAULT_CRUISE_CAMPAIGN = CRUISE_CAMPAIGNS[0]

function isActive(campaign: CruiseCampaign, now: Date) {
  const value = now.getTime()
  const from = campaign.activeFrom ? Date.parse(campaign.activeFrom) : Number.NEGATIVE_INFINITY
  const until = campaign.activeUntil ? Date.parse(campaign.activeUntil) : Number.POSITIVE_INFINITY
  return campaign.enabled !== false && Number.isFinite(value) && value >= from && value <= until
}

export function resolveCruiseCampaign(id: string | string[] | undefined, now = new Date()) {
  const requestedId = Array.isArray(id) ? id[0] : id
  const active = [...CRUISE_CAMPAIGNS].filter(item => isActive(item, now)).sort((a: CruiseCampaign, b: CruiseCampaign) => (b.priority ?? 0) - (a.priority ?? 0))
  const campaign = requestedId === undefined ? active[0] : active.find(item => item.id === requestedId)
  return {
    campaign: campaign ?? DEFAULT_CRUISE_CAMPAIGN,
    requestedId: requestedId ?? null,
    valid: requestedId === undefined || Boolean(campaign),
  }
}

/** Places extend the campaign registry; creative and destination stay replaceable above. */
export interface CruisePlace {
  id: string
  placementId: string
  name: string
  type: 'storefront' | 'landmark' | 'billboard'
  campaignId: string
  status: 'house' | 'demo' | 'sponsored'
  description: string
  image: string
  address: string
  anchor: { moduleId: string; localZ: number; x: number; signX?: number }
}
export const CRUISE_PLACES: readonly CruisePlace[] = [
  { id:'records', placementId:'records-storefront', name:'Buena Onda Record Store', type:'storefront', campaignId:'buena-onda', status:'house', description:'A warm little listening room by the water. Browse Buena Onda Radio: records, rhythms, and sounds for the long way home.', image:'/cruise/places/records.svg', address:'01 · Ocean Drive', anchor:{moduleId:'coastal-approach',localZ:-12,x:-22} },
  { id:'branches', placementId:'branches-storefront', name:'Buena Onda Vintage', type:'storefront', campaignId:'buena-onda-vintage', status:'house', description:'Collected furniture, curious objects, and pieces with a past. A Buena Onda house storefront.', image:'/cruise/places/branches.svg', address:'02 · Biscayne Vintage Row', anchor:{moduleId:'highway-open-20',localZ:-12,x:-27,signX:11} },
  { id:'tideway', placementId:'tideway-landmark', name:'Buena Onda Motel', type:'landmark', campaignId:'buena-onda-motel', status:'house', description:'A roadside motor lodge with a glowing vacancy sign and room to slow down. A fictional Buena Onda landmark.', image:'/cruise/places/tideway.svg', address:'03 · Coast Highway', anchor:{moduleId:'highway-billboard-run',localZ:-12,x:-29} },
]
export const getCruisePlace = (id: string | null | undefined) => CRUISE_PLACES.find(place => place.id === id)
export const placeCampaign = (place: CruisePlace): CruiseCampaign => resolveCruiseCampaign(place.campaignId).campaign
export const cruisePlacePath = (place: CruisePlace) => `/cruise?place=${encodeURIComponent(place.id)}`
