/** Giant NOVA (Look v2 Retrowave) is an advertising surface, not the companion. Luis: "Giant only says ADS,
 * not talking to driver, that can stay in the card." She is world-delivered and always disclosed; the in-car
 * companion never voices these lines and the two never speak over each other.
 * House ads only: Buena Onda's own product, no sponsor, price or offer claims (see docs/cruise/nova/AD-FORMATS.md). */
export type GiantAd = { id: string; text: string; destination: string }
export const GIANT_ADS: readonly GiantAd[] = [
  { id: 'ad_longway', text: 'Take the long way home. Buena Onda Cruise.', destination: '/cruise' },
  { id: 'ad_station', text: 'Find your station. Find your city. Buena Onda.', destination: '/radio' },
]
export const GIANT_AD_DISCLOSURE = 'Ad · Buena Onda'
export const ADS_VOICE_BASE = '/real-miami/nova/ads/'
/** First apparition after the companion's greeting window, then a long gap so ads stay occasional. */
export const GIANT_AD_TIMING = { firstAfterSec: 75, everySec: 170, jitterSec: 60 }
