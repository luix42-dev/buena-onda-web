'use client'
import {useEffect,useRef} from 'react'

/** Follow the physical head unit while the camera eases into radio focus. */
export default function RadioReturn({onBack}:{onBack:()=>void}){
 const button=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  const place=()=>{
   const el=button.current,raw=document.documentElement.dataset.physicalRadioBounds
   if(!el||!raw)return
   try{
    const {left,right,top,at}=JSON.parse(raw)
    if(!Number.isFinite(at)||performance.now()-at>500)return
    if(![left,right,top].every(Number.isFinite))return
    const width=el.offsetWidth,height=el.offsetHeight
    el.style.left=`${Math.max(12,Math.min(innerWidth-width-12,(left+right-width)/2))}px`
    el.style.top=`${Math.max(80,Math.min(innerHeight-height-110,top-height-12))}px`
   }catch{}
  }
  place();const timer=setInterval(place,100)
  return()=>clearInterval(timer)
 },[])
 return <button ref={button} className="os-return-drive" onClick={onBack}>Back to drive</button>
}
