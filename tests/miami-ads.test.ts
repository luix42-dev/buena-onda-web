import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createMiamiRoute} from '../lib/real-miami/miami-geo'
import {AD_BUDGET,ROAD_CLEARANCE,createMiamiAdPlacements,createHighwayAdPlacements,heroCreative} from '../lib/real-miami/advertising'
import {DEFAULT_CRUISE_CAMPAIGN} from '../lib/cruise/campaigns'
import {RADIO_STATION_CAMPAIGNS} from '../lib/cruise/radio-station-ads'
import {GTA_VI_CAMPAIGN} from '../lib/cruise/gta-vi-campaign'
import {createHighwayRoute,HIGHWAY} from '../lib/real-miami/highway'
import {cityInterchangeMeters,distanceToExit,HIGHWAY_CITY_EXIT_METERS} from '../lib/cruise-os/interchange'
import {createCausewayRoute,createConnectedHighwayRoute} from '../lib/real-miami/connected-drive'
import registry from '../public/real-miami/miami/landmarks.json'

const data=JSON.parse(readFileSync('public/real-miami/miami/world.json','utf8'))
const route=createMiamiRoute(data)
const placements=createMiamiAdPlacements(data,route,DEFAULT_CRUISE_CAMPAIGN)
const world=placements.filter(p=>p.surface!=='poster')

test('every world surface is present and ids are stable and unique',()=>{
 for(const surface of['billboard','projection','blade','rooftop'])assert.ok(world.some(p=>p.surface===surface),surface)
 assert.equal(new Set(placements.map(p=>p.id)).size,placements.length)
 assert.deepEqual(createMiamiAdPlacements(data,route,DEFAULT_CRUISE_CAMPAIGN).map(p=>p.id),placements.map(p=>p.id))
})

test('clutter budget: minimum gap, per-surface caps and landmark clear zones hold',()=>{
 for(let i=0;i<world.length;i++)for(let j=i+1;j<world.length;j++)assert.ok(Math.hypot(world[i].x-world[j].x,world[i].z-world[j].z)>=AD_BUDGET.minGap-1e-6,`${world[i].id} / ${world[j].id}`)
 assert.ok(world.filter(p=>p.surface==='projection').length<=AD_BUDGET.maxProjections)
 assert.ok(world.filter(p=>p.surface==='blade').length<=AD_BUDGET.maxBlades)
 assert.ok(world.filter(p=>p.surface==='rooftop').length<=AD_BUDGET.maxRooftops)
 for(const landmark of registry.landmarks)for(const p of world)assert.ok(Math.hypot(landmark.position.x-p.x,landmark.position.z-p.z)>AD_BUDGET.landmarkClear,`${p.id} near ${landmark.kind}`)
})

test('roadside and hero panels clear every City route segment across their full width',()=>{
 const clear=world.filter(p=>p.surface==='billboard'||p.surface==='hero')
 assert.ok(clear.length>10)
 for(const p of clear)for(const fraction of[-.5,-.3,0,.3,.5]){
  const x=p.x+Math.cos(p.yaw)*p.width*fraction,z=p.z-Math.sin(p.yaw)*p.width*fraction
  let nearest=Infinity
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)))
   nearest=Math.min(nearest,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz))
  }
  assert.ok(nearest>=ROAD_CLEARANCE,`${p.id} panel crosses the road (${nearest.toFixed(2)} m)`)
 }
})

test('prototype ads link to advertiser sites and rotate the official GTA VI placement',()=>{
 for(const station of RADIO_STATION_CAMPAIGNS){assert.ok(station.destination);assert.ok(!station.destination.startsWith('/cruise/prototype?station='),station.id)}
 assert.equal(GTA_VI_CAMPAIGN.destination,'https://www.rockstargames.com/VI/editions')
 const roster=[...RADIO_STATION_CAMPAIGNS,GTA_VI_CAMPAIGN]
 const city=createMiamiAdPlacements(data,route,roster[0],{hero:true,roster})
 assert.ok(city.some(p=>p.campaign.id===GTA_VI_CAMPAIGN.id)||city.some(p=>p.rotation?.some(c=>c.id===GTA_VI_CAMPAIGN.id)))
 assert.ok(city.every(p=>p.campaign.destination&&(!p.rotation||p.rotation.every(c=>c.destination))))
})

test('Highway and both causeway directions keep billboard faces beyond the paved shoulder',()=>{
 const highway=createConnectedHighwayRoute(data.origin)
 const routes=[
  {route:highway,options:{every:HIGHWAY.billboardEvery*.6,right:HIGHWAY.barrier+8.5,left:HIGHWAY.oncoming-HIGHWAY.barrier-8.5,y:9.5,groundY:-HIGHWAY.deck},roadHalfWidth:HIGHWAY.barrier},
  ...(['outbound','inbound'] as const).map(direction=>({route:createCausewayRoute(route,highway,direction,data.origin),options:{every:620,right:21,left:-21,y:8.5,groundY:-12,start:360},roadHalfWidth:11})),
 ]
 for(const {route,options,roadHalfWidth} of routes){
  const ads=createHighwayAdPlacements(route,DEFAULT_CRUISE_CAMPAIGN,options)
  assert.ok(ads.length>5)
  for(const ad of ads)for(const fraction of[-.5,0,.5]){
   const x=ad.x+Math.cos(ad.yaw)*ad.width*fraction,z=ad.z-Math.sin(ad.yaw)*ad.width*fraction
   let distance=Infinity
   for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)))
    distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz))
   }
   assert.ok(distance>roadHalfWidth,`${ad.id} crosses pavement by ${roadHalfWidth-distance} m`)
  }
 }
})

test('the featured campaign leads but the roster rotates, and projections carry motion campaigns',()=>{
 const counts=new Map<string,number>();for(const p of placements)counts.set(p.campaign.id,(counts.get(p.campaign.id)||0)+1)
 assert.ok(counts.size>=4)
 assert.ok(world.filter(p=>p.surface==='projection').some(p=>p.campaign.digitalVideo))
})

test('highway digital screens rotate through linked house campaigns while static boards keep their creative',()=>{
 const highway=createHighwayRoute(),boards=createHighwayAdPlacements(highway,DEFAULT_CRUISE_CAMPAIGN,{every:HIGHWAY.billboardEvery*.6,right:HIGHWAY.barrier+8.5,left:HIGHWAY.oncoming-HIGHWAY.barrier-8.5,y:9.5,groundY:-HIGHWAY.deck})
 const digital=boards.find(p=>p.surface==='digital'),still=boards.find(p=>p.surface==='billboard')
 assert.ok(digital&&still)
 assert.equal(heroCreative(still,0).campaign.id,still.campaign.id)
 const seen=new Set(Array.from({length:10},(_,i)=>heroCreative(digital,i*15000).campaign.id))
 assert.ok(seen.size>=4)
 for(let i=0;i<10;i++)assert.ok(heroCreative(digital,i*15000).campaign.destination)
 assert.equal(new Set(boards.map(p=>p.id)).size,boards.length)
})

test('the City interchange joins westbound 5th Street before West Avenue and both exit distances wrap',()=>{
 const cityExit=cityInterchangeMeters(route)
 assert.equal(route.sample(cityExit).streetName,'5th Street')
 assert.ok(route.sample(cityExit).x < -600)
 assert.ok(cityExit>0&&cityExit<route.length)
 assert.equal(distanceToExit(cityExit,cityExit,route.length),0)
 assert.equal(distanceToExit(cityExit-200,cityExit,route.length),200)
 assert.equal(distanceToExit(HIGHWAY_CITY_EXIT_METERS-200,HIGHWAY_CITY_EXIT_METERS,HIGHWAY.length),200)
})
