import type {CruiseCampaign,CruiseStation} from './types'
import {HUMAN_RADIO_STATIONS} from '../human-radio/stations'
import {NEON_STATIONS} from '../real-miami/neon'
import {canPlayCruiseStation} from '../real-miami/stations'
import {STATION_DETAILS} from '../human-radio/stations'

/** Exact station language where an official source supplies it; otherwise a short
 * editorial line based on the station's own description. No partner claim or logo. */
export const STATION_AD_COPY:Readonly<Record<string,{eyebrow:string;headline:string;source:string;colors:readonly [`#${string}`,`#${string}`,`#${string}`]}>>={
 'buena-onda-radio':{eyebrow:'BUENA ONDA RADIO / MIAMI',headline:'DRIVE TO DISCOVER',source:'Buena Onda Cruise product brief',colors:['#183a32','#f7eed9','#efa86b']},
 'jolt-radio':{eyebrow:'JOLT RADIO / MIAMI',headline:'SEE YOU IN CYBERSPACE...',source:'https://www.joltradio.org/shows/off-da-press/',colors:['#30251d','#fff2db','#eb854f']},
 'wvum':{eyebrow:'WVUM 90.5 / CORAL GABLES',headline:'COMPLETELY STUDENT-RUN',source:'https://www.wvum.org/about',colors:['#13302a','#f4f0e2','#f08a3c']},
 'nts-radio':{eyebrow:'NTS 1 / LONDON',headline:"DON'T ASSUME",source:'https://www.nts.live/incoming/dont-assume',colors:['#18191c','#f5f3e9','#e15649']},
 'nts-radio-2':{eyebrow:'NTS 2 / LONDON',headline:"DON'T ASSUME",source:'https://www.nts.live/incoming/dont-assume',colors:['#d9d5c9','#171a1d','#b9423e']},
 'the-lot-radio':{eyebrow:'THE LOT RADIO / BROOKLYN',headline:'ONE SHOW AT A TIME',source:'https://www.thelotradio.com/about',colors:['#203034','#f4e9cd','#ddbe7c']},
 'dublab':{eyebrow:'DUBLAB / LOS ANGELES',headline:'FUTURE ROOTS RADIO',source:'https://shop.dublab.com/products/dublab-from-the-archives-of-future-roots-radio',colors:['#392b38','#fff1d8','#ffa95e']},
 'hkcr':{eyebrow:'HKCR / HONG KONG',headline:'BROADCAST INDEPENDENT WORKS',source:'https://hkcr.live/about-us',colors:['#123e43','#f3efdb','#84d2c5']},
 'veridian-club':{eyebrow:'VERIDIAN CLUB / MIAMI',headline:'RETROSPECTIVE PRODUCTION FROM MIAMI',source:'https://veridian.club/',colors:['#27233d','#f2e9d7','#ba92e8']},
 'nightride':{eyebrow:'NIGHTRIDE FM / RETROWAVE',headline:'THE HOME OF SYNTHWAVE RADIO',source:'https://nightride.fm/obs/',colors:['#1b1d3b','#f5e9fa','#d986ef']},
 'darksynth':{eyebrow:'DARKSYNTH / NIGHTRIDE FM',headline:'CYBERPUNK / SYNTHMETAL',source:'https://nightride.fm/index.jsp',colors:['#211c30','#f4e9ed','#ec657d']},
 'chillsynth':{eyebrow:'CHILLSYNTH / NIGHTRIDE FM',headline:'CHILLWAVE / INSTRUMENTAL',source:'https://nightride.fm/index.jsp',colors:['#1a3445','#edf2e9','#7ac9de']},
 'datawave':{eyebrow:'DATAWAVE / NIGHTRIDE FM',headline:'GLITCHY SYNTHWAVE / RETRO COMPUTING',source:'https://nightride.fm/index.jsp',colors:['#142e2e','#e9f2e0','#8ed2a2']},
 'spacesynth':{eyebrow:'SPACESYNTH / NIGHTRIDE FM',headline:'SPACE DISCO / ITALO',source:'https://nightride.fm/index.jsp',colors:['#30253c','#fff0d9','#ecaa78']},
}

export const stationIdForCampaign=(campaign:CruiseCampaign)=>campaign.id.startsWith('radio-station-')?campaign.id.slice('radio-station-'.length):null

export function createRadioStationCampaigns(stations:readonly CruiseStation[]):CruiseCampaign[]{
 const seen=new Set<string>(),out:CruiseCampaign[]=[]
 for(const station of stations){
  const copy=STATION_AD_COPY[station.id]
  if(!copy||seen.has(station.id)||!canPlayCruiseStation(station))continue
  seen.add(station.id)
  const [background,foreground,accent]=copy.colors
  const creative={eyebrow:copy.eyebrow,headline:copy.headline,footer:`VISIT ${station.name.toUpperCase()}`,background,foreground,accent}
  const destination=STATION_DETAILS[station.id]?.website||station.externalUrl
  if(!destination)continue
  out.push({id:`radio-station-${station.id}`,name:station.name,analyticsId:`station_${station.id.replaceAll('-','_')}`,destination:destination as CruiseCampaign['destination'],creatives:{billboard:creative,wall:creative,poster:creative}})
 }
 return out
}

export const RADIO_STATION_CAMPAIGNS=createRadioStationCampaigns([...HUMAN_RADIO_STATIONS,...NEON_STATIONS])
