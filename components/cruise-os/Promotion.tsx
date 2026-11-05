'use client'
import {useEffect,useState,type ReactNode} from 'react'
import {dismissAd,useAdDismissed,useCruisePreference} from '@/lib/cruise/preferences'
let owner: symbol|null=null
let detailOpen=false
const changed=()=>window.dispatchEvent(new Event('cruise:promotion'))
export function setPromotionDetail(open:boolean){detailOpen=open;changed()}
export default function Promotion({id,children}:{id:string;children:ReactNode}){
 const [ads]=useCruisePreference('ads',true),dismissed=useAdDismissed(id),[token]=useState(()=>Symbol()),[active,setActive]=useState(false)
 useEffect(()=>{if(!ads||dismissed)return;const acquire=()=>{if(owner===null)owner=token;setActive(owner===token&&!detailOpen)};acquire();addEventListener('cruise:promotion',acquire);return()=>{removeEventListener('cruise:promotion',acquire);if(owner===token){owner=null;changed()}}},[ads,dismissed,token,id])
 if(!ads||dismissed||!active)return null
 return <aside className="cruise-promotion" aria-label="Promotion" data-campaign={id}><button type="button" aria-label="Close promotion" onClick={e=>{e.preventDefault();e.stopPropagation();dismissAd(id)}}>×</button>{children}</aside>
}
