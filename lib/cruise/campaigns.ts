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

export const CRUISE_CAMPAIGNS = [
  {
    id: 'buena-onda', name: 'Buena Onda', analyticsId: 'house_buena_onda', destination: '/radio',
    creatives: creative('MIAMI', 'BUENA ONDA', 'RADIO · CULTURE · NIGHTS', '#17120f', '#f5eee8', '#ff4fa3'),
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
    creatives: creative('SUN ALL YEAR', 'ONDA TROPICAL', 'RHYTHMS FROM THE WATER', '#0b5551', '#fff7db', '#ffbf47'),
  },
  {
    id: 'natsu-service', name: 'Natsu Service', analyticsId: 'house_natsu_service', destination: '/radio',
    creatives: creative('LATE SERVICE', 'NATSU', 'SOUND FOR WARM NIGHTS', '#251b35', '#f7edf2', '#59dfd5'),
  },
  {
    id: 'branches-house', name: 'Branches Vintage House', analyticsId: 'demo_branches', destination: '/themes', priority: -1,
    creatives: creative('VINTAGE HOUSE', 'BRANCHES', 'OBJECTS WITH A PAST', '#263c32', '#fff0cd', '#d5ad78'),
  },
  {
    id: 'tideway-house', name: 'Tideway Motel', analyticsId: 'demo_tideway', destination: '/cruise?place=tideway', priority: -1,
    creatives: creative('COASTAL MOTOR LODGE', 'TIDEWAY', 'TAKE THE LONG WAY HOME', '#123a43', '#fff0dc', '#f1b782'),
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
  { id:'branches', placementId:'branches-storefront', name:'Branches Vintage House', type:'storefront', campaignId:'branches-house', status:'demo', description:'Collected furniture, curious objects, and pieces with a past. A Buena Onda house concept, shown as demo content until a business is configured.', image:'/cruise/places/branches.svg', address:'02 · Biscayne Vintage Row', anchor:{moduleId:'highway-open-20',localZ:-12,x:-27,signX:11} },
  { id:'tideway', placementId:'tideway-landmark', name:'Tideway Motel', type:'landmark', campaignId:'tideway-house', status:'demo', description:'A roadside motor lodge with a glowing vacancy sign and room to slow down. Fictional demo landmark with replaceable sponsor space.', image:'/cruise/places/tideway.svg', address:'03 · Coast Highway', anchor:{moduleId:'highway-billboard-run',localZ:-12,x:-29} },
]
export const getCruisePlace = (id: string | null | undefined) => CRUISE_PLACES.find(place => place.id === id)
export const placeCampaign = (place: CruisePlace): CruiseCampaign => resolveCruiseCampaign(place.campaignId).campaign
export const cruisePlacePath = (place: CruisePlace) => `/cruise?place=${encodeURIComponent(place.id)}`
