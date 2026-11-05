'use client'

import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import './prototype-tv.css'

const controls='.os-header,.os-radio-deck,.os-deck,.os-guidance,.prototype-business .pb-trigger,.dd-bar,.dd-sheet'

/** TV presentation and OS mirroring help. */
export default function PrototypeTV({children}:{children:ReactNode}) {
  const [tv,setTV]=useState(false),[idle,setIdle]=useState(false),[help,setHelp]=useState(false)
  const wrapper=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null)
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
  useEffect(()=>{
    const node=dialog.current;if(!node)return
    if(help&&!node.open)node.showModal()
    if(!help&&node.open)node.close()
  },[help])
  const close=()=>{setHelp(false);wake();requestAnimationFrame(()=>{if(!document.querySelector('dialog[open]'))helpButton.current?.focus()})}
  return <div ref={wrapper} className={`prototype-tv${tv?' ptv-mode':''}${idle?' ptv-idle':''}`}>
    {children}
    <div className="ptv-tools">
      <button ref={helpButton} type="button" aria-haspopup="dialog" onClick={()=>{wake();setHelp(true)}}>TV</button>
      {tv&&<button type="button" className="ptv-reveal" onClick={wake}>Show controls</button>}
    </div>
    <dialog ref={dialog} className="ptv-help" aria-labelledby="ptv-heading" onCancel={event=>{event.preventDefault();close()}} onClose={()=>setHelp(false)}>
      <header><h2 id="ptv-heading">TV</h2><button type="button" autoFocus onClick={close}>Close help</button></header>
      <p>Play Cruise on this device, then use your operating system to mirror its screen to a compatible display. Keep controlling the same device.</p>
      <label className="ptv-choice"><input type="checkbox" checked={tv} onChange={event=>{setTV(event.target.checked);wake()}}/>TV presentation</label>
      <p>Larger controls on wide screens. After about six idle seconds, the driving controls recede. Move, tap, press a key or choose Show controls to bring them back. Open dialogs and focused controls stay visible.</p>
      <h3>iPhone / AirPlay screen mirroring</h3>
      <ol><li>Connect your iPhone and Apple TV or AirPlay-compatible TV to the same Wi-Fi.</li><li>Open Control Center. Choose Screen Mirroring, then your display.</li><li>Enter the displayed AirPlay code if asked. Return to Cruise and press Play.</li></ol>
      <p>To disconnect, return to Screen Mirroring and choose Stop Mirroring. <a href="https://support.apple.com/en-us/102661" target="_blank" rel="noreferrer">Apple screen-mirroring instructions</a>.</p>
      <h3>Android / Google Home screen casting</h3>
      <ol><li>Use Android 8 or later and a compatible Google streaming device on the same Wi-Fi.</li><li>In Google Home, open Favorites or Devices, then hold the tile for your display.</li><li>Choose Cast, then Cast my screen / Cast screen and follow the system prompts. Return to Cruise and press Play.</li></ol>
      <p>The Google instructions require Google Play Services microphone permission. Stop from the device tile using Stop mirroring. Labels depend on your device and Home version. <a href="https://support.google.com/chromecast/answer/6059461?hl=en" target="_blank" rel="noreferrer">Google screen-casting instructions</a>.</p>
      <h3>Desktop Chrome</h3>
      <p>Open the Chrome menu, choose Cast, save and share, then Cast. Select Cast tab and a compatible display on the same Wi-Fi. <a href="https://support.google.com/chrome/answer/3228332" target="_blank" rel="noreferrer">Chrome tab-casting help</a>.</p>
      <p>TV picture, audio and casting delay depend on your equipment.</p>
    </dialog>
  </div>
}
