'use client'
import {useEffect,useState,useSyncExternalStore} from 'react'
const event='cruise:preferences'
export const mobileQuery='(max-width: 640px), (max-height: 500px) and (pointer: coarse)'
export function useMobileCruise(){const [mobile,set]=useState(false);useEffect(()=>{const q=matchMedia(mobileQuery),update=()=>set(q.matches);update();q.addEventListener('change',update);return()=>q.removeEventListener('change',update)},[]);return mobile}
const subscribe=(fn:()=>void)=>{addEventListener(event,fn);addEventListener('storage',fn);return()=>{removeEventListener(event,fn);removeEventListener('storage',fn)}}
export function useCruisePreference(key:string,fallback:boolean){const read=()=>{try{const v=localStorage.getItem('cruise:pref:'+key);return v===null?fallback:v==='true'}catch{return fallback}};const value=useSyncExternalStore(subscribe,read,()=>fallback);return [value,(next:boolean)=>{try{localStorage.setItem('cruise:pref:'+key,String(next))}catch{}dispatchEvent(new Event(event))}] as const}
const memory=new Set<string>()
export function adDismissed(id:string){try{return memory.has(id)||sessionStorage.getItem('cruise:ad:'+id)==='dismissed'}catch{return memory.has(id)}}
export function dismissAd(id:string){memory.add(id);try{sessionStorage.setItem('cruise:ad:'+id,'dismissed')}catch{}dispatchEvent(new Event(event))}
export function useAdDismissed(id:string){return useSyncExternalStore(subscribe,()=>adDismissed(id),()=>false)}
