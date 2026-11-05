/**
 * Signature campaigns: the creative that fills the 'signature-character' format (lib/cruise/ad-formats.ts).
 * Campaign-agnostic: any advertiser can buy one; Buena Onda's NOVA is only the first (house) creative.
 *
 * COMPANION SEPARATION. The in-car companion (NOVA / HoloHost in the cockpit) must NEVER deliver an ad.
 * A signature campaign is a world installation only: it has no dialogue, no voice lines and no chat hooks.
 * The type enforces it: `dialogue`, `lines`, `voiceLines` and `companionPrompt` are `never`, and audio is
 * restricted to ambience / music / sfx (no speech). Do not route signature brand copy into companion speech.
 */
import type {CruiseCampaign,CruiseAdCreative} from './types'
import type {MiamiAdPlacement} from '@/lib/real-miami/advertising'
import {HERO} from '@/lib/real-miami/advertising'

export type SignatureCampaignKind=MiamiAdPlacement['kind']
export type SignatureBeatId='approach'|'gaze-follow'|'brand-reveal'|'dissolve'
export type SignatureBeat={
 id:SignatureBeatId
 startMs:number
 durationMs:number
 /** Exposure counts only while the giant is actually rendered in this beat (see ad-formats measurement). */
 characterVisible:boolean
 /** Pre-rendered alpha video for this beat (WebM VP9 alpha / HEVC alpha pair). */
 alphaVideo:SignatureAsset
}
/** `produced:false` = path reserved, file does not exist yet. Renderers must fall back (poster or skip). */
export type SignatureAsset={url:`/${string}`;produced:boolean;note?:string}
export type SignatureCharacterAsset={
 posterStill:SignatureAsset
 /** Back-to-front parallax layers for the still / low-tier fallback. */
 depthLayers:readonly (SignatureAsset&{depth:number})[]
 /** Height of the figure in world metres at full scale, and its aspect (width / height). */
 heightMeters:number
 aspect:number
 /** Non-speech audio only. Speech belongs to nobody here (see companion separation above). */
 audio?:SignatureAsset&{kind:'ambience'|'music'|'sfx'}
}
export type SignatureBrandLockup={
 /** Advertiser mark as shown in-world. Either text or a logo asset, or both. */
 text:string
 logo?:SignatureAsset
 cta:string
 destination:CruiseCampaign['destination']
 /** Revealed during the 'brand-reveal' beat. */
 eyebrow?:string
 colors:{background:`#${string}`;foreground:`#${string}`;accent:`#${string}`}
}
export type SignaturePlacementConstraints={
 /** Only straights at least this long (metres of route with heading change under ~4 degrees). */
 minRunMeters:number
 /** Minimum route metres between two signature apparitions. */
 gapMeters:number
 /** How far past the run's end the giant stands, on the run axis (it holds the vanishing point). */
 aheadMeters:readonly number[]
 /** Buildings in the sightline corridor must stay below this fraction of the figure's height above ground. */
 maxSkylineCover:number
 maxPerRoute:number
 /** Restrict to street-name patterns (e.g. city boulevards); omit for any. */
 streets?:RegExp
}
export type SignatureCampaign={
 id:string
 advertiserName:string
 /** Must start with house_ / demo_ / anything else, matching kind (same rule as advertising.ts kindFor). */
 analyticsId:string
 kind:SignatureCampaignKind
 /** Always rendered with the lockup, e.g. 'Sponsored' or 'Buena Onda house ad'. Never empty. */
 disclosureLabel:string
 characterAsset:SignatureCharacterAsset
 beats:readonly SignatureBeat[]
 brandLockup:SignatureBrandLockup
 placement:SignaturePlacementConstraints
 /** Max apparitions of this campaign per Cruise session. */
 frequencyCapPerSession:number
 enabled?:boolean
 activeFrom?:string
 activeUntil?:string
 /** World installation only. */
 deliveredBy:'world'
 dialogue?:never
 lines?:never
 voiceLines?:never
 companionPrompt?:never
}

/** Mirrors the private kindFor() in lib/real-miami/advertising.ts. If the lead exports kindFor, use it here. */
export const kindForAnalyticsId=(analyticsId:string):SignatureCampaignKind=>analyticsId.startsWith('house_')?'house':analyticsId.startsWith('demo_')?'demo':'sponsored'

export const DEFAULT_SIGNATURE_CONSTRAINTS:SignaturePlacementConstraints={minRunMeters:Math.max(400,HERO.minRun),gapMeters:1800,aheadMeters:[180,240,300],maxSkylineCover:.4,maxPerRoute:3}

const NOVA='/real-miami/nova' as const
const reserved=(file:string):SignatureAsset=>({url:`${NOVA}/${file}`,produced:false,note:'PLACEHOLDER: not yet produced'})

/** House campaign. ALL ASSET URLS ARE PLACEHOLDERS: nothing under /real-miami/nova/ has been produced. */
export const NOVA_SIGNATURE_CAMPAIGN:SignatureCampaign={
 id:'buena-onda-nova-signature',
 advertiserName:'Buena Onda',
 analyticsId:'house_buena_onda_nova_signature',
 kind:'house',
 disclosureLabel:'Buena Onda house ad',
 characterAsset:{
  posterStill:reserved('poster.webp'),
  depthLayers:[{...reserved('layer-sky.webp'),depth:1},{...reserved('layer-figure.webp'),depth:.5},{...reserved('layer-fore.webp'),depth:0}],
  heightMeters:60,aspect:.5,
  audio:{...reserved('ambience.ogg'),kind:'ambience'},
 },
 beats:[
  {id:'approach',startMs:0,durationMs:2500,characterVisible:true,alphaVideo:reserved('approach.webm')},
  {id:'gaze-follow',startMs:2500,durationMs:3500,characterVisible:true,alphaVideo:reserved('gaze-follow.webm')},
  {id:'brand-reveal',startMs:6000,durationMs:3000,characterVisible:true,alphaVideo:reserved('brand-reveal.webm')},
  {id:'dissolve',startMs:9000,durationMs:1500,characterVisible:false,alphaVideo:reserved('dissolve.webm')},
 ],
 brandLockup:{text:'BUENA ONDA',eyebrow:'MIAMI',cta:'Stay for one song',destination:'/radio',colors:{background:'#17120f',foreground:'#f5eee8',accent:'#ff4fa3'}},
 placement:DEFAULT_SIGNATURE_CONSTRAINTS,
 frequencyCapPerSession:2,
 deliveredBy:'world',
}
export const SIGNATURE_CAMPAIGNS:readonly SignatureCampaign[]=[NOVA_SIGNATURE_CAMPAIGN]

export const apparitionDurationMs=(campaign:SignatureCampaign)=>campaign.beats.reduce((end,b)=>Math.max(end,b.startMs+b.durationMs),0)
export function beatAt(campaign:SignatureCampaign,elapsedMs:number):SignatureBeat|null{
 return campaign.beats.find(b=>elapsedMs>=b.startMs&&elapsedMs<b.startMs+b.durationMs)??null
}
/** Feed this into ApparitionSample.characterOnScreen. Occlusion and framing are still measured separately. */
export const characterOnScreenAt=(campaign:SignatureCampaign,elapsedMs:number)=>beatAt(campaign,elapsedMs)?.characterVisible===true
export const canDeliverSignature=(campaign:SignatureCampaign,deliveredThisSession:number)=>campaign.enabled!==false&&deliveredThisSession<campaign.frequencyCapPerSession

export function isSignatureActive(campaign:SignatureCampaign,now=Date.now()){
 return campaign.enabled!==false&&(!campaign.activeFrom||Date.parse(campaign.activeFrom)<=now)&&(!campaign.activeUntil||Date.parse(campaign.activeUntil)>=now)
}

/** Structural problems that should block a campaign from shipping. Empty = valid. */
export function validateSignatureCampaign(campaign:SignatureCampaign):string[]{
 const issues:string[]=[]
 if(kindForAnalyticsId(campaign.analyticsId)!==campaign.kind)issues.push(`kind ${campaign.kind} does not match analyticsId ${campaign.analyticsId}`)
 if(!campaign.disclosureLabel.trim())issues.push('disclosureLabel is empty')
 if(campaign.kind==='sponsored'&&!/sponsored|ad\b|advert/i.test(campaign.disclosureLabel))issues.push('sponsored campaigns must disclose as sponsored/ad')
 const order:SignatureBeatId[]=['approach','gaze-follow','brand-reveal','dissolve']
 if(campaign.beats.map(b=>b.id).join()!==order.join())issues.push('beats must be approach, gaze-follow, brand-reveal, dissolve in order')
 for(let i=1;i<campaign.beats.length;i++)if(campaign.beats[i].startMs<campaign.beats[i-1].startMs+campaign.beats[i-1].durationMs)issues.push(`beat ${campaign.beats[i].id} overlaps the previous beat`)
 if(campaign.beats.some(b=>b.durationMs<=0))issues.push('beat durations must be positive')
 if(campaign.frequencyCapPerSession<1)issues.push('frequencyCapPerSession must be >= 1')
 if(campaign.deliveredBy!=='world')issues.push('signature campaigns are world-only')
 const raw=campaign as unknown as Record<string,unknown>
 for(const key of['dialogue','lines','voiceLines','companionPrompt'])if(key in raw)issues.push(`${key} is not allowed: the companion never delivers ads`)
 return issues
}
/** Assets still marked produced:false. Non-empty = the campaign can only run in placeholder/fallback mode. */
export function unproducedAssets(campaign:SignatureCampaign):string[]{
 const a=campaign.characterAsset
 return [a.posterStill,...a.depthLayers,...(a.audio?[a.audio]:[]),...(campaign.brandLockup.logo?[campaign.brandLockup.logo]:[]),...campaign.beats.map(b=>b.alphaVideo)].filter(x=>!x.produced).map(x=>x.url)
}

/** Adapter so signature placements flow through existing analytics/CTA code that expects a CruiseCampaign. */
export function toCruiseCampaign(campaign:SignatureCampaign):CruiseCampaign{
 const l=campaign.brandLockup,creative:CruiseAdCreative={eyebrow:l.eyebrow??campaign.disclosureLabel.toUpperCase(),headline:l.text,footer:l.cta,...l.colors}
 const still=campaign.characterAsset.posterStill
 return{id:campaign.id,name:campaign.advertiserName,analyticsId:campaign.analyticsId,destination:l.destination,enabled:campaign.enabled,activeFrom:campaign.activeFrom,activeUntil:campaign.activeUntil,
  ...(still.produced?{digitalFallbackImage:still.url}:{}),creatives:{billboard:creative,wall:creative,poster:creative}}
}

/**
 * MiamiAdPlacement-compatible entry for the new 'signature' surface. advertising.ts is not edited here;
 * the lead widens MiamiAdSurface with one line (docs/cruise/nova/AD-FORMATS.md), after which
 * SignaturePlacement is assignable to MiamiAdPlacement.
 */
export type SignaturePlacement=Omit<MiamiAdPlacement,'surface'|'format'>&{
 surface:'signature'
 format:'billboard'
 signatureCampaignId:string
 disclosureLabel:string
 /** Apparition timing: start the beat timeline when the car passes triggerRouteMeters on this run. */
 apparition:{triggerRouteMeters:number;durationMs:number;beats:readonly SignatureBeat[];frequencyCapPerSession:number}
}

export type SignatureRoute={length:number;sample(meters:number):{x:number;z:number;y?:number;streetName:string}}
export type SignatureBuilding={points:number[][];height:number}
export type SignaturePlacementOptions={
 buildings?:readonly SignatureBuilding[]
 /** Extra veto, e.g. landmark clear zones or existing hero screens. */
 clear?:(x:number,z:number)=>boolean
 /** Existing placements the giant must keep away from (hero screens etc.). */
 avoid?:readonly {x:number;z:number}[]
 avoidMeters?:number
 groundY?:number
 /** Leave this many route metres between run start and trigger so the giant appears with the straight ahead. */
 leadInMeters?:number
 constraints?:Partial<SignaturePlacementConstraints>
 now?:number
}

const pointInside=(x:number,z:number,polygon:number[][])=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
const segmentDistance=(x:number,z:number,a:number[],b:number[])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)}
const near=(x:number,z:number,b:SignatureBuilding,r:number)=>pointInside(x,z,b.points)||b.points.some((p,i)=>segmentDistance(x,z,p,b.points[(i+1)%b.points.length])<r)

/** Straight runs, same heading test as advertising.ts heroPlacements (dot >= .9975 per 10 m). */
export function straightRuns(route:SignatureRoute,minRun:number){
 const step=10,runs:{start:number;end:number}[]=[];let start=0,heading:[number,number]|null=null
 const dir=(m:number):[number,number]=>{const a=route.sample(m),b=route.sample(m+step),l=Math.hypot(b.x-a.x,b.z-a.z)||1;return[(b.x-a.x)/l,(b.z-a.z)/l]}
 for(let m=0;m<route.length-step;m+=step){const d=dir(m);if(!heading){heading=d;start=m;continue}
  if(d[0]*heading[0]+d[1]*heading[1]<.9975){if(m-start>=minRun)runs.push({start,end:m});heading=d;start=m}}
 if(heading&&route.length-start>=minRun)runs.push({start,end:route.length-step})
 return runs
}

/**
 * Places a campaign's giant at the far end of the longest straights, on the run axis, where the skyline
 * corridor leaves at least (1 - maxSkylineCover) of the figure visible. Deterministic for a given route.
 * Returns [] when the campaign is inactive or invalid: an invalid campaign must not reach the world.
 */
export function createSignaturePlacements(route:SignatureRoute,campaign:SignatureCampaign,options:SignaturePlacementOptions={}):SignaturePlacement[]{
 if(!isSignatureActive(campaign,options.now)||validateSignatureCampaign(campaign).length)return []
 const c={...DEFAULT_SIGNATURE_CONSTRAINTS,...campaign.placement,...options.constraints}
 const height=campaign.characterAsset.heightMeters,width=height*campaign.characterAsset.aspect,groundY=options.groundY??0
 const buildings=options.buildings??[],coverLimit=groundY+height*c.maxSkylineCover,avoidMeters=options.avoidMeters??60
 const cruise=toCruiseCampaign(campaign),durationMs=apparitionDurationMs(campaign),out:SignaturePlacement[]=[]
 for(const run of straightRuns(route,c.minRunMeters).sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start)){
  if(out.length>=c.maxPerRoute)break
  if(out.some(o=>Math.abs(o.routeMeters-run.end)<c.gapMeters))continue
  const a=route.sample(run.start),e=route.sample(run.end)
  if(c.streets&&!c.streets.test(e.streetName))continue
  const l=Math.hypot(e.x-a.x,e.z-a.z)||1,fx=(e.x-a.x)/l,fz=(e.z-a.z)/l
  for(const ahead of c.aheadMeters){
   const x=e.x+fx*ahead,z=e.z+fz*ahead
   if(options.clear&&!options.clear(x,z))continue
   if(options.avoid?.some(p=>Math.hypot(p.x-x,p.z-z)<avoidMeters))continue
   if(buildings.some(b=>near(x,z,b,width/2)))continue
   // Sightline corridor from the run's end to the figure: nothing tall enough to hide the giant.
   let blocked=false
   for(let s=0;s<=ahead&&!blocked;s+=10){const px=e.x+fx*s,pz=e.z+fz*s;blocked=buildings.some(b=>b.height>coverLimit&&near(px,pz,b,width/2))}
   if(blocked)continue
   const leadIn=Math.min(options.leadInMeters??60,Math.max(0,run.end-run.start-1))
   out.push({id:`SIG-${campaign.id}-${String(Math.round(run.end)).padStart(5,'0')}`,x,z,y:groundY+height/2,yaw:Math.atan2(-fx,-fz),width,height,format:'billboard',surface:'signature',
    routeMeters:run.end,runStart:run.start,street:e.streetName,campaign:cruise,headline:campaign.brandLockup.text,cta:campaign.brandLockup.cta,kind:campaign.kind,
    maxDistance:Math.max(420,ahead+(run.end-run.start)),groundY,signatureCampaignId:campaign.id,disclosureLabel:campaign.disclosureLabel,
    apparition:{triggerRouteMeters:run.start+leadIn,durationMs,beats:campaign.beats,frequencyCapPerSession:campaign.frequencyCapPerSession}})
   break
  }
 }
 return out.sort((p,q)=>p.routeMeters-q.routeMeters)
}
