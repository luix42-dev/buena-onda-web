import type {CruiseCampaign} from '@/lib/cruise/types'
import {CRUISE_CAMPAIGNS} from '@/lib/cruise/campaigns'
import type {MiamiGeoData,createMiamiRoute} from './miami-geo'
import registry from '../../public/real-miami/miami/landmarks.json'

/** `format` is the analytics/readability class; `surface` is how the ad is built in the world.
 * projection: light-projected video/motion loop on a street-facing facade (night only).
 * blade: vertical neon blade sign perpendicular to a facade, Ocean Drive style.
 * hero: large emissive screen at the vanishing point of a long straight; rotates creative on a shared clock. */
/** 'signature': the monumental character format (lib/cruise/ad-formats.ts, lib/cruise/signature-campaigns.ts). */
export type MiamiAdSurface='billboard'|'poster'|'projection'|'blade'|'hero'|'signature'|'rooftop'|'digital'
export type MiamiAdPlacement={id:string;x:number;z:number;y:number;yaw:number;width:number;height:number;format:'billboard'|'poster'|'wall';surface:MiamiAdSurface;routeMeters:number;street:string;campaign:CruiseCampaign;headline:string;cta:string;kind:'house'|'demo'|'sponsored'|'station';rotation?:readonly CruiseCampaign[];runStart?:number
 /** Look v2: measurement range override (highway boards read from farther) and the ground the legs stand on. */
 maxDistance?:number;groundY?:number}
export type MiamiAdSample={placement:MiamiAdPlacement;visible:boolean;viewable:boolean;readable:boolean;distance:number;facing:number;projectedArea:number;pixelWidth:number;pixelHeight:number;occlusion:number;visibleDurationMs:number;sampledAt:number}
export type MiamiAdRoute=ReturnType<typeof createMiamiRoute>
type Data=MiamiGeoData&{advertisingPlots?:{id:string;x:number;z:number;yaw?:number}[]}

/** Clutter budget. "A lot of ads without polluting the drive" is enforced here, not by taste at runtime:
 * every surface keeps its own cadence, any two world ads keep a minimum gap, and hero landmarks
 * (Colony, Breakwater, Clevelander, Carlyle, Leslie) keep a clear zone so Director shots stay clean. */
// Luis 2026-10-22: "I want to see more ads, different places" - denser roadside boards, projections and blades, plus rooftops.
export const AD_BUDGET={minGap:36,landmarkClear:70,billboardEvery:260,projectionGap:150,bladeGap:85,maxProjections:30,maxBlades:56,rooftopGap:170,maxRooftops:24}
/** Hero screens: one per long straight, never two within heroGap metres of route. */
export const HERO={minRun:240,gap:700,max:10,width:15,height:20,bottom:14,rotationMs:30000}
export const ROAD_CLEARANCE=8.5

const pointInside=(x:number,z:number,polygon:number[][])=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
const segmentDistance=(x:number,z:number,a:number[],b:number[])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)}
function clearsBuildings(x:number,z:number,yaw:number,width:number,data:Data){
 const points=[-width/2,0,width/2].map(t=>[x+Math.cos(yaw)*t,z-Math.sin(yaw)*t])
 return !data.buildings.some(building=>points.some(([px,pz])=>pointInside(px,pz,building.points)||building.points.some((a,i)=>segmentDistance(px,pz,a,building.points[(i+1)%building.points.length])<1.5)))
}
function nearestRoute(x:number,z:number,route:MiamiAdRoute){let best=Infinity,meters=0,at=0;for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length||1))),distance=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);if(distance<best){best=distance;meters=at+t*length}at+=length}return meters}
/** Route samples every 8 m bucketed in 40 m cells: facade scans touch thousands of edges. */
function routeGrid(route:MiamiAdRoute){
 const cell=40,grid=new Map<string,{x:number;z:number;meters:number}[]>()
 for(let m=0;m<route.length;m+=8){const p=route.sample(m),key=`${Math.floor(p.x/cell)},${Math.floor(p.z/cell)}`;let list=grid.get(key);if(!list)grid.set(key,list=[]);list.push({x:p.x,z:p.z,meters:m})}
 return (x:number,z:number,radius:number)=>{let best:{x:number;z:number;meters:number;distance:number}|null=null;const r=Math.ceil(radius/cell),cx=Math.floor(x/cell),cz=Math.floor(z/cell)
  for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)for(const p of grid.get(`${cx+i},${cz+j}`)||[]){const distance=Math.hypot(p.x-x,p.z-z);if(distance<=radius&&(!best||distance<best.distance))best={...p,distance}}
  return best}
}
const kindFor=(campaign:CruiseCampaign):MiamiAdPlacement['kind']=>campaign.analyticsId.startsWith('station_')?'station':campaign.analyticsId.startsWith('house_')?'house':campaign.analyticsId.startsWith('demo_')?'demo':'sponsored'
function copy(campaign:CruiseCampaign,index:number){
 if(campaign.id==='buena-onda')return index%2?{headline:'GOOD TASTE TAKES DETOURS.',cta:'Find your next obsession',campaign:{...campaign,destination:'/themes' as const}}:{headline:'STAY A LITTLE LONGER.',cta:'Stay for one song',campaign:{...campaign,destination:'/radio' as const}}
 const lines:Record<string,[string,string]>={
  'vice-nights':['THE NIGHT IS STILL YOUNG.','Find the next night'],
  'onda-tropical':['TAKE THE HEAT WITH YOU.','Listen in'],
  'natsu-service':['AFTER HOURS, STAY AWHILE.','Listen in'],
  'open-decks':['YOUR TURN TO PLAY.','See the sessions'],
  'catalog-miami-soundscapes':['KEEP THE CITY ON TAPE.','Explore the cassette'],
  'catalog-low-cabinet':['SOME OBJECTS HAVE STORIES.','Explore the cabinet'],
  'catalog-instant-camera':['TAKE A NIGHT HOME.','Explore the camera'],
  'catalog-racing-jacket':['DRESS FOR THE DETOUR.','Explore the jacket'],
 }
 if(lines[campaign.id])return{headline:lines[campaign.id][0],cta:lines[campaign.id][1],campaign}
 return{headline:campaign.creatives.billboard.headline,cta:campaign.creatives.billboard.footer,campaign}
}
/** The featured campaign holds every third slot (was every other: Luis wants his projects and catalog seen more);
 * the rest of the active roster rotates through the others. */
function rotation(featured:CruiseCampaign,roster:readonly CruiseCampaign[]=CRUISE_CAMPAIGNS){
 const now=Date.now(),others=roster.filter(c=>c.id!==featured.id&&c.enabled!==false&&(!c.activeFrom||Date.parse(c.activeFrom)<=now)&&(!c.activeUntil||Date.parse(c.activeUntil)>=now))
 return (slot:number)=>slot%3===0||!others.length?featured:others[(slot-1-Math.floor(slot/3))%others.length]
}
/** The creative a hero screen shows at `now`. Face and measurement share this clock, so samples name what was on screen. */
export function heroCreative(placement:MiamiAdPlacement,now:number):MiamiAdPlacement{
 if(!placement.rotation?.length)return placement
 const period=placement.surface==='digital'?30000:HERO.rotationMs
 const index=Math.floor(now/period+placement.x*.013)%placement.rotation.length,campaign=placement.rotation[(index+placement.rotation.length)%placement.rotation.length],c=copy(campaign,index)
 return{...placement,...c,kind:kindFor(c.campaign)}
}
const AD_STREETS=/Ocean Drive|Collins Avenue|Washington Avenue|Alton Road|Dade Boulevard|Biscayne|Causeway|Lincoln Road|5th Street|Brickell/i

/** Stable OSM/world coordinates survive visits and chunk rebuilds. No synthetic ad streets. */
export function createMiamiAdPlacements(data:Data,route:MiamiAdRoute,campaign:CruiseCampaign,options:{hero?:boolean;roster?:readonly CruiseCampaign[]}={}):MiamiAdPlacement[]{
 const roster:readonly CruiseCampaign[]=options.roster??CRUISE_CAMPAIGNS,pick=rotation(campaign,roster),placements:MiamiAdPlacement[]=[]
 const road=routeGrid(route)
 // The route grid samples every 8 m; four extra metres cover the worst case
 // between samples and preserve the actual minimum panel-to-road clearance.
 const clearsRoad=(x:number,z:number,yaw:number,width:number)=>[-.5,-.3,0,.3,.5].every(t=>{const sx=x+Math.cos(yaw)*width*t,sz=z-Math.sin(yaw)*width*t;return !road(sx,sz,ROAD_CLEARANCE+4)})
 const add=(placement:Omit<MiamiAdPlacement,'campaign'|'headline'|'cta'|'kind'>,prefer?:CruiseCampaign)=>{const chosen=prefer??pick(placements.length),c=copy(chosen,placements.length);placements.push({...placement,...c,kind:kindFor(c.campaign)})}
 const landmarkCenters=(registry.landmarks as {position:{x:number;z:number};osmBuildingId:number}[]).map(l=>l.position)
 const landmarkIds=new Set((registry.landmarks as {osmBuildingId:number}[]).map(l=>l.osmBuildingId))
 const clearOfLandmarks=(x:number,z:number)=>landmarkCenters.every(l=>Math.hypot(l.x-x,l.z-z)>AD_BUDGET.landmarkClear)
 const gapOk=(x:number,z:number,surface:MiamiAdSurface,gap:number)=>placements.every(o=>{const d=Math.hypot(o.x-x,o.z-z);return d>=AD_BUDGET.minGap&&(o.surface!==surface||d>=gap)})

 for(const plot of data.advertisingPlots||[]){const meters=nearestRoute(plot.x,plot.z,route),p=route.sample(meters);add({...plot,y:2.15,yaw:plot.yaw||0,width:3.2,height:1.6,format:'poster',surface:'poster',routeMeters:meters,street:p.streetName})}

 // Roadside billboards: open ground only, straight stretches of the main streets.
 const start=(registry.initialRouteMeters+75)%route.length
 for(let traveled=0;traveled<route.length;traveled+=AD_BUDGET.billboardEvery){
  const meters=(start+traveled)%route.length,p=route.sample(meters)
  if(!AD_STREETS.test(p.streetName)||Math.abs(p.curvature)>.015)continue
  let candidate:{x:number;z:number;yaw:number}|null=null
  for(const side of[1,-1]){for(const offset of[17,20,24,28]){const x=p.x+Math.cos(p.yaw)*offset*side,z=p.z-Math.sin(p.yaw)*offset*side,yaw=Math.atan2(Math.sin(p.yaw)-Math.cos(p.yaw)*side*.55,Math.cos(p.yaw)+Math.sin(p.yaw)*side*.55);if(clearOfLandmarks(x,z)&&clearsRoad(x,z,yaw,10)&&clearsBuildings(x,z,yaw,10,data)&&gapOk(x,z,'billboard',150)){candidate={x,z,yaw};break}}if(candidate)break}
  if(!candidate)continue
  add({id:`MB-ROUTE-${String(Math.round(meters)).padStart(5,'0')}`,...candidate,y:4.4,width:10,height:4.1,format:'billboard',surface:'billboard',routeMeters:meters,street:p.streetName})
 }

 // Facade surfaces: real OSM building edges that face the route.
 const near=routeGrid(route)
 type Edge={building:Data['buildings'][number];a:number[];b:number[];mx:number;mz:number;length:number;nx:number;nz:number;meters:number;distance:number}
 const edges:Edge[]=[]
 for(const building of data.buildings){
  if(landmarkIds.has(building.id)||building.height<8)continue
  const pts=building.points,cx=pts.reduce((s,q)=>s+q[0],0)/pts.length,cz=pts.reduce((s,q)=>s+q[1],0)/pts.length
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<6)continue
   const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;let nx=dz/length,nz=-dx/length;if(nx*(mx-cx)+nz*(mz-cz)<0){nx=-nx;nz=-nz}
   const r=near(mx,mz,34);if(!r||r.distance<5)continue
   if(nx*(r.x-mx)/r.distance+nz*(r.z-mz)/r.distance<.72)continue
   const p=route.sample(r.meters);if(!AD_STREETS.test(p.streetName)||!clearOfLandmarks(mx,mz))continue
   edges.push({building,a,b,mx,mz,length,nx,nz,meters:r.meters,distance:r.distance})}
 }
 edges.sort((e,f)=>e.meters-f.meters)
 let projections=0,blades=0
 const motionCampaigns=[campaign,...roster].filter((c,i,all)=>c.digitalVideo&&c.enabled!==false&&all.findIndex(o=>o.id===c.id)===i)
 for(const e of edges){
  if(projections>=AD_BUDGET.maxProjections)break
  if(e.length<14||e.building.height<12)continue
  const width=Math.min(e.length*.7,16),height=Math.min(width*9/16,e.building.height*.5),y=Math.max(height/2+3.2,e.building.height*.58),x=e.mx+e.nx*.32,z=e.mz+e.nz*.32
  if(placements.some(o=>o.id===`MB-PROJ-${e.building.id}`)||!gapOk(x,z,'projection',AD_BUDGET.projectionGap))continue
  // Every other projection goes to a campaign that ships real motion, when one is active.
  add({id:`MB-PROJ-${e.building.id}`,x,z,y,yaw:Math.atan2(e.nx,e.nz),width,height,format:'wall',surface:'projection',routeMeters:e.meters,street:route.sample(e.meters).streetName},projections%2&&motionCampaigns.length?motionCampaigns[(projections>>1)%motionCampaigns.length]:undefined);projections++
 }
 for(const e of edges){
  if(blades>=AD_BUDGET.maxBlades)break
  if(e.distance>22)continue
  // Mount at the edge end nearer the oncoming car, perpendicular to the facade, facing back up the route.
  const ahead=route.sample(e.meters+12),bx=ahead.x-route.sample(e.meters).x,bz=ahead.z-route.sample(e.meters).z,end=(e.b[0]-e.a[0])*bx+(e.b[1]-e.a[1])*bz>0?e.a:e.b
  const along=[(e.mx-end[0]),(e.mz-end[1])],al=Math.hypot(along[0],along[1])||1,inset=Math.min(2,e.length*.2)
  const height=Math.min(7,e.building.height*.45),x=end[0]+along[0]/al*inset+e.nx*.75,z=end[1]+along[1]/al*inset+e.nz*.75,y=Math.max(height/2+3,Math.min(e.building.height-height/2-.5,height/2+4))
  if(placements.some(o=>o.id===`MB-BLADE-${e.building.id}`)||!clearOfLandmarks(x,z)||!gapOk(x,z,'blade',AD_BUDGET.bladeGap))continue
  // A blade's face normal runs along the facade; pick the sign that faces back toward the approaching car.
  const ux=(e.b[0]-e.a[0])/e.length,uz=(e.b[1]-e.a[1])/e.length,sign=ux*-bx+uz*-bz>=0?1:-1,yaw=Math.atan2(ux*sign,uz*sign)
  add({id:`MB-BLADE-${e.building.id}`,x,z,y,yaw,width:1.2,height,format:'wall',surface:'blade',routeMeters:e.meters,street:route.sample(e.meters).streetName});blades++
 }
 // Rooftop billboards: big frames on the roofs of route-facing buildings, seen over the street wall
 // (Director aerial/side shots, chase). Set back 2 m from the facade, legs standing on the roof.
 let rooftops=0
 for(const e of edges){
  if(rooftops>=AD_BUDGET.maxRooftops)break
  if(e.length<12||e.building.height<9||e.distance>30)continue
  const width=Math.min(14,e.length*.8),height=width*.42,x=e.mx-e.nx*2,z=e.mz-e.nz*2
  // One roof per building; the same clutter budget as every other surface.
  if(placements.some(o=>o.id===`MB-ROOF-${e.building.id}`)||!gapOk(x,z,'rooftop',AD_BUDGET.rooftopGap))continue
  add({id:`MB-ROOF-${e.building.id}`,x,z,y:e.building.height+1.6+height/2,yaw:Math.atan2(e.nx,e.nz),width,height,format:'billboard',surface:'rooftop',routeMeters:e.meters,street:route.sample(e.meters).streetName,groundY:e.building.height});rooftops++
 }
 if(options.hero)for(const hero of heroPlacements(data,route,clearOfLandmarks,clearsRoad,roster))placements.push(hero)
 return placements
}

/** The house roster a hero screen cycles through: every enabled, currently active campaign. */
function heroRoster(roster:readonly CruiseCampaign[]=CRUISE_CAMPAIGNS){const now=Date.now();return roster.filter(c=>c.enabled!==false&&(!c.activeFrom||Date.parse(c.activeFrom)<=now)&&(!c.activeUntil||Date.parse(c.activeUntil)>=now))}
/** Straight runs of the route. The screen sits past the run's end on its axis, so it holds the vanishing point for the whole straight. */
function heroPlacements(data:Data,route:MiamiAdRoute,clearOfLandmarks:(x:number,z:number)=>boolean,clearsRoad:(x:number,z:number,yaw:number,width:number)=>boolean,rotation:readonly CruiseCampaign[]):MiamiAdPlacement[]{
 const step=10,runs:{start:number;end:number}[]=[];let start=0,heading:[number,number]|null=null
 const dir=(m:number):[number,number]=>{const a=route.sample(m),b=route.sample(m+step),l=Math.hypot(b.x-a.x,b.z-a.z)||1;return[(b.x-a.x)/l,(b.z-a.z)/l]}
 for(let m=0;m<route.length-step;m+=step){const d=dir(m);if(!heading){heading=d;start=m;continue}
  if(d[0]*heading[0]+d[1]*heading[1]<.9975){if(m-start>=HERO.minRun)runs.push({start,end:m});heading=d;start=m}}
 if(heading&&route.length-start>=HERO.minRun)runs.push({start,end:route.length-step})
 const roster=heroRoster(rotation),out:MiamiAdPlacement[]=[]
 if(!roster.length)return out
 const tall=data.buildings.filter(b=>b.height>HERO.bottom-1)
 for(const run of runs.sort((a,b)=>(b.end-b.start)-(a.end-a.start))){
  if(out.length>=HERO.max)break
  if(out.some(o=>Math.abs(o.routeMeters-run.end)<HERO.gap))continue
  const a=route.sample(run.start),e=route.sample(run.end),l=Math.hypot(e.x-a.x,e.z-a.z)||1,fx=(e.x-a.x)/l,fz=(e.z-a.z)/l
  // One screen per straight: the first clear spot wins (a bare `break` left up to three stacked screens per run, sharing one id).
  spot:for(const ahead of[35,50,70])for(const lateral of[24,-24,32,-32,40,-40]){
   const x=e.x+fx*ahead-fz*lateral,z=e.z+fz*ahead+fx*lateral,yaw=Math.atan2(-fx,-fz)
   if(!clearOfLandmarks(x,z)||!clearsRoad(x,z,yaw,HERO.width)||!clearsBuildings(x,z,yaw,HERO.width,data)||tall.some(b=>pointInside(x,z,b.points)||b.points.some((p,i)=>segmentDistance(x,z,p,b.points[(i+1)%b.points.length])<2)))continue
   const shown=roster[0],c=copy(shown,0)
   out.push({id:`MB-HERO-${String(Math.round(run.end)).padStart(5,'0')}`,x,z,y:HERO.bottom+HERO.height/2,yaw,width:HERO.width,height:HERO.height,format:'billboard',surface:'hero',routeMeters:run.end,runStart:run.start,street:e.streetName,...c,kind:kindFor(c.campaign),rotation:roster})
   break spot
  }
 }
 return out.sort((a,b)=>a.routeMeters-b.routeMeters)
}

/** Look v2 Highway (authored I-95, not OSM): big shoulder billboards beyond the barrier, alternating sides,
 * toed in toward oncoming eyes. Same campaign rotation and copy as the city; stands reach the street grid below. */
export function createHighwayAdPlacements(route:MiamiAdRoute,campaign:CruiseCampaign,options:{every:number;right:number;left:number;y:number;groundY:number;start?:number;roster?:readonly CruiseCampaign[];idPrefix?:string}):MiamiAdPlacement[]{
 const roster=heroRoster(options.roster),pick=rotation(campaign,roster),placements:MiamiAdPlacement[]=[]
 for(let meters=options.start??300,i=0;meters<route.length-options.every/2;meters+=options.every,i++){
  const p=route.sample(meters),side=i%2?-1:1,lateral=side>0?options.right:options.left
  // Face back up the road, toed 25 degrees toward the carriageway (was +side: turned away from drivers).
  const yaw=p.yaw-side*.44,c=copy(pick(i),i)
  const digital=i%4===2
  placements.push({id:`${options.idPrefix||'I95'}-${digital?'DIG':'BB'}-${String(Math.round(meters)).padStart(5,'0')}`,x:p.x+Math.cos(p.yaw)*lateral,z:p.z-Math.sin(p.yaw)*lateral,y:p.y+options.y,yaw,width:digital?17:15,height:digital?7:6.2,format:'billboard',surface:digital?'digital':'billboard',routeMeters:meters,street:p.streetName,...c,kind:kindFor(c.campaign),rotation:digital?roster:undefined,maxDistance:280,groundY:p.y+options.groundY})
 }
 return placements
}
