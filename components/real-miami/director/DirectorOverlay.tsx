'use client'

import { useEffect, useState } from 'react'
import './director.css'

/** 2.39:1 letterbox (CSS only, no render cost) and the entry title card. */
export default function DirectorOverlay({ station, letterbox, onLetterbox }: { station: string; letterbox: boolean; onLetterbox: (on: boolean) => void }) {
  const [title, setTitle] = useState(true)
  useEffect(() => { const timer = setTimeout(() => setTitle(false), 3000); return () => clearTimeout(timer) }, [])
  // The HUD recedes after three quiet seconds and returns on any pointer, touch or key.
  useEffect(() => {
    const root = document.querySelector('.jn'); let timer = 0
    const wake = () => { root?.classList.remove('jn-idle'); clearTimeout(timer); timer = window.setTimeout(() => root?.classList.add('jn-idle'), 3000) }
    wake(); const events = ['pointermove', 'pointerdown', 'keydown'] as const
    events.forEach(e => window.addEventListener(e, wake, { passive: true }))
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, wake)); root?.classList.remove('jn-idle') }
  }, [])
  return <>
    {letterbox && <div className="dc-bars" aria-hidden="true"><i /><i /></div>}
    <div className={`dc-title ${title ? 'dc-title-on' : ''}`} aria-hidden={!title} role="status">
      <span>{station}</span>
      <strong>BUENA ONDA CRUISE</strong>
    </div>
    <button className="dc-letterbox" type="button" aria-pressed={letterbox} onClick={() => onLetterbox(!letterbox)} aria-label="Toggle 2.39 letterbox">2.39</button>
  </>
}
