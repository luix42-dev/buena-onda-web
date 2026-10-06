'use client'
import { useEffect, useRef } from 'react'
import type { MusicAudio } from '@/lib/cruise/music-audio'
import type { MiamiExperiment } from '@/lib/cruise/miami-choreography'
export default function MusicDebug({ music, mode, setMode }: { music: MusicAudio; mode: 'miami' | 'retrowave'; setMode: (mode: 'miami' | 'retrowave') => void }) {
  const output = useRef<HTMLOutputElement>(null)
  useEffect(() => {
    const update = () => {
      const s = music.director.signal, c = music.miami
      if (output.current) {
        output.current.textContent = `${music.status}\nBass ${s.bass.toFixed(2)} / Mids ${s.mids.toFixed(2)} / Highs ${s.highs.toFixed(2)}\nEnergy ${s.energy.toFixed(2)} / Transient ${s.transient.toFixed(2)} / Events ${s.events}\nBeat confidence ${s.confidence.toFixed(2)} / CPU ${music.analysisMs.toFixed(2)} ms\nMiami ${['low','medium','high'][c.state]} / A ${c.counts.a} B ${c.counts.b} C ${c.counts.c} D ${c.counts.d}`
        output.current.dataset.metrics = JSON.stringify({time:performance.now(),active:music.analysisActive,signal:s,counts:c.counts,state:c.state,energy:c.energy,cpuMs:c.cpuMs,analysisToWorldMs:c.analysisToWorldMs,analysisMs:music.analysisMs,ages:[c.waves[0],c.waves[2],c.sequence[0],c.block[0],c.gateway[0]],settings:c.settings})
      }
    }
    update(); const timer = setInterval(update, 200); return () => clearInterval(timer)
  }, [music])
  return <aside data-music-mode={mode} style={{ position: 'absolute', zIndex: 40, top: 85, left: 16, background: '#090616dd', color: '#c9faff', padding: 10, font: '11px monospace', maxWidth: 'calc(100vw - 32px)' }}>
    <button aria-pressed={mode === 'miami'} onClick={() => setMode('miami')}>MIAMI</button>{' / '}
    <button aria-pressed={mode === 'retrowave'} onClick={() => setMode('retrowave')}>RETROWAVE</button>
    <details><summary style={{cursor:'pointer',marginTop:8}}>Experiment controls</summary>
      <label style={{display:'block'}}><input type="checkbox" defaultChecked onChange={e=>{music.miami.settings.enabled=e.target.checked}}/> Miami reactivity</label>
      {([['a','Road wave'],['b','Roadside sequence'],['c','Block sweep'],['d','Major transition']] as [MiamiExperiment,string][]).map(([key,label])=><label key={key} style={{display:'block'}}><input type="checkbox" defaultChecked onChange={e=>{music.miami.settings[key]=e.target.checked}}/>{key.toUpperCase()} {label}</label>)}
      <label style={{display:'block'}}>Reaction strength <input aria-label="Reaction strength" type="range" min="0" max="1.5" step=".05" defaultValue="1" onChange={e=>{music.miami.settings.strength=Number(e.target.value)}}/></label>
      <button onClick={()=>music.miami.forceTransition()}>Force transition (test only)</button>
      <output ref={output} data-music-debug style={{display:'block',whiteSpace:'pre-line',lineHeight:1.7,marginTop:8}}/>
    </details>
  </aside>
}
