import {CatmullRomCurve3,Vector3} from 'three'
import {createHighwayRoute,type HighwayRoute,type HighwaySample} from './highway'
import type {MiamiGeoData} from './miami-geo'
import {createMiamiRoute} from './miami-geo'

/** An authored geographic connector. The Beach streets come from OSM; the bay and I-395
 * geometry is interpretive until we can license/use a surveyed road mesh. All coordinates
 * use the Beach extract's metre projection so a handoff does not move the car. */
export const CAUSEWAY = {
  cityExitMeters:2340,
  cityReturnMeters:16100,
  highwayExitMeters:2600,
  downtown:{x:-5750,z:1150},
} as const

export type ConnectedRoute = ReturnType<typeof createMiamiRoute>

export function createConnectedHighwayRoute(origin:MiamiGeoData['origin']):HighwayRoute{
 const base=createHighwayRoute(),at=base.sample(0)
 // Rotate the authored northbound loop so its first tangent continues west from I-395.
 const turn=at.yaw-Math.PI/2,c=Math.cos(turn),s=Math.sin(turn)
 const transform=(x:number,z:number)=>({x:CAUSEWAY.downtown.x+x*c-z*s,z:CAUSEWAY.downtown.z+x*s+z*c})
 const points=base.points.map(([x,z])=>{const p=transform(x,z);return[p.x,p.z] as [number,number]})
 function sample(meters:number):HighwaySample{
  const p=base.sample(meters),q=transform(p.x,p.z)
  return {...p,...q,yaw:p.yaw-turn,lat:origin[1]-q.z/111320,lon:origin[0]+q.x/(111320*Math.cos(origin[1]*Math.PI/180))}
 }
 return {length:base.length,points,sample}
}

export type CausewayDirection='outbound'|'inbound'
export function createCausewayRoute(city:ConnectedRoute,highway:HighwayRoute,direction:CausewayDirection,origin:MiamiGeoData['origin']){
 const west=highway.sample(0),exit=highway.sample(CAUSEWAY.highwayExitMeters)
 const beach=city.sample(CAUSEWAY.cityExitMeters),returnStreet=city.sample(CAUSEWAY.cityReturnMeters)
 const forward=(p:{x:number;z:number;yaw:number},meters:number)=>[p.x-Math.sin(p.yaw)*meters,0,p.z-Math.cos(p.yaw)*meters] as const
 const controls=direction==='outbound'?
  [[beach.x,0,beach.z],[-760,0,1728],[-1050,2,1650],[-1700,7,1440],[-2550,11,1300],[-3450,11,1270],[-4350,10,1220],[-4900,8,1175],[-5350,5,1150],[-5600,2,1150],[west.x,0,west.z]]:
  [[exit.x,0,exit.z],forward(exit,400),[-9000,3,1560],[-8870,7,2050],[-8260,10,2050],[-7200,11,1650],[-5750,8,1350],[-5350,6,1150],[-4700,9,1210],[-3450,11,1270],[-2500,10,1330],[-1600,6,1420],[-800,2,1390],[returnStreet.x-120,0,returnStreet.z], [returnStreet.x,0,returnStreet.z]]
 const curve=new CatmullRomCurve3(controls.map(([x,y,z])=>new Vector3(x,y,z)),false,'centripetal')
 const n=Math.ceil(curve.getLength()/6),positions=curve.getSpacedPoints(n),lengths=[0]
 for(let i=1;i<positions.length;i++)lengths.push(lengths[i-1]+positions[i].distanceTo(positions[i-1]))
 const length=lengths[lengths.length-1],points=positions.map(p=>[p.x,p.z] as [number,number])
 function at(meters:number){const d=Math.min(length,Math.max(0,meters));let lo=0,hi=lengths.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(lengths[mid]<d)lo=mid;else hi=mid}return positions[lo].clone().lerp(positions[hi],(d-lengths[lo])/Math.max(.001,lengths[hi]-lengths[lo]))}
 function sample(meters:number){const p=at(meters),a=at(meters-2),b=at(meters+2),yaw=Math.atan2(-(b.x-a.x),-(b.z-a.z)),before=Math.atan2(-(p.x-a.x),-(p.z-a.z)),after=Math.atan2(-(b.x-p.x),-(b.z-p.z)),streetName=Math.abs(p.x)<1100?'MacArthur Causeway / Miami Beach':p.x> -4700?'MacArthur Causeway / Biscayne Bay':'I-395 Signature Bridge / Downtown'
  return {x:p.x,y:p.y,z:p.z,dx:-(b.x-a.x),dy:(b.y-a.y)/4,yaw,metric:1,curvature:Math.atan2(Math.sin(after-before),Math.cos(after-before))/4,streetName,lat:origin[1]-p.z/111320,lon:origin[0]+p.x/(111320*Math.cos(origin[1]*Math.PI/180))}
 }
 return {length,points,sample,direction}
}
export type CausewayRoute=ReturnType<typeof createCausewayRoute>
