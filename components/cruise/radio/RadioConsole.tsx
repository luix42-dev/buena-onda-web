'use client'
import { useEffect, useRef, type PointerEvent } from 'react'
import { ArrowLeft, CircleHelp, Power, Volume2, VolumeX } from 'lucide-react'
import { RADIO_PRESETS, useCockpit } from '../vehicle/CockpitContext'
import './radio-console.css'

export type TutorialStep = 0 | 1 | 2 | 3 | null
const lessons = [
  ['Tap the radio to tune in.', 'Use the dashboard radio or the Radio button. Your drive keeps going.'],
  ['Choose a preset or use SEEK.', 'Four stations, one player. The display tells you when the station is playing.'],
  ['Drag to adjust volume.', 'Drag the knob up or down, or use the slider and arrow keys.'],
  ['Back to the road.', 'Use Back to drive or press Escape. Your music comes with you.'],
]
export default function RadioConsole({focused,step,onClose,onSkip,onReplay,hidden=false}:{focused:boolean;step:TutorialStep;onClose:()=>void;onSkip:()=>void;onReplay:()=>void;hidden?:boolean}) {
  const controls=useCockpit()!
  const {audio,operateRadio}=controls
  const drag=useRef<{y:number;value:number}|null>(null)
  useEffect(()=>{if(focused&&!hidden)document.querySelector<HTMLButtonElement>('.radio-console-toolbar button')?.focus()},[focused,hidden])
  function down(e:PointerEvent<HTMLButtonElement>){e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,value:audio.volume}}
  function move(e:PointerEvent<HTMLButtonElement>){if(!drag.current)return;e.preventDefault();e.stopPropagation();operateRadio('volume',Math.max(0,Math.min(1,drag.current.value+(drag.current.y-e.clientY)/170)))}
  return <div className="radio-experience" data-radio-focus={focused} data-tutorial={step===null?'none':step} hidden={hidden}>
    {!focused&&<div className="radio-entry"><button className={step===0?'radio-highlight':''} onClick={controls.focusRadio} aria-label="Focus radio"><span className="radio-entry-light"/> Radio <span aria-hidden>↗</span></button><button aria-label="Radio help" title="Radio help" onClick={onReplay}><CircleHelp size={19}/></button></div>}
    {step!==null&&<aside className="radio-lesson" aria-live="polite"><div><span className="radio-lesson-count">RADIO / {step+1} OF 4</span><button onClick={onSkip}>Skip</button></div><strong>{lessons[step][0]}</strong><p>{lessons[step][1]}</p></aside>}
    {focused&&<section className="radio-console" aria-label="Dashboard radio controls" onPointerDown={e=>e.stopPropagation()}>
      <div className="radio-console-toolbar"><button className={step===3?'radio-highlight':''} onClick={onClose}><ArrowLeft size={17}/> Back to drive <kbd>Esc</kbd></button><button onClick={onReplay} aria-label="Radio help"><CircleHelp size={18}/></button></div>
      <div className="radio-headunit">
        <div className="radio-maker">BUENA ONDA <span>RADIO / STEREO</span></div>
        <div className="radio-main">
          <div className="radio-power"><button className={audio.playing?'is-on':''} aria-label={audio.requested?'Power off radio':'Power on radio'} aria-pressed={audio.requested} onClick={()=>operateRadio('power')} title="Power"><Power size={23}/></button><small>POWER</small></div>
          <div className={`radio-lcd ${audio.error?'has-error':''}`} role="status"><small>{audio.error?'UNAVAILABLE':audio.loading?'CONNECTING':audio.playing?(audio.muted?'PLAYING · MUTED':'PLAYING'):'SELECTED · POWER OFF'}</small><strong>{audio.station.name}</strong><span>{audio.error?'Press POWER to retry':audio.trackTitle&&audio.station.playback==='playlist'?audio.trackTitle:'INTERNET RADIO'}</span></div>
          <div className={`radio-volume ${step===2?'radio-highlight':''}`}><button role="slider" aria-label="Volume knob" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(audio.volume*100)} aria-valuetext={`${Math.round(audio.volume*100)} percent`} title="Drag up or down to adjust volume" onPointerDown={down} onPointerMove={move} onPointerUp={e=>{e.currentTarget.releasePointerCapture(e.pointerId);drag.current=null}} onPointerCancel={()=>{drag.current=null}} onKeyDown={e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();operateRadio('volume',e.key==='Home'?0:e.key==='End'?1:audio.volume+(['ArrowUp','ArrowRight'].includes(e.key)?.05:-.05))}}}><span style={{transform:`rotate(${-135+audio.volume*270}deg)`}}/></button><small>VOLUME {Math.round(audio.volume*100)}</small></div>
        </div>
        <div className={`radio-presets ${step===1?'radio-highlight':''}`} aria-label="Radio presets">{RADIO_PRESETS.map((station,i)=><button key={station.id} onClick={()=>operateRadio('preset',station.id)} aria-pressed={audio.stationId===station.id} aria-label={`Preset ${i+1}: ${station.name}`}><b>{i+1}</b><span>{i===0?'ONDA':i===1?'JOLT':station.name}</span></button>)}</div>
        <div className="radio-bottom"><div className="radio-seek"><button onClick={()=>operateRadio('seek',-1)} aria-label="Seek previous station">‹</button><span>SEEK</span><button onClick={()=>operateRadio('seek',1)} aria-label="Seek next station">›</button></div><button className="radio-mute" aria-label={audio.muted?'Unmute radio':'Mute radio'} onClick={()=>operateRadio('mute')}>{audio.muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><input type="range" aria-label="Dashboard volume" min="0" max="1" step=".01" value={audio.volume} onChange={e=>operateRadio('volume',Number(e.target.value))}/></div>
      </div>
      <p className="radio-console-hint">Keep cruising. Presets and SEEK select a station; POWER starts or stops listening.</p>
    </section>}
  </div>
}
