import type { CruiseVehicleId } from './types'

/** Deliberate launch scope. The experimental experience remains in CruiseExperience. */
export const LAUNCH = { traffic: false, people: false, driverBody: false, animatedControls: false, videoAds: false } as const
export const LAUNCH_CARS: { id: CruiseVehicleId; name: string; description: string; tag: string; paints: { name: string; color: string }[] }[] = [
  { id: 'coastal-coupe', name: 'Coastal Coupe', tag: '01 / COASTAL CLASSIC', description: 'Pop-up attitude. Pearl paint. Nowhere to be but by the water.', paints: [{name:'Pearl',color:'#e8e5dc'},{name:'Seafoam',color:'#6ca8a0'},{name:'Guava',color:'#c46778'}] },
  { id: 'classic-coupe', name: 'Classic Coupe', tag: '02 / AFTER HOURS', description: 'A long hood and an easy pace. A little older, a little more soul.', paints: [] },
  { id: 'island-trail', name: 'Island Trail', tag: '03 / OPEN AIR', description: 'An original eighties off-roader. Open sky, analog dials, salt in the air.', paints: [{name:'Salt',color:'#e3e1d4'},{name:'Lagoon',color:'#568e86'},{name:'Sand',color:'#bda884'}] },
]
