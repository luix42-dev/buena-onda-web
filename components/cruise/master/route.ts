/** Experimental Miami only. Original Cruise retains its independent 2,304 m route. */
export const MIAMI_ROUTE_LENGTH = 630
/** Visible runout beyond the covered endpoint cut, so cameras never approach a road edge. */
export const MIAMI_SCENERY_END = MIAMI_ROUTE_LENGTH + 140
/** Ground continues beyond the 420 m fog distance even at the last camera position. */
export const MIAMI_GROUND_END = MIAMI_ROUTE_LENGTH + 500
export const MIAMI_ROUTE_SECTIONS = [
  { name: 'Ocean Drive storefronts', start: 0, end: 210 },
  { name: 'Palm promenade', start: 210, end: 400 },
  { name: 'Coastal hotels', start: 400, end: MIAMI_ROUTE_LENGTH },
] as const
export const miamiStreetCenter = (distance: number) => 3 * Math.sin(distance / 95)
