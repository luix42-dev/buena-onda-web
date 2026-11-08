'use client'

import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import './prototype-tv.css'
import ScreenMirrorHelp from './ScreenMirrorHelp'

const controls='.os-header,.os-radio-deck,.os-deck,.os-guidance,.prototype-business .pb-trigger,.dd-bar,.dd-sheet'

/** TV presentation and OS mirroring help. */
export default function PrototypeTV({children}:{children:ReactNode}) {
  const [tv,setTV]=useState(false),[idle,setIdle]=useState(false),[help,setHelp]=useState(false)
  const wrapper=useRef<HTMLDivElement>(null)
  const helpButton=useRef<HTMLButtonElement>(null),lastActivity=useRef(0)
  const wake=useCallback(()=>{lastActivity.current=performance.now();setIdle(false)},[])
  useEffect(()=>{setTV(new URLSearchParams(location.search).get('tv')==='1')},[])
  useEffect(()=>{const on=()=>{setTV(true);wake()};window.addEventListener('cruise:tv-on',on);return()=>window.removeEventListener('cruise:tv-on',on)},[wake])
  // Look v2: the drive deck's View sheet opens this help; its floating button is hidden while driving.
  useEffect(()=>{const open=()=>{wake();setHelp(true)};window.addEventListener('cruise:tv-help',open);return()=>window.removeEventListener('cruise:tv-help',open)},[wake])
  useEffect(()=>{
    if(!tv){setIdle(false);return}
    wake()
    const events=['pointermove','pointerdown','keydown','focusin','visibilitychange'] as const
    events.forEach(event=>document.addEventListener(event,wake,true))
    const timer=setInterval(()=>{
      const root=wrapper.current
      const focused=document.activeElement instanceof Element&&document.activeElement.closest(controls)
      const modal=document.querySelector('dialog[open]')
      const started=root?.querySelector('[data-started="true"]')
      if(!started||focused||modal||document.hidden){setIdle(false);lastActivity.current=performance.now();return}
      if(performance.now()-lastActivity.current>=6000)setIdle(true)
    },500)
    const observer=new MutationObserver(()=>{if(document.querySelector('dialog[open]'))wake()})
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']})
    return()=>{events.forEach(event=>document.removeEventListener(event,wake,true));clearInterval(timer);observer.disconnect()}
  },[tv,wake])
  const close=()=>{setHelp(false);wake()}
  return <div ref={wrapper} className={`prototype-tv${tv?' ptv-mode':''}${idle?' ptv-idle':''}`}>
    {children}
    <div className="ptv-tools">
      <button ref={helpButton} type="button" aria-haspopup="dialog" onClick={()=>{wake();setHelp(true)}}>TV</button>
      {tv&&<button type="button" className="ptv-reveal" onClick={wake}>Show controls</button>}
    </div>
    <ScreenMirrorHelp open={help} onClose={close}/>
  </div>
}
