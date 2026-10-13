'use client'
import {useEffect,useRef,useState} from 'react'

export default function CastControl(){
 const [open,setOpen]=useState(false)
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)}
  document.addEventListener('pointerdown',outside)
  return()=>document.removeEventListener('pointerdown',outside)
 },[])
 useEffect(()=>{
  if(!open)return
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);root.current?.querySelector<HTMLButtonElement>('.jn-cast-button')?.focus()}}
  document.addEventListener('keydown',escape,true)
  return()=>document.removeEventListener('keydown',escape,true)
 },[open])
 return <div className="jn-cast" ref={root}>
  <button className="jn-cast-button" aria-label="Cast Cruise to a TV or display" title="Cast Cruise" aria-expanded={open} aria-controls="cruise-cast-menu" onClick={()=>setOpen(value=>!value)}>
   <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 8V5h18v14h-8M3 13a6 6 0 0 1 6 6M3 9a10 10 0 0 1 10 10M3 17a2 2 0 0 1 2 2"/><circle cx="3" cy="19" r=".8" fill="currentColor" stroke="none"/></svg><span>Cast</span>
  </button>
  {open&&<section id="cruise-cast-menu" className="jn-cast-menu" aria-label="Cast Cruise">
   <header><strong>CRUISE ON YOUR TV</strong><button aria-label="Close Cast controls" onClick={()=>setOpen(false)}>×</button></header>
   <p>Mirror the drive, cockpit and radio to your Chromecast or Google TV. Keep controlling Cruise here.</p>
   <ol><li>Open Chrome’s <b>⋮</b> menu.</li><li>Choose <b>Cast, save and share → Cast…</b></li><li>Under <b>Sources</b>, select <b>Cast tab</b>.</li><li>Choose your TV on the same Wi-Fi.</li></ol>
   <p>Already connected? Use Chrome’s Cast icon to switch devices or stop casting.</p>
   <p>Chrome controls device discovery. This page cannot open its tab-mirroring picker directly.</p>
   <a href="https://support.google.com/chrome/answer/3228332" target="_blank" rel="noopener noreferrer">Chrome casting help ↗</a>
  </section>}
 </div>
}
