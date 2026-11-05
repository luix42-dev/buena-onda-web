import type {CruiseCampaign} from './types'

/** Preview creative sourced from Rockstar's official edition page. This is an
 * editorial test placement, not a Rockstar partnership or a saleable booking. */
export const GTA_VI_CAMPAIGN:CruiseCampaign={
 id:'gta-vi-official',name:'Grand Theft Auto VI',analyticsId:'demo_gta_vi_official',
 destination:'https://www.rockstargames.com/VI/editions',
 billboardImage:'/cruise/ads/gta-vi-official-cover.jpg',
 creatives:{
  billboard:{eyebrow:'ROCKSTAR GAMES',headline:'GRAND THEFT AUTO VI',footer:'EXPLORE THE EDITIONS',background:'#1b0b2d',foreground:'#fff4ed',accent:'#ee91ba'},
  wall:{eyebrow:'ROCKSTAR GAMES',headline:'GRAND THEFT AUTO VI',footer:'EXPLORE THE EDITIONS',background:'#1b0b2d',foreground:'#fff4ed',accent:'#ee91ba'},
  poster:{eyebrow:'ROCKSTAR GAMES',headline:'GRAND THEFT AUTO VI',footer:'EXPLORE THE EDITIONS',background:'#1b0b2d',foreground:'#fff4ed',accent:'#ee91ba'},
 },
}
