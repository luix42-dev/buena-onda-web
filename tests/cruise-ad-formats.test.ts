/** Ad formats + signature campaigns: format model, pricing reuse, apparition measurement, placement. TEST data only. */
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createMiamiRoute} from '../lib/real-miami/miami-geo'
import type {MiamiAdPlacement} from '../lib/real-miami/advertising'
import {BUYOUT_MULTIPLIER as PLOT_BUYOUT,FLOOR_CENTS,priceCents} from '../components/cruise/master/plots'
import {
 AD_FORMATS,BUYOUT_MULTIPLIER,EXISTING_QUALIFIED_EXPOSURE_MS,formatFloorCents,formatForSurface,formatPriceCents,isSurfaceEligible,
 measureApparition,qualifiesApparitionSample,qualifiesStandardExposure,type ApparitionSample,
} from '../lib/cruise/ad-formats'
import {
 NOVA_SIGNATURE_CAMPAIGN,SIGNATURE_CAMPAIGNS,beatAt,canDeliverSignature,characterOnScreenAt,createSignaturePlacements,kindForAnalyticsId,
 straightRuns,toCruiseCampaign,unproducedAssets,validateSignatureCampaign,type SignatureCampaign,type SignaturePlacement,
} from '../lib/cruise/signature-campaigns'

const data=JSON.parse(readFileSync('public/real-miami/miami/world.json','utf8'))
const route=createMiamiRoute(data)

test('formats: three tiers map onto the right surfaces',()=>{
 assert.deepEqual(Object.keys(AD_FORMATS).sort(),['premium-cinematic','signature-character','standard'])
 for(const s of['billboard','poster','projection','blade'] as const){assert.ok(isSurfaceEligible('standard',s));assert.equal(formatForSurface(s),'standard')}
 assert.equal(formatForSurface('hero'),'premium-cinematic')
 assert.ok(AD_FORMATS['premium-cinematic'].futureSurfaces.includes('facade-video'))
 assert.equal(formatForSurface('signature'),'signature-character')
 assert.ok(!isSurfaceEligible('standard','hero')&&!isSurfaceEligible('premium-cinematic','signature'))
})

test('pricing: standard reuses the Avenue floor and 1.5x buyout; unapproved formats are not for sale',()=>{
 assert.equal(BUYOUT_MULTIPLIER,PLOT_BUYOUT)
 assert.equal(formatFloorCents('standard'),FLOOR_CENTS.billboard)
 assert.equal(formatPriceCents('standard',{status:'open',valueCents:0}),FLOOR_CENTS.billboard)
 for(const valueCents of[25_000,40_000,100])assert.equal(formatPriceCents('standard',{status:'claimed',valueCents}),priceCents({kind:'billboard',status:'claimed',valueCents}))
 assert.equal(formatPriceCents('standard',{status:'claimed',valueCents:25_000}),37_500)
 assert.equal(formatPriceCents('standard',{status:'house',valueCents:0}),null)
 for(const tier of['premium-cinematic','signature-character'] as const){
  assert.equal(AD_FORMATS[tier].pricing.status,'unapproved-placeholder')
  assert.equal(formatFloorCents(tier),null)
  assert.equal(formatPriceCents(tier,{status:'claimed',valueCents:50_000}),null)
 }
})

test('measurement: standard keeps the existing 2 s viewable rule; signature is flagged as proposed',()=>{
 assert.equal(EXISTING_QUALIFIED_EXPOSURE_MS,2000)
 assert.ok(qualifiesStandardExposure({viewable:true,visibleDurationMs:2000}))
 assert.ok(!qualifiesStandardExposure({viewable:true,visibleDurationMs:1999})&&!qualifiesStandardExposure({viewable:false,visibleDurationMs:9000}))
 assert.equal(AD_FORMATS['signature-character'].measurement.status,'proposed-unapproved')
 assert.ok(AD_FORMATS['signature-character'].measurement.onlyWhileCharacterOnScreen)
})

const good=(at:number,patch:Partial<ApparitionSample>={}):ApparitionSample=>({visible:true,viewable:true,occlusion:0,pixelHeight:400,sampledAt:at,characterOnScreen:true,...patch})
const series=(ms:number,patch?:(at:number)=>Partial<ApparitionSample>)=>Array.from({length:ms/250+1},(_,i)=>good(i*250,patch?.(i*250)))

test('apparition: only on-screen, unoccluded, large-enough continuous time counts',()=>{
 const rule=AD_FORMATS['signature-character'].measurement
 assert.ok(qualifiesApparitionSample(good(0)))
 assert.ok(!qualifiesApparitionSample(good(0,{characterOnScreen:false})),'between beats / dissolved')
 assert.ok(!qualifiesApparitionSample(good(0,{occlusion:.5})),'occluded')
 assert.ok(!qualifiesApparitionSample(good(0,{pixelHeight:rule.minPixelHeight-1})),'too small')
 assert.ok(!qualifiesApparitionSample(good(0,{viewable:false})))
 const full=measureApparition(series(rule.minViewableMs))
 assert.equal(full.impressions,1);assert.equal(full.longestStreakMs,rule.minViewableMs)
 assert.equal(measureApparition(series(rule.minViewableMs-250)).impressions,0)
 // Occlusion in the middle splits the streak: two short streaks are not one impression.
 const split=measureApparition(series(rule.minViewableMs+500,at=>at===1500?{occlusion:1}:{}))
 assert.equal(split.impressions,0);assert.ok(split.qualifiedMs<rule.minViewableMs+500)
 // The giant off screen never counts even if the face geometry is viewable.
 assert.equal(measureApparition(series(10_000,()=>({characterOnScreen:false}))).qualifiedMs,0)
 // A sampling gap breaks continuity.
 assert.equal(measureApparition([good(0),good(2500),good(5000)]).impressions,0)
 // One impression per apparition, however long it lasts.
 assert.equal(measureApparition(series(20_000)).impressions,1)
})

test('NOVA house campaign: valid, disclosed, world-only, every asset a marked placeholder',()=>{
 const c=NOVA_SIGNATURE_CAMPAIGN
 assert.deepEqual(validateSignatureCampaign(c),[])
 assert.equal(c.kind,'house');assert.equal(kindForAnalyticsId(c.analyticsId),'house');assert.ok(c.disclosureLabel.length>0)
 assert.equal(c.deliveredBy,'world')
 for(const key of['dialogue','lines','voiceLines','companionPrompt'])assert.ok(!(key in c))
 const missing=unproducedAssets(c)
 assert.ok(missing.length>=7)
 for(const url of missing)assert.ok(url.startsWith('/real-miami/nova/'),url)
 assert.equal(toCruiseCampaign(c).digitalFallbackImage,undefined,'no unproduced still is handed to the renderer')
 assert.ok(SIGNATURE_CAMPAIGNS.includes(c))
})

test('beats and frequency cap',()=>{
 const c=NOVA_SIGNATURE_CAMPAIGN
 assert.equal(beatAt(c,0)?.id,'approach');assert.equal(beatAt(c,3000)?.id,'gaze-follow');assert.equal(beatAt(c,7000)?.id,'brand-reveal');assert.equal(beatAt(c,9500)?.id,'dissolve')
 assert.equal(beatAt(c,99_000),null)
 assert.ok(characterOnScreenAt(c,7000));assert.ok(!characterOnScreenAt(c,9500));assert.ok(!characterOnScreenAt(c,99_000))
 assert.ok(canDeliverSignature(c,0)&&canDeliverSignature(c,c.frequencyCapPerSession-1));assert.ok(!canDeliverSignature(c,c.frequencyCapPerSession))
})

test('validation rejects mismatched kind, missing disclosure, companion dialogue',()=>{
 const sponsored:SignatureCampaign={...NOVA_SIGNATURE_CAMPAIGN,id:'test-sponsor',advertiserName:'TEST Brand',analyticsId:'test_brand',kind:'sponsored',disclosureLabel:'Sponsored'}
 assert.deepEqual(validateSignatureCampaign(sponsored),[])
 assert.ok(validateSignatureCampaign({...sponsored,kind:'house'}).length)
 assert.ok(validateSignatureCampaign({...sponsored,disclosureLabel:' '}).length)
 assert.ok(validateSignatureCampaign({...sponsored,disclosureLabel:'TEST Brand'}).length,'sponsored must say so')
 const withLines={...sponsored,lines:['buy now']} as unknown as SignatureCampaign
 assert.ok(validateSignatureCampaign(withLines).some(i=>i.includes('companion')))
 assert.deepEqual(createSignaturePlacements(route,withLines),[])
 // @ts-expect-error signature campaigns carry no dialogue lines (type-level companion separation)
 const typed:SignatureCampaign={...sponsored,lines:['buy now']};void typed
})

test('placements on the real Miami route: stable, spaced, on straights, MiamiAdPlacement-compatible',()=>{
 const buildings=data.buildings as {points:number[][];height:number}[]
 const placements=createSignaturePlacements(route,NOVA_SIGNATURE_CAMPAIGN,{buildings})
 assert.ok(placements.length>=1,'at least one straight qualifies')
 assert.ok(placements.length<=NOVA_SIGNATURE_CAMPAIGN.placement.maxPerRoute)
 assert.deepEqual(createSignaturePlacements(route,NOVA_SIGNATURE_CAMPAIGN,{buildings}).map(p=>p.id),placements.map(p=>p.id))
 assert.equal(new Set(placements.map(p=>p.id)).size,placements.length)
 const runs=straightRuns(route,NOVA_SIGNATURE_CAMPAIGN.placement.minRunMeters)
 for(const p of placements){
  assert.equal(p.surface,'signature');assert.equal(p.format,'billboard');assert.equal(p.kind,'house');assert.equal(p.disclosureLabel,'Buena Onda house ad')
  assert.ok(runs.some(r=>r.end===p.routeMeters&&r.start===p.runStart))
  assert.ok(p.routeMeters-p.runStart!>=NOVA_SIGNATURE_CAMPAIGN.placement.minRunMeters)
  assert.ok(p.apparition.triggerRouteMeters>=p.runStart!&&p.apparition.triggerRouteMeters<p.routeMeters)
  assert.equal(p.apparition.durationMs,10_500)
  assert.equal(p.height,60);assert.equal(p.y,30)
  for(const b of buildings)assert.ok(!b.points.length||!(b.height>60*NOVA_SIGNATURE_CAMPAIGN.placement.maxSkylineCover&&b.points.some(q=>Math.hypot(q[0]-p.x,q[1]-p.z)<1)),'figure base not inside a tall building')
 }
 for(let i=1;i<placements.length;i++)assert.ok(Math.abs(placements[i].routeMeters-placements[i-1].routeMeters)>=NOVA_SIGNATURE_CAMPAIGN.placement.gapMeters)
 // After the one-line MiamiAdSurface change this is assignable as-is; today the rest of the shape already matches.
 const shape:Omit<MiamiAdPlacement,'surface'|'format'>[]=placements;assert.ok(shape)
 const asSignature:SignaturePlacement[]=placements;assert.ok(asSignature)
})

test('placements respect veto, avoid list and campaign activity',()=>{
 assert.deepEqual(createSignaturePlacements(route,NOVA_SIGNATURE_CAMPAIGN,{clear:()=>false}),[])
 const base=createSignaturePlacements(route,NOVA_SIGNATURE_CAMPAIGN)
 const avoided=createSignaturePlacements(route,NOVA_SIGNATURE_CAMPAIGN,{avoid:base.map(p=>({x:p.x,z:p.z})),avoidMeters:1})
 for(const p of avoided)assert.ok(base.every(b=>Math.hypot(b.x-p.x,b.z-p.z)>=1))
 assert.deepEqual(createSignaturePlacements(route,{...NOVA_SIGNATURE_CAMPAIGN,enabled:false}),[])
 assert.deepEqual(createSignaturePlacements(route,{...NOVA_SIGNATURE_CAMPAIGN,activeUntil:'2000-01-01T00:00:00Z'}),[])
})
