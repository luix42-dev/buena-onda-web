'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {emptyRadioMemories,mergeRadioMemories,parseRadioMemories,RADIO_MEMORIES_KEY,removeRadioMoment,type RadioMemories,type RadioSession} from '@/lib/human-radio/memories'

export function useRadioMemories({stationId,playing}:{stationId:string;playing:boolean}){
 const [collection,setCollection]=useState<RadioMemories>(emptyRadioMemories),[error,setError]=useState('')
 const current=useRef(collection),hydrated=useRef(false),active=useRef<string|null>(null)
 const persist=useCallback((next:RadioMemories)=>{current.current=next;setCollection(next);try{localStorage.setItem(RADIO_MEMORIES_KEY,JSON.stringify(next));setError('')}catch{setError('Browser storage is unavailable. Memories last for this visit; export them to keep a copy.')}},[])
 useEffect(()=>{
  try{const stored=parseRadioMemories(localStorage.getItem(RADIO_MEMORIES_KEY));current.current=stored;setCollection(stored)}catch{setError('Saved moments could not be read. Existing browser data was left untouched.')}
  hydrated.current=true
 },[])
 useEffect(()=>{
  if(!hydrated.current)return
  const now=new Date().toISOString(),prior=current.current
  if(!playing){
   if(!active.current)return
   const next={...prior,sessions:prior.sessions.map(session=>session.id===active.current?{...session,endedAt:now,stations:session.stations.map((visit,index)=>index===session.stations.length-1&&!visit.endedAt?{...visit,endedAt:now}:visit)}:session)}
   active.current=null;persist(next);return
  }
  const existing=prior.sessions.find(session=>session.id===active.current)
  if(existing){
   if(existing.stations.at(-1)?.stationId===stationId)return
   persist({...prior,sessions:prior.sessions.map(session=>session.id===existing.id?{...session,stations:[...session.stations.map((visit,index)=>index===session.stations.length-1&&!visit.endedAt?{...visit,endedAt:now}:visit),{stationId,startedAt:now,endedAt:null}]}:session)})
   return
  }
  const session:RadioSession={id:crypto.randomUUID(),startedAt:now,endedAt:null,stations:[{stationId,startedAt:now,endedAt:null}],momentIds:[],artwork:{palette:'bottle-green',title:'The long way'},rights:'metadata-only'}
  active.current=session.id;persist({...prior,sessions:[session,...prior.sessions].slice(0,50)})
 },[playing,stationId,persist])
 const removeMoment=useCallback((id:string)=>persist(removeRadioMoment(current.current,id)),[persist])
 const exportMemories=useCallback(()=>JSON.stringify({...current.current,exportedAt:new Date().toISOString()},null,2),[])
 const importMemories=useCallback((raw:string)=>{try{const incoming=parseRadioMemories(raw);persist(mergeRadioMemories(current.current,incoming));return true}catch{setError('This memory file could not be restored. Existing memories were kept.');return false}},[persist])
 return {moments:collection.moments,sessions:collection.sessions,removeMoment,exportMemories,importMemories,error}
}
