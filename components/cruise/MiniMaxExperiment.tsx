'use client'
import { useRef,useState } from 'react'
import { useCruiseAudio } from './audio/useCruiseAudio'
import RadioPanel from './RadioPanel'
import { CRUISE_PLACES,placeCampaign } from '@/lib/cruise/campaigns'
import './cruise.css'
import './launch.css'

/** Honest, bounded comparison player: one car framing, one camera, one night clip. */
export default function MiniMaxExperiment(){
 const video=useRef<HTMLVideoElement>(null);const audio=useCruiseAudio();const [started,start]=useState(false);const [card,setCard]=useState(false);const [radio,setRadio]=useState(false);const [paused,setPaused]=useState(false)
 const place=CRUISE_PLACES[0],campaign=placeCampaign(place)
 function begin(){audio.start();void video.current?.play();start(true)}
 return <div className="cruise-experience launch-experience" data-minimax data-cruise style={{background:'#091118'}}>
  <video ref={video} src="/cruise/experiments/minimax/night-driver.mp4" muted playsInline loop preload="metadata" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}}/>
  <header className="launch-header cruise-hud"><a className="launch-pill" href="/cruise">← Interactive drive</a><span className="launch-small">MINIMAX TEST / NIGHT / DRIVER VIEW</span></header>
  {!started&&<button className="launch-start" style={{position:'absolute',width:'min(360px,90vw)',top:'45%',left:'50%',transform:'translateX(-50%)'}} onClick={begin}>Play cinematic test</button>}
  <footer className="launch-controls cruise-hud" style={{flexWrap:'wrap'}}>
   <button className="launch-pill" onClick={()=>{const next=!paused;setPaused(next);if(next)video.current?.pause();else void video.current?.play()}}>{paused?'Resume video':'Pause video'}</button>
   <button className="launch-pill" onClick={audio.toggle}>{audio.playing?'Pause radio':'Play radio'}</button>
   <button className="launch-station" onClick={()=>setRadio(!radio)} aria-label="Radio stations"><span>Buena Onda Radio</span><strong>{audio.loading?'Tuning in…':audio.station.name}</strong></button>
   <input aria-label="Radio volume" type="range" min="0" max="1" step=".01" value={audio.volume} onChange={e=>audio.setVolume(Number(e.target.value))}/>
   <button className="launch-pill" onClick={()=>setCard(!card)}>Explore house sponsor</button>
   <small>6-second generated clip · Hard loop under review · Screen overlay sponsor</small>
   {audio.error&&<span role="status">{audio.error}</span>}
   {radio&&<RadioPanel audio={audio} onClose={()=>setRadio(false)}/>}
  </footer>
  {card&&<section role="dialog" aria-label="House sponsor" style={{position:'absolute',top:90,right:24,width:'min(360px,90vw)',maxHeight:'calc(100dvh - 260px)',overflow:'auto',padding:24,background:'#f0e5d1',color:'#21362f',borderRadius:16}}><button className="launch-pill" style={{color:'#21362f'}} onClick={()=>setCard(false)}>Close sponsor</button><img src={place.image} alt="" style={{width:'100%',marginTop:14}}/><h2>{place.name}</h2><p>{place.description}</p><a href={campaign.destination!} target="_blank" rel="noopener noreferrer">Visit Buena Onda Radio ↗</a><p><small>House content. This is a screen control, not a sign tracked into the footage.</small></p></section>}
 </div>
}
