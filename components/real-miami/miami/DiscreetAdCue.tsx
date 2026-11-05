'use client'

import {useState} from 'react'
import type {MiamiAdPlacement,MiamiAdSample} from '@/lib/real-miami/advertising'
import styles from './ad-cue.module.css'

type Props={sample:MiamiAdSample|null;recentlySeen?:boolean;onActivate:(placement:MiamiAdPlacement)=>void}

export default function DiscreetAdCue({sample,recentlySeen=false,onActivate}:Props){
 const [dismissed,setDismissed]=useState<Set<string>>(()=>new Set())
 if(!sample||dismissed.has(sample.placement.id)||(!recentlySeen&&(!sample.visible||sample.occlusion>.5)))return null
 const placement=sample.placement,destination=placement.campaign.destination
 if(!destination)return null
 const cta=placement.cta.startsWith('/')||placement.cta.startsWith('https://')?'Explore':placement.cta
 const content=<>
  <span className={styles.meta}><span>{placement.kind.toUpperCase()}</span> {placement.campaign.name}</span>
  {recentlySeen&&<span className={styles.passed}>Just passed</span>}
  <strong>{placement.headline}</strong>
  <span className={styles.cta}>{cta}<span aria-hidden="true">↗</span><span className={styles.sr}> (opens a new tab)</span></span>
 </>
 return <aside className={styles.cue} aria-label="Along your drive" data-placement={placement.id} data-kind={placement.kind} data-recently-seen={recentlySeen}>
  <a className={styles.link} href={destination} target="_blank" rel="noopener noreferrer" onClick={()=>onActivate(placement)} aria-label={`${cta}: ${placement.campaign.name} (opens a new tab)`}>{content}</a>
  <button className={styles.dismiss} type="button" aria-label={`Dismiss ${placement.campaign.name} ad link`} onClick={()=>setDismissed(previous=>new Set(previous).add(placement.id))}>×</button>
 </aside>
}
