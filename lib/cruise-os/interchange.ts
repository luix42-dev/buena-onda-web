import type {MiamiAdRoute} from '@/lib/real-miami/advertising'

/** The Beach loop turns from westbound 5th Street onto West Avenue here. Continue west
 * instead to reach MacArthur Causeway. */
export function cityInterchangeMeters(route:MiamiAdRoute){
 let best=0,nearest=Infinity
 for(let meters=0;meters<route.length;meters+=5){
  const p=route.sample(meters)
  const delta=Math.abs(p.x+625)
  if(p.streetName==='5th Street'&&p.yaw>1.2&&p.yaw<2&&delta<nearest){nearest=delta;best=meters}
 }
 return best
}

export const HIGHWAY_CITY_EXIT_METERS=2600

export function distanceToExit(meters:number,exit:number,length:number){
 const here=((meters%length)+length)%length
 return ((exit-here)%length+length)%length
}
