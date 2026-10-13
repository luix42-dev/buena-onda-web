import type {CruiseCampaign} from '@/lib/cruise/types'
import type {MiamiGeoData,createMiamiRoute} from './miami-geo'
import registry from '../../public/real-miami/miami/landmarks.json'

export type MiamiAdPlacement={id:string;x:number;z:number;y:number;yaw:number;width:number;height:number;format:'billboard'|'poster';routeMeters:number;street:string;campaign:CruiseCampaign;headline:string;cta:string;kind:'house'|'demo'|'sponsored'}
export type MiamiAdSample={placement:MiamiAdPlacement;visible:boolean;viewable:boolean;readable:boolean;distance:number;facing:number;projectedArea:number;pixelWidth:number;pixelHeight:number;occlusion:number;visibleDurationMs:number;sampledAt:number}
export type MiamiAdRoute=ReturnType<typeof createMiamiRoute>
type Data=MiamiGeoData&{advertisingPlots?:{id:string;x:number;z:number;yaw?:number}[]}
const pointInside=(x:number,z:number,polygon:number[][])=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
const segmentDistance=(x:number,z:number,a:number[],b:number[])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)}
function clearsBuildings(x:number,z:number,yaw:number,width:number,data:Data){
 const points=[-width/2,0,width/2].map(t=>[x+Math.cos(yaw)*t,z-Math.sin(yaw)*t])
 return !data.buildings.some(building=>points.some(([px,pz])=>pointInside(px,pz,building.points)||building.points.some((a,i)=>segmentDistance(px,pz,a,building.points[(i+1)%building.points.length])<1.5)))
}
function nearestRoute(x:number,z:number,route:MiamiAdRoute){let best=Infinity,meters=0,at=0;for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length||1))),distance=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);if(distance<best){best=distance;meters=at+t*length}at+=length}return meters}
const kindFor=(campaign:CruiseCampaign):MiamiAdPlacement['kind']=>campaign.analyticsId.startsWith('house_')?'house':campaign.analyticsId.startsWith('demo_')?'demo':'sponsored'
function copy(campaign:CruiseCampaign,index:number){
 if(campaign.id==='buena-onda')return index%2?{headline:'GOOD TASTE TAKES DETOURS.',cta:'Find your next obsession',campaign:{...campaign,destination:'/themes' as const}}:{headline:'STAY A LITTLE LONGER.',cta:'Stay for one song',campaign:{...campaign,destination:'/radio' as const}}
 return{headline:campaign.creatives.billboard.headline,cta:campaign.creatives.billboard.footer,campaign}
}
/** Stable OSM/world coordinates survive visits and chunk rebuilds. No synthetic ad streets. */
export function createMiamiAdPlacements(data:Data,route:MiamiAdRoute,campaign:CruiseCampaign):MiamiAdPlacement[]{
 const kind=kindFor(campaign),placements:MiamiAdPlacement[]=[]
 for(const plot of data.advertisingPlots||[]){const meters=nearestRoute(plot.x,plot.z,route),p=route.sample(meters);placements.push({...plot,y:2.15,yaw:plot.yaw||0,width:3.2,height:1.6,format:'poster',routeMeters:meters,street:p.streetName,...copy(campaign,placements.length),kind})}
 const start=(registry.initialRouteMeters+75)%route.length
 for(let traveled=0,index=0;traveled<route.length;traveled+=520,index++){
  const meters=(start+traveled)%route.length,p=route.sample(meters)
  if(!/Ocean Drive|Collins Avenue|Washington Avenue|Alton Road|Dade Boulevard|Biscayne|Causeway/i.test(p.streetName)||Math.abs(p.curvature)>.015)continue
  let candidate:{x:number;z:number;yaw:number}|null=null
  for(const side of[1,-1]){for(const offset of[10,12,14]){const x=p.x+Math.cos(p.yaw)*offset*side,z=p.z-Math.sin(p.yaw)*offset*side,yaw=Math.atan2(Math.sin(p.yaw)-Math.cos(p.yaw)*side*.55,Math.cos(p.yaw)+Math.sin(p.yaw)*side*.55);if(clearsBuildings(x,z,yaw,8,data)&&placements.every(other=>other.format==='poster'||Math.hypot(other.x-x,other.z-z)>180)){candidate={x,z,yaw};break}}if(candidate)break}
  if(!candidate)continue
  placements.push({id:`MB-ROUTE-${String(Math.round(meters)).padStart(5,'0')}`, ...candidate,y:3.6,width:8,height:3.3,format:'billboard',routeMeters:meters,street:p.streetName,...copy(campaign,index),kind})
 }
 return placements
}
