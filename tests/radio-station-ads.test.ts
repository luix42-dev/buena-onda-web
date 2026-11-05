import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRadioStationCampaigns,RADIO_STATION_CAMPAIGNS,STATION_AD_COPY,stationIdForCampaign} from '../lib/cruise/radio-station-ads'
import {HUMAN_RADIO_STATIONS,STATION_DETAILS} from '../lib/human-radio/stations'
import {NEON_STATIONS} from '../lib/real-miami/neon'
import {canPlayCruiseStation} from '../lib/real-miami/stations'
import {createMiamiRoute} from '../lib/real-miami/miami-geo'
import {createMiamiAdPlacements,createHighwayAdPlacements,heroCreative} from '../lib/real-miami/advertising'
import {createHighwayRoute,HIGHWAY} from '../lib/real-miami/highway'

test('radio ads include every directly tunable station and no directory-only entry',()=>{
 assert.equal(STATION_AD_COPY['jolt-radio'].headline,'SEE YOU IN CYBERSPACE...')
 const expected=[...HUMAN_RADIO_STATIONS,...NEON_STATIONS].filter(canPlayCruiseStation).map(station=>station.id)
 assert.deepEqual(RADIO_STATION_CAMPAIGNS.map(stationIdForCampaign),expected)
 assert.equal(createRadioStationCampaigns([...HUMAN_RADIO_STATIONS,...HUMAN_RADIO_STATIONS]).length,HUMAN_RADIO_STATIONS.filter(canPlayCruiseStation).length)
 for(const campaign of RADIO_STATION_CAMPAIGNS){
  const id=stationIdForCampaign(campaign)!
  assert.ok(STATION_AD_COPY[id]?.source)
  assert.ok(campaign.creatives.billboard.headline)
  assert.equal(campaign.destination,STATION_DETAILS[id]?.website||[...HUMAN_RADIO_STATIONS,...NEON_STATIONS].find(station=>station.id===id)?.externalUrl)
  assert.ok(!campaign.destination?.startsWith('/cruise/prototype?station='))
  assert.match(campaign.analyticsId,/^station_/)
 }
})

test('City and Highway surfaces and their rotating screens contain station ads only',()=>{
 const allowed=new Set(RADIO_STATION_CAMPAIGNS.map(campaign=>campaign.id))
 const data=JSON.parse(readFileSync('public/real-miami/miami/world.json','utf8'))
 const route=createMiamiRoute(data),campaign=RADIO_STATION_CAMPAIGNS[0]
 const city=createMiamiAdPlacements(data,route,campaign,{hero:true,roster:RADIO_STATION_CAMPAIGNS})
 const highway=createHighwayAdPlacements(createHighwayRoute(),campaign,{every:HIGHWAY.billboardEvery*.6,right:HIGHWAY.barrier+8.5,left:HIGHWAY.oncoming-HIGHWAY.barrier-8.5,y:9.5,groundY:-HIGHWAY.deck,roster:RADIO_STATION_CAMPAIGNS})
 assert.ok(city.length>0&&highway.length>0)
 for(const placement of [...city,...highway]){
  assert.ok(allowed.has(placement.campaign.id),placement.id)
  assert.equal(placement.kind,'station')
  for(const rotated of placement.rotation||[])assert.ok(allowed.has(rotated.id))
  for(const time of [0,15000,30000,45000])assert.ok(allowed.has(heroCreative(placement,time).campaign.id))
 }
})
