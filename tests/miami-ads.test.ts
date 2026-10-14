import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createMiamiRoute} from '../lib/real-miami/miami-geo'
import {AD_BUDGET,createMiamiAdPlacements} from '../lib/real-miami/advertising'
import {DEFAULT_CRUISE_CAMPAIGN} from '../lib/cruise/campaigns'
import registry from '../public/real-miami/miami/landmarks.json'

const data=JSON.parse(readFileSync('public/real-miami/miami/world.json','utf8'))
const route=createMiamiRoute(data)
const placements=createMiamiAdPlacements(data,route,DEFAULT_CRUISE_CAMPAIGN)
const world=placements.filter(p=>p.surface!=='poster')

test('every world surface is present and ids are stable and unique',()=>{
 for(const surface of['billboard','projection','blade'])assert.ok(world.some(p=>p.surface===surface),surface)
 assert.equal(new Set(placements.map(p=>p.id)).size,placements.length)
 assert.deepEqual(createMiamiAdPlacements(data,route,DEFAULT_CRUISE_CAMPAIGN).map(p=>p.id),placements.map(p=>p.id))
})

test('clutter budget: minimum gap, per-surface caps and landmark clear zones hold',()=>{
 for(let i=0;i<world.length;i++)for(let j=i+1;j<world.length;j++)assert.ok(Math.hypot(world[i].x-world[j].x,world[i].z-world[j].z)>=AD_BUDGET.minGap-1e-6,`${world[i].id} / ${world[j].id}`)
 assert.ok(world.filter(p=>p.surface==='projection').length<=AD_BUDGET.maxProjections)
 assert.ok(world.filter(p=>p.surface==='blade').length<=AD_BUDGET.maxBlades)
 for(const landmark of registry.landmarks)for(const p of world)assert.ok(Math.hypot(landmark.position.x-p.x,landmark.position.z-p.z)>AD_BUDGET.landmarkClear,`${p.id} near ${landmark.kind}`)
})

test('the featured campaign leads but the roster rotates, and projections carry motion campaigns',()=>{
 const counts=new Map<string,number>();for(const p of placements)counts.set(p.campaign.id,(counts.get(p.campaign.id)||0)+1)
 assert.ok(counts.size>=4)
 assert.ok(world.filter(p=>p.surface==='projection').some(p=>p.campaign.digitalVideo))
})
