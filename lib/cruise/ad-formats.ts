/**
 * Cruise advertising FORMATS: what an advertiser buys, independent of which campaign fills it.
 *
 *  - 'standard'            replaceable digital billboard (existing billboard / poster / projection / blade surfaces)
 *  - 'premium-cinematic'   animated large format (existing hero screens; facade video is future inventory)
 *  - 'signature-character' monumental character installation: a timed apparition beside a long straight
 *
 * Pricing source of truth stays in components/cruise/master/plots.ts (FLOOR_CENTS, BUYOUT_MULTIPLIER, priceCents).
 * Those Avenue prices belong to DRAFT, UNPUBLISHED terms (docs/cruise/avenue/TERMS-DRAFT.md). Only 'standard'
 * maps onto an existing priced plot kind. Premium and signature floors have NO approved price: they are null
 * placeholders and formatPriceCents() refuses to quote them. Do not replace the nulls without an owner decision.
 *
 * Measurement follows AGENTS.md: projected size, view angle and occlusion, continuous exposure only, and
 * geometric qualification kept separate from human readability. Thresholds marked PROPOSED are not approved.
 */
import type {MiamiAdPlacement,MiamiAdSample,MiamiAdSurface} from '@/lib/real-miami/advertising'
import {BUYOUT_MULTIPLIER,FLOOR_CENTS,priceCents,type Plot,type PlotKind} from '@/components/cruise/master/plots'

export type AdFormatTier='standard'|'premium-cinematic'|'signature-character'
/** 'signature' is the new world surface (see lib/cruise/signature-campaigns.ts); 'facade-video' is not built yet. */
export type AdFormatSurface=MiamiAdSurface|'signature'|'facade-video'

export type AdMeasurementRule={
 /** 'viewable-duration': continuous viewable time on a static/rotating face. 'apparition': only while the giant is rendered. */
 basis:'viewable-duration'|'apparition'
 /** An impression needs one continuous qualifying streak at least this long. */
 minViewableMs:number
 /** Max share of occlusion probes blocked (MiamiAds casts 10 probes: occlusion = blocked/10). */
 maxOcclusion:number
 /** Minimum on-screen projected height in CSS px (MiamiAdSample.pixelHeight). 0 = use the viewable rule only. */
 minPixelHeight:number
 /** Two samples further apart than this break the streak (MiamiAds samples every 250 ms). */
 maxSampleGapMs:number
 /** Signature only: samples count only while a beat with characterVisible=true is playing. */
 onlyWhileCharacterOnScreen:boolean
 /** Whether each number here is already used in shipped code or is a proposal. */
 status:'existing'|'proposed-unapproved'
 source:string
}

export type AdFormatPricing={
 /** Existing Avenue plot kind whose floor/buyout this format reuses, or null when no approved price exists. */
 avenueKind:PlotKind|null
 /** Floor in USD cents, or null = UNAPPROVED, not for sale. */
 floorCents:number|null
 status:'draft-terms-unpublished'|'unapproved-placeholder'
 source:string
}

export type AdFormat={
 tier:AdFormatTier
 label:string
 description:string
 surfaces:readonly AdFormatSurface[]
 /** Surfaces listed above that do not exist in the world yet. */
 futureSurfaces:readonly AdFormatSurface[]
 measurement:AdMeasurementRule
 pricing:AdFormatPricing
}

/** Existing qualified-exposure rule: viewable && visibleDurationMs >= 2000
 * (components/cruise/LaunchExperience.tsx, components/cruise/world-test/WorldExperience.tsx). */
export const EXISTING_QUALIFIED_EXPOSURE_MS=2000

/** PROPOSED, NOT APPROVED. The signature giant is a timed apparition, so it needs a longer dwell and a
 * minimum projected height (a 60 m figure 900 m away is a speck, not an ad). Review with real captures. */
export const SIGNATURE_MEASUREMENT_PROPOSED={minViewableMs:3000,minPixelHeight:180,maxOcclusion:.2} as const

/** TODO(owner): UNAPPROVED PLACEHOLDERS. No price exists for these formats anywhere in the repo or docs.
 * null means "not for sale". Set only after an owner decision and a terms update. */
export const UNAPPROVED_PLACEHOLDER_FLOOR_CENTS:{readonly 'premium-cinematic':number|null;readonly 'signature-character':number|null}={
 'premium-cinematic':null,
 'signature-character':null,
}

const STANDARD_AVENUE_KIND:PlotKind='billboard'

export const AD_FORMATS:Readonly<Record<AdFormatTier,AdFormat>>={
 standard:{
  tier:'standard',label:'Digital billboard',
  description:'Replaceable creative on a static face: roadside billboard, poster plot, facade projection or neon blade.',
  surfaces:['billboard','poster','projection','blade'],futureSurfaces:[],
  measurement:{basis:'viewable-duration',minViewableMs:EXISTING_QUALIFIED_EXPOSURE_MS,maxOcclusion:.2,minPixelHeight:0,maxSampleGapMs:2000,onlyWhileCharacterOnScreen:false,status:'existing',
   source:'MiamiAds.tsx viewable rule (facing>.35, fully framed, occlusion<=.2, projectedArea>=.003) + LaunchExperience 2000 ms qualification'},
  pricing:{avenueKind:STANDARD_AVENUE_KIND,floorCents:FLOOR_CENTS[STANDARD_AVENUE_KIND],status:'draft-terms-unpublished',source:'plots.ts FLOOR_CENTS.billboard via priceCents(); Avenue terms are a draft'},
 },
 'premium-cinematic':{
  tier:'premium-cinematic',label:'Cinematic screen',
  description:'Animated large-format screen holding the vanishing point of a long straight; creative rotates on the shared hero clock.',
  surfaces:['hero','facade-video'],futureSurfaces:['facade-video'],
  measurement:{basis:'viewable-duration',minViewableMs:EXISTING_QUALIFIED_EXPOSURE_MS,maxOcclusion:.2,minPixelHeight:0,maxSampleGapMs:2000,onlyWhileCharacterOnScreen:false,status:'existing',
   source:'Same viewable rule; MiamiAds measures a hero as heroCreative(slot, now), so each streak names the creative on screen'},
  pricing:{avenueKind:null,floorCents:UNAPPROVED_PLACEHOLDER_FLOOR_CENTS['premium-cinematic'],status:'unapproved-placeholder',source:'none: no approved price'},
 },
 'signature-character':{
  tier:'signature-character',label:'Signature giant character',
  description:'Monumental pre-rendered character beside a long straight: approach, gaze-follow, brand reveal, dissolve. Timed apparition.',
  surfaces:['signature'],futureSurfaces:['signature'],
  measurement:{basis:'apparition',minViewableMs:SIGNATURE_MEASUREMENT_PROPOSED.minViewableMs,maxOcclusion:SIGNATURE_MEASUREMENT_PROPOSED.maxOcclusion,minPixelHeight:SIGNATURE_MEASUREMENT_PROPOSED.minPixelHeight,maxSampleGapMs:2000,onlyWhileCharacterOnScreen:true,status:'proposed-unapproved',
   source:'PROPOSED in lib/cruise/ad-formats.ts; not yet validated against captures'},
  pricing:{avenueKind:null,floorCents:UNAPPROVED_PLACEHOLDER_FLOOR_CENTS['signature-character'],status:'unapproved-placeholder',source:'none: no approved price'},
 },
}

export const isSurfaceEligible=(tier:AdFormatTier,surface:AdFormatSurface)=>AD_FORMATS[tier].surfaces.includes(surface)
/** Which format a placement is sold as. Accepts existing placements and SignaturePlacement. */
export function formatForSurface(surface:AdFormatSurface):AdFormatTier{
 if(surface==='signature')return 'signature-character'
 if(surface==='hero'||surface==='facade-video')return 'premium-cinematic'
 return 'standard'
}
export const formatForPlacement=(placement:Pick<MiamiAdPlacement,'id'>&{surface:AdFormatSurface})=>formatForSurface(placement.surface)

/** Floor for a format in cents, or null when unapproved. Standard reuses the Avenue billboard floor. */
export function formatFloorCents(tier:AdFormatTier):number|null{
 const format=AD_FORMATS[tier]
 if(format.pricing.avenueKind)return priceCents({kind:format.pricing.avenueKind,status:'open',valueCents:0})
 return format.pricing.floorCents
}

/**
 * Claim / buyout quote for a slot sold as `tier`. Delegates to the existing priceCents() so the rule lives in one
 * place: open = floor; claimed = max(floor, ceil(value * BUYOUT_MULTIPLIER to whole dollar)); house = null.
 * Unapproved formats return null (not for sale). To price them, generalise priceCents() to take a floor;
 * do not copy the formula here.
 */
export function formatPriceCents(tier:AdFormatTier,slot:Pick<Plot,'status'|'valueCents'>):number|null{
 const kind=AD_FORMATS[tier].pricing.avenueKind
 if(!kind)return null
 return priceCents({kind,status:slot.status,valueCents:slot.valueCents})
}
export {BUYOUT_MULTIPLIER}

/** Standard / premium: the existing per-sample qualification. */
export const qualifiesStandardExposure=(sample:Pick<MiamiAdSample,'viewable'|'visibleDurationMs'>)=>sample.viewable&&sample.visibleDurationMs>=EXISTING_QUALIFIED_EXPOSURE_MS

/** A MiamiAdSample-shaped sample plus whether the giant was actually rendered at that instant. */
export type ApparitionSample=Pick<MiamiAdSample,'visible'|'viewable'|'occlusion'|'pixelHeight'|'sampledAt'>&{characterOnScreen:boolean}
export type ApparitionExposure={impressions:number;qualifiedMs:number;longestStreakMs:number;samples:number}

/** Per-sample gate for signature exposure. Hidden, occluded, tiny or between-beat samples never count. */
export function qualifiesApparitionSample(sample:ApparitionSample,rule:AdMeasurementRule=AD_FORMATS['signature-character'].measurement){
 if(rule.onlyWhileCharacterOnScreen&&!sample.characterOnScreen)return false
 return sample.visible&&sample.viewable&&sample.occlusion<=rule.maxOcclusion&&sample.pixelHeight>=rule.minPixelHeight
}

/**
 * Exposure for ONE apparition (one pass of the beat timeline). Builds continuous streaks from sampledAt
 * (independent of MiamiAds' visibleDurationMs, which does not know about beats). At most one impression
 * per apparition: the frequency cap, not repeated streaks, decides how often a session sees the giant.
 */
export function measureApparition(samples:readonly ApparitionSample[],rule:AdMeasurementRule=AD_FORMATS['signature-character'].measurement):ApparitionExposure{
 const sorted=[...samples].sort((a,b)=>a.sampledAt-b.sampledAt)
 let qualifiedMs=0,longest=0,streak=0,previous:ApparitionSample|null=null
 for(const sample of sorted){
  const ok=qualifiesApparitionSample(sample,rule)
  if(ok&&previous&&qualifiesApparitionSample(previous,rule)&&sample.sampledAt-previous.sampledAt<=rule.maxSampleGapMs){const d=sample.sampledAt-previous.sampledAt;streak+=d;qualifiedMs+=d}
  else streak=0
  longest=Math.max(longest,streak);previous=sample
 }
 return{impressions:longest>=rule.minViewableMs?1:0,qualifiedMs,longestStreakMs:longest,samples:sorted.length}
}
