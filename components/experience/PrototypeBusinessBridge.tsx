'use client'

import {adDismissed,dismissAd,useAdDismissed,useCruisePreference} from '@/lib/cruise/preferences'
import {setPromotionDetail} from '@/components/cruise-os/Promotion'
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react'
import CampaignBridge from '@/components/real-miami/CampaignBridge'
import {DEFAULT_CRUISE_CAMPAIGN} from '@/lib/cruise/campaigns'
import {RADIO_STATION_CAMPAIGNS} from '@/lib/cruise/radio-station-ads'
import {GTA_VI_CAMPAIGN} from '@/lib/cruise/gta-vi-campaign'
import type {CruiseCampaign} from '@/lib/cruise/types'
import {createDemoBusinessRecorder,type DemoBusinessEvent} from './prototype-business'

/** Prototype only. Does not enable payments, legacy telemetry or phone pairing. */
const FEATURED_CAMPAIGNS=[...RADIO_STATION_CAMPAIGNS]
export default function PrototypeBusinessBridge({children}:{children:ReactNode}) {
  const [available,setAvailable]=useState(false),[open,setOpen]=useState(false)
  // Launch: directory and business cards stay behind ?business=1; measurement and ad infrastructure keep running.
  const [directory,setDirectory]=useState(false)
  useEffect(()=>{setDirectory(new URLSearchParams(location.search).get('business')==='1')},[])
  const [selected,setSelected]=useState<CruiseCampaign|null>(null)
  const [events,setEvents]=useState<DemoBusinessEvent[]>([])
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null)
  const [showAds]=useCruisePreference('ads',true),dismissed=useAdDismissed(selected?.id||'')
  useEffect(()=>{setPromotionDetail(open);return()=>setPromotionDetail(false)},[open])
  useEffect(()=>{if(!showAds||dismissed)setOpen(false)},[showAds,dismissed])
  const opened=useRef(false);opened.current=open
  const record=useCallback((event:DemoBusinessEvent)=>setEvents(previous=>[...previous.slice(-99),event]),[])
  const directoryRecorder=useRef<ReturnType<typeof createDemoBusinessRecorder>|null>(null)
  if(!directoryRecorder.current)directoryRecorder.current=createDemoBusinessRecorder(record)
  useEffect(()=>{
    const poll=()=>{const state=window.__jeepNight?.();const otherDialog=Array.from(document.querySelectorAll('dialog[open]')).some(node=>node!==dialog.current);setAvailable(!!state&&!state.garage&&!state.radioFocused&&!document.hidden&&!otherDialog)}
    poll();const timer=setInterval(poll,1000);return()=>clearInterval(timer)
  },[])
  useEffect(()=>{
    const node=dialog.current;if(!node)return
    if(open&&!node.open)node.showModal()
    if(!open&&node.open)node.close()
  },[open])
  const close=()=>{if(selected)dismissAd(selected.id);setOpen(false);requestAnimationFrame(()=>{if(!document.querySelector('dialog[open]'))trigger.current?.focus()})}
  const inspect=(campaign:CruiseCampaign)=>{setSelected(campaign);directoryRecorder.current?.activate(campaign.id,'directory','directory',performance.now())}
  const obscured=useCallback(()=>opened.current||!!document.querySelector('dialog[open]'),[])
  return <CampaignBridge campaign={DEFAULT_CRUISE_CAMPAIGN} campaignValid localDemo={{onInspect:placement=>{if(!directory||!showAds||adDismissed(placement.campaign.id))return;setSelected(placement.campaign);setOpen(true)},onEvent:record,obscured,allowLinks:!directory}}>
    {children}
    <div className="prototype-business">
      <button hidden={!showAds||!directory||!available||open} ref={trigger} className="pb-trigger" aria-haspopup="dialog" onClick={()=>{setSelected(null);setOpen(true)}}>Along the drive <small>FEATURED SITES</small></button>
      <dialog ref={dialog} aria-labelledby="pb-heading" onCancel={event=>{event.preventDefault();close()}} onClose={()=>setOpen(false)}>
        <header><h2 id="pb-heading">{selected?.name||'Along the drive'}</h2><button autoFocus onClick={close}>Back to drive</button></header>
        <p>Visit the sites featured along the drive. Demo placements are labeled.</p>
        {selected?<section><p><b>{selected.id===GTA_VI_CAMPAIGN.id?'EDITORIAL DEMO':'RADIO STATION'}</b></p><h3>{selected.creatives.billboard.headline}</h3><p>{selected.creatives.billboard.footer}</p>{selected.destination&&<a href={selected.destination} target="_blank" rel="noopener noreferrer">Visit {selected.name} ↗</a>}<button onClick={()=>setSelected(null)}>All sites</button></section>:<ul>{FEATURED_CAMPAIGNS.map(campaign=><li key={campaign.id}><button onClick={()=>inspect(campaign)}><strong>{campaign.name}</strong><small>{campaign.id===GTA_VI_CAMPAIGN.id?'EDITORIAL DEMO':'RADIO'} / {campaign.creatives.billboard.headline}</small></button></li>)}</ul>}
        <details><summary>Local demo diagnostics</summary><p>This browser only, in memory. Estimated readable opportunities and deliberate inspections are separate test observations, never unique people or billable impressions. No listening identifiers are collected here.</p><p>DEMO / TEST: {events.filter(event=>event.type==='opportunity').length} opportunities; {events.filter(event=>event.type==='activation').length} inspections in the last {events.length} events.</p><button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({label:'DEMO / TEST',scope:'this browser memory only',events},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='cruise-business-demo.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}>Download local demo observations</button></details>
      </dialog>
      <style>{`.prototype-business{font:14px system-ui;color:#122b27}.prototype-business .pb-trigger{position:fixed;right:16px;top:76px;z-index:35;background:#f4eddb;color:#122b27;border:1px solid #122b27;border-radius:4px;padding:10px 14px;min-height:44px}.prototype-business small{display:block;font-size:10px;margin-top:4px}.prototype-business dialog{color:#122b27;background:#f4eddb;border:1px solid #122b27;border-radius:6px;padding:20px;width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box}.prototype-business dialog::backdrop{background:#081b18b3}.prototype-business header{display:flex;gap:12px;align-items:center;justify-content:space-between}.prototype-business h2{font:28px Georgia,serif;margin:0}.prototype-business p{line-height:1.5}.prototype-business ul{padding:0;list-style:none}.prototype-business li{margin:8px 0}.prototype-business button{cursor:pointer;min-height:44px;background:#fffaf0;color:#122b27;border:1px solid #63746d;border-radius:3px;padding:9px 12px;font:inherit}.prototype-business li button{width:100%;text-align:left}.prototype-business button:focus-visible,.prototype-business summary:focus-visible{outline:3px solid #8c4c10;outline-offset:3px}.prototype-business summary{padding:14px 0;cursor:pointer}@media(max-height:500px){.prototype-business .pb-trigger{top:64px;right:12px}}`}</style>
    </div>
  </CampaignBridge>
}
