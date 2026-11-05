/** Metadata-only memories. This store never contains or exports broadcast audio. */
export const RADIO_MEMORIES_KEY='buena-onda:human-radio:memories:v2'
export type RadioMoment={id:string;sessionId:string;stationId:string;stationName:string;savedAt:string;show:string|null;note:string;stationUrl:string|null;identification:'unknown'}
export type StationVisit={stationId:string;startedAt:string;endedAt:string|null}
export type RadioSession={id:string;startedAt:string;endedAt:string|null;stations:StationVisit[];momentIds:string[];artwork:{palette:'bottle-green';title:string};rights:'metadata-only'}
export type RadioMemories={version:2;moments:RadioMoment[];sessions:RadioSession[]}
export const emptyRadioMemories=():RadioMemories=>({version:2,moments:[],sessions:[]})
const validDate=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))
const id=(value:unknown)=>typeof value==='string'&&/^[\w:-]{1,100}$/.test(value)
const label=(value:unknown,max=240)=>typeof value==='string'?value.trim().slice(0,max):''
const url=(value:unknown)=>{if(typeof value!=='string')return null;try{const parsed=new URL(value);return parsed.protocol==='https:'?parsed.href:null}catch{return value.startsWith('/')&&value.length<300?value:null}}
export function parseRadioMemories(raw:string|null):RadioMemories{
 if(!raw)return emptyRadioMemories()
 if(raw.length>500_000)throw Error('Radio memories exceed the browser data limit.')
 const value:unknown=JSON.parse(raw)
 if(!value||typeof value!=='object'||(value as {version?:unknown}).version!==2)throw Error('Unsupported radio memory format.')
 const source=value as Partial<RadioMemories>
 if(!Array.isArray(source.moments)||!Array.isArray(source.sessions))throw Error('Invalid radio memories.')
 const moments:RadioMoment[]=source.moments.slice(0,200).filter((item):item is RadioMoment=>!!item&&id(item.id)&&id(item.sessionId)&&id(item.stationId)&&validDate(item.savedAt)&&item.identification==='unknown').map(item=>({id:item.id,sessionId:item.sessionId,stationId:item.stationId,stationName:label(item.stationName),savedAt:new Date(item.savedAt).toISOString(),show:item.show?label(item.show):null,note:label(item.note,500),stationUrl:url(item.stationUrl),identification:'unknown'}))
 const sessions:RadioSession[]=source.sessions.slice(0,50).filter((item):item is RadioSession=>!!item&&id(item.id)&&validDate(item.startedAt)&&item.rights==='metadata-only'&&Array.isArray(item.stations)&&Array.isArray(item.momentIds)).map(item=>({id:item.id,startedAt:new Date(item.startedAt).toISOString(),endedAt:validDate(item.endedAt)?new Date(item.endedAt!).toISOString():null,stations:item.stations.slice(0,100).filter(visit=>!!visit&&id(visit.stationId)&&validDate(visit.startedAt)).map(visit=>({stationId:visit.stationId,startedAt:new Date(visit.startedAt).toISOString(),endedAt:validDate(visit.endedAt)?new Date(visit.endedAt!).toISOString():null})),momentIds:item.momentIds.filter(id).slice(0,200),artwork:{palette:'bottle-green',title:label(item.artwork?.title||'The long way',80)},rights:'metadata-only'}))
 return {version:2,moments,sessions}
}
export function addRadioMoment(collection:RadioMemories,moment:RadioMoment):RadioMemories{
 const sessions=collection.sessions.map(session=>session.id===moment.sessionId?{...session,momentIds:[moment.id,...session.momentIds.filter(id=>id!==moment.id)]}:session)
 return {version:2,moments:[moment,...collection.moments.filter(item=>item.id!==moment.id)].slice(0,200),sessions}
}
export function removeRadioMoment(collection:RadioMemories,momentId:string):RadioMemories{
 return {version:2,moments:collection.moments.filter(item=>item.id!==momentId),sessions:collection.sessions.map(session=>({...session,momentIds:session.momentIds.filter(id=>id!==momentId)}))}
}
export function mergeRadioMemories(existing:RadioMemories,incoming:RadioMemories):RadioMemories{
 const moments=[...new Map([...incoming.moments,...existing.moments].map(item=>[item.id,item])).values()].sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt)).slice(0,200)
 const sessions=new Map<string,RadioSession>()
 for(const session of [...incoming.sessions,...existing.sessions]){
  const prior=sessions.get(session.id)
  if(!prior){sessions.set(session.id,session);continue}
  const stations=[...new Map([...prior.stations,...session.stations].map(visit=>[`${visit.stationId}:${visit.startedAt}`,visit])).values()].sort((a,b)=>Date.parse(a.startedAt)-Date.parse(b.startedAt)).slice(0,100)
  sessions.set(session.id,{...session,stations,momentIds:[...new Set([...prior.momentIds,...session.momentIds])].slice(0,200)})
 }
 return {version:2,moments,sessions:[...sessions.values()].sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,50)}
}
