'use client'
import {useState} from 'react'
import {distanceToExit} from '@/lib/cruise-os/interchange'
import styles from './drive-interchange.module.css'

export default function DriveInterchange({drive,meters,length,exit,onSwitch}:{drive:'city'|'highway';meters:number;length:number;exit:number;onSwitch:()=>void}){
 const [dismissed,setDismissed]=useState(''),[queued,setQueued]=useState(false)
 const ahead=distanceToExit(meters,exit,length),near=ahead<=380
 const visit=`${drive}:${Math.floor((meters-exit+length)/length)}`
 const target=drive==='city'?'Highway':'City'
 if(!near||dismissed===visit)return null
 return <aside className={styles.cue} aria-label={`${target} interchange`}>
  <div><small>BUENA ONDA / INTERCHANGE</small><strong>{drive==='city'?'MacArthur Causeway ahead.':'Miami Beach return ahead.'}</strong><span>{queued?'Route set. Continue driving.':drive==='city'?'Cross the bay to I-395 and Highway':'Cross the bay to City'}</span></div>
  <button className={styles.enter} disabled={queued} onClick={()=>{onSwitch();setQueued(true)}} aria-label={`Take causeway to ${target}`}>{queued?'Route set':'Take causeway'} <span aria-hidden="true">↗</span></button>
  <button className={styles.dismiss} onClick={()=>setDismissed(visit)} aria-label="Dismiss interchange">×</button>
 </aside>
}
