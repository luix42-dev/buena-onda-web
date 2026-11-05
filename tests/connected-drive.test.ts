import test from 'node:test'
import assert from 'node:assert/strict'
import data from '../public/real-miami/miami/world.json'
import {createMiamiRoute} from '../lib/real-miami/miami-geo'
import type {MiamiGeoData} from '../lib/real-miami/miami-geo'
import {cityInterchangeMeters} from '../lib/cruise-os/interchange'
import {CAUSEWAY,createCausewayRoute,createConnectedHighwayRoute} from '../lib/real-miami/connected-drive'

test('MacArthur Causeway connects both driving worlds without a position or heading jump',()=>{
 const map=data as unknown as MiamiGeoData
 const city=createMiamiRoute(map),highway=createConnectedHighwayRoute(map.origin)
 const outbound=createCausewayRoute(city,highway,'outbound',map.origin)
 const inbound=createCausewayRoute(city,highway,'inbound',map.origin)
 const seams=[
  [city.sample(cityInterchangeMeters(city)),outbound.sample(0)],
  [outbound.sample(outbound.length),highway.sample(0)],
  [highway.sample(CAUSEWAY.highwayExitMeters),inbound.sample(0)],
  [inbound.sample(inbound.length),city.sample(CAUSEWAY.cityReturnMeters)],
 ]
 for(const [a,b] of seams){
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.5)
  assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)))<.08)
 }
 assert.ok(outbound.length>5000&&outbound.length<6000)
 assert.ok(inbound.length>9000)
 assert.equal(outbound.sample(outbound.length*.5).streetName,'MacArthur Causeway / Biscayne Bay')
 assert.equal(outbound.sample(outbound.length-200).streetName,'I-395 Signature Bridge / Downtown')
})
