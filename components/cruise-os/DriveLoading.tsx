'use client'
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react'
import './drive-loading.css'

const FALLBACK = ['/images/hero/01.jpg', '/images/hero/02.jpg', '/images/hero/06.jpg', '/images/hero/08.jpg']
const label = (p: number) => p < .22 ? 'Finding the light' : p < .55 ? 'Setting the scene' : p < .72 ? 'Opening the coast' : p < .86 ? 'Bringing the city to life' : p < .94 ? 'Getting the details ready' : "Let's go."
const ready = (src: string) => new Promise<boolean>(resolve => { const image = new Image(), timeout = setTimeout(() => resolve(false), 3500); image.onload = () => { clearTimeout(timeout); resolve(true) }; image.onerror = () => { clearTimeout(timeout); resolve(false) }; image.src = src })

/** Buena Onda's drive loader (the 2026-10-23 design): the homepage HeroGrid's five tiles, crossfading through the
 * site's own photos from /hero-media.json every 4.5 s (each image decoded first, so no tile goes blank), and a
 * meter fed by SceneWarmUp's real progress. Covers the drive until it runs smoothly; the radio already plays. */
export default function DriveLoading({ show, progress, onSkip }: { show: boolean; progress: number; onSkip?: () => void }) {
  const tiles = useRef<(HTMLDivElement | null)[]>([]), pool = useRef(FALLBACK), shown = useRef(FALLBACK.slice(0, 3)), busy = useRef(false)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    fetch('/hero-media.json', { cache: 'force-cache' }).then(r => r.ok ? r.json() : null).then((manifest: { images?: unknown[] } | null) => {
      const images = Array.isArray(manifest?.images) ? manifest.images.filter((src): src is string => typeof src === 'string' && /^(https:\/\/|\/)/.test(src)) : []
      if (images.length >= 3) pool.current = images
    }).catch(() => {})
  }, [])
  useEffect(() => {
    if (!show) { setSlow(false); return }
    const slowTimer = setTimeout(() => setSlow(true), 25000)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => clearTimeout(slowTimer)
    const rotate = async () => {
      if (busy.current) return
      busy.current = true
      const available = pool.current.filter(src => !shown.current.includes(src))
      const next = [...(available.length >= 3 ? available : pool.current)].sort(() => Math.random() - .5).slice(0, 3)
      const nodes = tiles.current.filter((tile): tile is HTMLDivElement => !!tile)
      if (next.length === 3 && nodes.length === 3 && (await Promise.all(next.map(ready))).every(Boolean)) {
        const incoming = nodes.map((tile, i) => { const image = tile.querySelector<HTMLImageElement>('.bl-next')!; image.src = next[i]; return image })
        if ((await Promise.all(incoming.map(image => image.decode().then(() => true).catch(() => false)))).every(Boolean)) {
          nodes.forEach(tile => tile.classList.add('bl-fading'))
          await new Promise(resolve => setTimeout(resolve, 650))
          nodes.forEach((tile, i) => { tile.querySelector<HTMLImageElement>('.bl-current')!.src = next[i]; tile.classList.remove('bl-fading') })
          shown.current = next
        }
      }
      busy.current = false
    }
    const timer = setInterval(() => void rotate(), 4500)
    return () => { clearInterval(timer); clearTimeout(slowTimer) }
  }, [show])
  const value = show ? Math.min(.94, progress) : 1
  const photo = (i: number, src: string, size: [number, number]) => <div className="bl-tile bl-tile-photo" ref={node => { tiles.current[i] = node }}>
    <img className="bl-current" src={src} alt="" width={size[0]} height={size[1]} decoding="async"/><img className="bl-next" alt="" decoding="async"/>
  </div>
  return <section className="drive-loading" data-show={show} aria-label="Preparing your Buena Onda drive" aria-busy={show} aria-hidden={!show} style={{ '--progress': value } as React.CSSProperties}>
    <div className="bl-layout">
      <div className="bl-copy">
        <p className="bl-eyebrow">Buena Onda original &nbsp; / &nbsp; Cruise Miami</p>
        <h1><span>Buena</span> <span>Onda.</span></h1>
        <p className="bl-intro"><strong>Take the long way.</strong> Good music, warm air, and a city waiting for you.</p>
      </div>
      <div className="bl-art" aria-hidden="true">
        {photo(0, FALLBACK[0], [640, 640])}{photo(1, FALLBACK[1], [1080, 1080])}
        <div className="bl-tile bl-tile-type">EST. 2014</div>
        {photo(2, FALLBACK[2], [720, 473])}
        <div className="bl-tile bl-tile-type">MIAMI, FL</div>
      </div>
      <div className="bl-loading">
        <div><div className="bl-stage-row"><i className="bl-dot" aria-hidden="true"/><span role="status" aria-live="polite">{show ? label(value) : "Let's go."}</span></div><p className="bl-detail">{slow ? 'The first drive can take a little longer.' : 'Keep the music on.'}</p></div>
        <div className="bl-meter-wrap"><div className="bl-meter" role="progressbar" aria-label="Drive preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}/><div className="bl-meter-labels" aria-hidden="true"><span>SETTLE IN</span><span>LET&apos;S GO</span></div></div>
        {onSkip && <button type="button" className="bl-skip" onClick={onSkip}>Skip the drive, keep listening</button>}
      </div>
    </div>
  </section>
}
