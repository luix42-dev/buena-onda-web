'use client'
import {useEffect,useRef,useState} from 'react'
import {Pause,Play,SkipBack,SkipForward,MoreHorizontal} from 'lucide-react'
import {canPlayCruiseStation} from '@/lib/real-miami/stations'
import {useCruisePreference} from '@/lib/cruise/preferences'
import type {DriveDeckProps,DriveMode} from './DriveDeck'
import type {CameraView} from '@/components/experience/OpeningMinute'
import CastButton from './CastButton'
import './mobile-player.css'
export default function MobilePlayer(p:DriveDeckProps){
 const a=p.audio,[sheet,setSheet]=useState<'stations'|'more'|null>(null),dialog=useRef<HTMLDialogElement>(null),bar=useRef<HTMLDivElement>(null),opener=useRef<HTMLElement|null>(null)
 const [ads,setAds]=useCruisePreference('ads',true),[hologram,setHologram]=useCruisePreference('hologram',false),[nova,setNova]=useCruisePreference('nova',false)
 const open=(next:'stations'|'more')=>{opener.current=document.activeElement as HTMLElement;setSheet(next)}
 const close=()=>{setSheet(null);opener.current?.focus()}
 useEffect(()=>{const d=dialog.current;if(sheet&&!d?.open)d?.showModal();else if(!sheet&&d?.open)d.close()},[sheet])
 useEffect(()=>{const node=bar.current;if(!node)return;const update=()=>document.documentElement.style.setProperty('--cruise-player-height',`${node.getBoundingClientRect().height+16}px`);const observer=new ResizeObserver(update);observer.observe(node);update();return()=>{observer.disconnect();document.documentElement.style.removeProperty('--cruise-player-height')}},[])
 return <><div className="mobile-player" ref={bar} role="group" aria-label="Radio player">
 <button className="mobile-station" aria-haspopup="dialog" onClick={()=>open('stations')}><strong>{a.station.name}</strong>{a.loading&&<small>Tuning…</small>}</button>
 <div className="mobile-transport"><button aria-label="Previous station" onClick={()=>a.stepStation(-1)}><SkipBack/></button><button aria-label={a.requested?'Pause radio':'Play radio'} onClick={a.toggle}>{a.requested?<Pause/>:<Play/>}</button><button aria-label="Next station" onClick={()=>a.stepStation(1)}><SkipForward/></button><CastButton audio={p.audio} params={p.castParams}/><button aria-label="More" aria-haspopup="dialog" onClick={()=>open('more')}><MoreHorizontal/></button></div>
 {a.error&&<button className="mobile-error" onClick={a.start}>Radio unavailable. Retry</button>}</div>
 <dialog className="mobile-sheet" ref={dialog} aria-label={sheet==='stations'?'Radio stations':'More settings'} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===dialog.current)close()}}>
 <header><strong>{sheet==='stations'?'Radio stations':'More'}</strong><button autoFocus aria-label="Close sheet" onClick={close}>×</button></header>
 {sheet==='stations'?<>{a.casting&&<p role="status">Showing stations available on TV.</p>}{p.drive==='retrowave'&&<p>Suggested for Retrowave: Nightride FM</p>}<div className="mobile-stations">{a.stations.filter(canPlayCruiseStation).map(s=><button key={s.id} aria-pressed={a.stationId===s.id} onClick={()=>{a.selectStation(s.id);close()}}>{s.name}</button>)}</div></>:<>
 <label>Camera<select value={p.view} onChange={e=>p.onView(e.target.value as CameraView)}><option value="low">Chase</option><option value="driver">Cockpit</option><option value="director">Cinematic</option></select></label>
 <button onClick={p.onNight}>{p.night?'Switch to day':'Switch to night'}</button>
 <label>World<select aria-label="World" value={p.drive} onChange={e=>p.onDrive(e.target.value as DriveMode)}><option value="city">City</option><option value="highway">Highway</option><option value="retrowave">Retrowave</option></select></label>
 <label>Volume<input aria-label="Radio volume" type="range" min="0" max="1" step=".01" value={a.volume} onChange={e=>a.setVolume(Number(e.target.value))}/></label><button aria-pressed={a.muted} onClick={()=>a.setMuted(!a.muted)}>Mute</button>
 <label><input type="checkbox" checked={ads} onChange={e=>setAds(e.target.checked)}/>Show ads</label>
 <label><input type="checkbox" checked={nova} onChange={e=>setNova(e.target.checked)}/>Nova companion</label>
 {nova&&p.companion&&<label>Nova conversation<select value={p.companion.mode} onChange={e=>p.companion?.onMode(e.target.value as 'off'|'quiet'|'occasional'|'chatty')}><option value="off">Off</option><option value="quiet">Quiet</option><option value="occasional">Occasional</option><option value="chatty">Chatty</option></select></label>}
 <label><input type="checkbox" checked={hologram} onChange={e=>setHologram(e.target.checked)}/>Nova hologram</label>
 {document.fullscreenEnabled&&<button onClick={()=>{void(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).catch(()=>{});close()}}>Fullscreen</button>}
 {p.onListen&&<button onClick={()=>{close();p.onListen?.()}}>Just the radio</button>}<button onClick={()=>{close();p.onMenu()}}>Places & settings</button>
 </>}</dialog></>
}
