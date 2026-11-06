'use client'
import {useEffect,useRef,useState} from 'react'

export default function CastControl(){
 const [hint,setHint]=useState('')
 const timer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
 useEffect(()=>()=>clearTimeout(timer.current),[])
 const start=()=>{
  dispatchEvent(new Event('cruise:tv-on'))
  if(!document.fullscreenElement)void document.documentElement.requestFullscreen?.().catch(()=>{})
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const apple=/iPhone|iPad|iPod/i.test(navigator.userAgent)
  setHint(apple?'Open Control Center → Screen Mirroring':mobile?'Open Quick Settings → Cast screen':'In Chrome, choose Cast tab')
  clearTimeout(timer.current)
  timer.current=setTimeout(()=>setHint(''),7000)
 }
 return <div className="jn-cast">
  <button className="jn-cast-button" aria-label="Prepare Cruise for TV casting" title="Cast Cruise" onClick={start}>
   <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 8V5h18v14h-8M3 13a6 6 0 0 1 6 6M3 9a10 10 0 0 1 10 10M3 17a2 2 0 0 1 2 2"/><circle cx="3" cy="19" r=".8" fill="currentColor" stroke="none"/></svg><span>Cast</span>
  </button>
  {hint&&<div className="jn-cast-hint" role="status"><span>{hint}</span><button type="button" className="jn-cast-dismiss" aria-label="Dismiss casting tip" onClick={()=>setHint('')}>×</button></div>}
 </div>
}
