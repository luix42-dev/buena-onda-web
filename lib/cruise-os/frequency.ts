export type FrequencyPlace={id:string;name:string;meters:number}
export function forwardMeters(from:number,to:number,length:number):number|null {
  if(![from,to,length].every(Number.isFinite)||length<=0)return null
  return ((to-from)%length+length)%length
}
/** Explicit geographic choice only. No listening history, beat inference or station ranking. */
export function nextFrequencyPlace(places:readonly FrequencyPlace[],from:number,length:number):FrequencyPlace|null {
  return places.map(place=>({place,distance:forwardMeters(from,place.meters,length)}))
    .filter((item):item is {place:FrequencyPlace;distance:number}=>item.distance!==null&&item.distance>=60&&item.distance<=2000)
    .sort((a,b)=>a.distance-b.distance)[0]?.place||null
}
