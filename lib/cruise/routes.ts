import type { CruiseDistrict, CruiseRouteModule } from './types'

export const DISTRICT_LABELS: Record<CruiseDistrict, string> = {
  'south-beach': 'South Beach', 'beach-transition': 'Oceanfront', causeway: 'Causeway',
  waterfront: 'Waterfront', downtown: 'Downtown', brickell: 'Brickell', highway: 'Highway',
  'airport-industrial': 'Airport / Industrial', 'biscayne-midtown': 'MiMo Boulevard',
}

export const EXTENDED_CRUISE_ROUTE: readonly CruiseRouteModule[] = [
  { id: 'coastal-marina', district: 'south-beach', family: 'coastal', kind: 'coastal', shots: ['wideRear', 'chase', 'side', 'hood'] },
  { id: 'coastal-hotels', district: 'south-beach', family: 'coastal', kind: 'coastal', shots: ['chase', 'rearQuarter', 'side', 'driver'] },
  { id: 'coastal-promenade', district: 'south-beach', family: 'coastal', kind: 'coastal', shots: ['wideRear', 'side', 'hood', 'chase'] },
  { id: 'beach-park', district: 'beach-transition', family: 'coastal', kind: 'beach', shots: ['wideRear', 'side', 'hood', 'chase'] },
  { id: 'beach-pier', district: 'beach-transition', family: 'coastal', kind: 'beach', shots: ['wideRear', 'skyline', 'side', 'chase'] },
  { id: 'beach-causeway-ramp', district: 'beach-transition', family: 'coastal', kind: 'family-transition', transitionTo: 'causeway', shots: ['wideRear', 'hood', 'chase', 'side'] },
  { id: 'causeway-west-span', district: 'causeway', family: 'causeway', kind: 'causeway', shots: ['wideRear', 'skyline', 'side', 'hood', 'chase'] },
  { id: 'causeway-skyline-span', district: 'causeway', family: 'causeway', kind: 'causeway', shots: ['skyline', 'wideRear', 'side', 'chase'] },
  { id: 'causeway-waterfront-ramp', district: 'causeway', family: 'causeway', kind: 'family-transition', transitionTo: 'coastal', shots: ['chase', 'side', 'hood', 'wideRear'] },
  { id: 'waterfront-marina', district: 'waterfront', family: 'coastal', kind: 'waterfront', shots: ['wideRear', 'skyline', 'side', 'chase'] },
  { id: 'waterfront-promenade', district: 'waterfront', family: 'coastal', kind: 'waterfront', shots: ['wideRear', 'side', 'hood', 'chase'] },
  { id: 'coastal-downtown-rise', district: 'waterfront', family: 'coastal', kind: 'coastal-to-downtown', transitionTo: 'downtown', shots: ['chase', 'side', 'rearQuarter', 'hood'] },
  { id: 'downtown-art-deco', district: 'downtown', family: 'downtown', kind: 'downtown', shots: ['lowRear', 'side', 'chase', 'driver'] },
  { id: 'downtown-canyon', district: 'downtown', family: 'downtown', kind: 'downtown', shots: ['lowRear', 'chase', 'hood', 'side'] },
  { id: 'neon-storefronts', district: 'downtown', family: 'downtown', kind: 'neon', shots: ['lowRear', 'side', 'chase', 'driver'] },
  { id: 'neon-towers', district: 'downtown', family: 'downtown', kind: 'neon', shots: ['lowRear', 'rearQuarter', 'side', 'chase'] },
  { id: 'brickell-financial', district: 'brickell', family: 'downtown', kind: 'brickell', shots: ['lowRear', 'rearQuarter', 'side', 'chase'] },
  { id: 'brickell-boulevard', district: 'brickell', family: 'downtown', kind: 'brickell', shots: ['chase', 'side', 'hood', 'driver'] },
  { id: 'brickell-highway-ramp', district: 'brickell', family: 'downtown', kind: 'family-transition', transitionTo: 'highway', shots: ['chase', 'side', 'hood', 'rearQuarter'] },
  { id: 'highway-overpass', district: 'highway', family: 'highway', kind: 'highway', shots: ['lowRear', 'chase', 'rearQuarter', 'hood', 'side'] },
  { id: 'highway-billboard-run', district: 'highway', family: 'highway', kind: 'highway', shots: ['billboardReveal', 'chase', 'side', 'lowRear'] },
  { id: 'highway-express', district: 'highway', family: 'highway', kind: 'highway', shots: ['wideRear', 'chase', 'side', 'hood'] },
  { id: 'airport-approach', district: 'airport-industrial', family: 'highway', kind: 'industrial', shots: ['wideRear', 'chase', 'side', 'hood'] },
  { id: 'airport-cargo', district: 'airport-industrial', family: 'highway', kind: 'industrial', shots: ['chase', 'side', 'rearQuarter', 'hood'] },
  { id: 'airport-terminal', district: 'airport-industrial', family: 'highway', kind: 'industrial', shots: ['wideRear', 'side', 'chase', 'hood'] },
  { id: 'industrial-midtown-edge', district: 'airport-industrial', family: 'highway', kind: 'family-transition', transitionTo: 'residential', shots: ['chase', 'side', 'hood'] },
  { id: 'midtown-shops', district: 'biscayne-midtown', family: 'residential', kind: 'midtown', shots: ['chase', 'side', 'driver'] },
  { id: 'midtown-avenue', district: 'biscayne-midtown', family: 'residential', kind: 'midtown', shots: ['rearQuarter', 'wideRear', 'chase', 'side'] },
  { id: 'residential-palms', district: 'biscayne-midtown', family: 'residential', kind: 'residential', shots: ['rearQuarter', 'wideRear', 'chase', 'side'] },
  { id: 'residential-coastal-return', district: 'biscayne-midtown', family: 'residential', kind: 'residential-to-coastal', transitionTo: 'coastal', shots: ['wideRear', 'chase', 'side', 'hood'] },
]

/** Four sustained districts, with a 64m handoff at each boundary. */
export const CRUISE_ROUTE: readonly CruiseRouteModule[] = Array.from({ length: 36 }, (_, index): CruiseRouteModule => {
  const shots = ['chase', 'driver', 'side', 'wideRear'] as const
  if (index < 8) return { id: index === 5 ? 'coastal-approach' : `south-beach-deco-${index}`, district: 'south-beach', family: 'coastal', kind: 'coastal', shots }
  if (index === 8) return { id: 'coast-bridge-ramp', district: 'south-beach', family: 'coastal', transitionTo: 'causeway', kind: 'family-transition', shots }
  if (index < 18) return { id: index === 14 ? 'causeway-scenic' : `causeway-open-${index}`, district: 'causeway', family: 'causeway', kind: 'causeway', shots }
  if (index === 18) return { id: 'causeway-bayside-arrival', district: 'downtown', family: 'causeway', transitionTo: 'downtown', kind: 'family-transition', shots }
  if (index < 26) return { id: index === 23 ? 'downtown-underpass' : `downtown-bayside-${index}`, district: 'downtown', family: 'downtown', kind: 'downtown', shots }
  if (index === 26) return { id: 'downtown-mimo-transition', district: 'downtown', family: 'downtown', transitionTo: 'residential', kind: 'family-transition', shots }
  if (index < 35) return { id: index === 29 ? 'highway-open-20' : index === 32 ? 'highway-billboard-run' : `mimo-boulevard-${index}`, district: 'biscayne-midtown', family: 'residential', kind: 'midtown', shots }
  return { id: 'mimo-ocean-return', district: 'biscayne-midtown', family: 'residential', transitionTo: 'coastal', kind: 'family-transition', shots }
})

export const SCENIC_DISTRICTS = [
  { id: 'south-beach', label: 'South Beach', module: 2 },
  { id: 'causeway', label: 'Causeway', module: 12 },
  { id: 'downtown', label: 'Downtown / Bayside', module: 21 },
  { id: 'biscayne-midtown', label: 'MiMo Boulevard', module: 30 },
] as const

export const REQUIRED_WORLD_FAMILIES = ['coastal', 'downtown', 'causeway', 'highway', 'residential'] as const
export const REQUIRED_DISTRICTS = Object.keys(DISTRICT_LABELS) as CruiseDistrict[]

/** Front half enters first; the back half hands off to the next road family. */
export function routeFamilyAtOffset(route: CruiseRouteModule, localZ: number) {
  return localZ < 0 ? route.transitionTo ?? route.family : route.family
}

export function supportsOuterTrafficLane(route: CruiseRouteModule, localZ: number) {
  if (routeFamilyAtOffset(route, localZ) !== 'highway') return false
  if (!route.transitionTo || route.transitionTo === route.family) return true
  // The outer lane is only usable once the 32m ramp has enough vehicle clearance.
  return route.family === 'highway' ? localZ >= 24 : localZ <= -24
}
