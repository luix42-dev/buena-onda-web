'use client'

import Promotion from '@/components/cruise-os/Promotion'
import type {MiamiAdPlacement,MiamiAdSample} from '@/lib/real-miami/advertising'
import styles from './ad-cue.module.css'

type Props={sample:MiamiAdSample|null;recentlySeen?:boolean;onActivate:(placement:MiamiAdPlacement)=>void}

export default function DiscreetAdCue({sample,recentlySeen=false,onActivate}:Props){
 if(!sample||(!recentlySeen&&(!sample.visible||sample.occlusion>.5)))return null
 const placement=sample.placement,destination=placement.campaign.destination
 if(!destination)return null
 const cta=placement.cta.startsWith('/')||placement.cta.startsWith('https://')?'Explore':placement.cta
 const content=<>
  <span className={styles.meta}><span>{placement.kind.toUpperCase()}</span> {placement.campaign.name}</span>
  {recentlySeen&&<span className={styles.passed}>Just passed</span>}
  <strong>{placement.headline}</strong>
  <span className={styles.cta}>{cta}<span aria-hidden="true">↗</span><span className={styles.sr}> (opens a new tab)</span></span>
 </>
 return <Promotion id={placement.campaign.id}>
  <a className={styles.link} href={destination} target="_blank" rel="noopener noreferrer" onClick={()=>onActivate(placement)} aria-label={`${cta}: ${placement.campaign.name} (opens a new tab)`}>{content}</a>
 </Promotion>
}
