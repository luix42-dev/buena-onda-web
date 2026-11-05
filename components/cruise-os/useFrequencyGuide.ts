'use client'
import {useEffect,useState} from 'react'
import {forwardMeters,nextFrequencyPlace,type FrequencyPlace} from '@/lib/cruise-os/frequency'
export function useFrequencyGuide(enabled:boolean,places:readonly FrequencyPlace[],length:number,getDistance:()=>number){
 const [target,setTarget]=useState<FrequencyPlace|null>(null),[meters,setMeters]=useState(0),[arrived,setArrived]=useState(false)
 const choose=()=>{const next=nextFrequencyPlace(places,getDistance(),length);if(next){setTarget(next);setMeters(forwardMeters(getDistance(),next.meters,length)||0);setArrived(false)}return!!next}
 useEffect(()=>{if(!enabled||!target||arrived)return;const tick=()=>{const distance=forwardMeters(getDistance(),target.meters,length);if(distance===null){setTarget(null);return}setMeters(distance);if(distance<=35)setArrived(true)};tick();const timer=setInterval(tick,500);return()=>clearInterval(timer)},[enabled,target,arrived,length,getDistance])
 return{target:enabled?target:null,meters,arrived,available:enabled&&!!nextFrequencyPlace(places,getDistance(),length),choose,cancel:()=>setTarget(null)}
}
