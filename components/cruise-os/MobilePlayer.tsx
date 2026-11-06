'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Camera, ChevronDown, MoreHorizontal, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { canPlayCruiseStation } from '@/lib/real-miami/stations'
import { useCruisePreference } from '@/lib/cruise/preferences'
import type { DriveDeckProps, DriveMode } from './DriveDeck'
import type { CameraView } from '@/components/experience/OpeningMinute'
import CastButton from './CastButton'
import './mobile-player.css'

const cameras: readonly [CameraView, string][] = [['low', 'Chase'], ['driver', 'Cockpit'], ['director', 'Cinematic']]

export default function MobilePlayer(p: DriveDeckProps) {
  const a = p.audio
  const [sheet, setSheet] = useState<'stations' | 'more' | null>(null)
  const sheetId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [ads, setAds] = useCruisePreference('ads', true)
  const [hologram, setHologram] = useCruisePreference('hologram', false)
  const [nova, setNova] = useCruisePreference('nova', false)
  const cameraIndex = Math.max(0, cameras.findIndex(([view]) => view === p.view))
  const nextCamera = cameras[(cameraIndex + 1) % cameras.length]

  const open = (next: 'stations' | 'more', trigger: HTMLButtonElement) => {
    opener.current = trigger
    setSheet(next)
  }
  const close = () => {
    // Close the modal before restoring focus outside it, including on touch browsers.
    dialog.current?.close()
    setSheet(null)
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true })
  }

  useEffect(() => {
    const node = dialog.current
    if (!sheet || !node) return
    if (!node.open) node.showModal()
    closeButton.current?.focus({ preventScroll: true })
    return () => { if (node.open) node.close() }
  }, [sheet])

  useEffect(() => {
    const node = bar.current
    if (!node) return
    const update = () => document.documentElement.style.setProperty('--cruise-player-height', `${node.getBoundingClientRect().height + 16}px`)
    const observer = new ResizeObserver(update)
    observer.observe(node)
    update()
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--cruise-player-height')
    }
  }, [])

  return <>
    <div className="mobile-player" ref={bar} role="group" aria-label="Radio player">
      <div className="mobile-player-heading">
        <button className="mobile-station" aria-haspopup="dialog" aria-expanded={sheet === 'stations'} aria-controls={sheetId}
          onClick={event => open('stations', event.currentTarget)}>
          <strong>{a.station.name}</strong>{a.loading && <small>Tuning…</small>}<ChevronDown size={14} aria-hidden="true" />
        </button>
        <button className="mobile-camera" aria-label={`Camera: ${cameras[cameraIndex][1]}. Switch to ${nextCamera[1]}`}
          title={`Switch to ${nextCamera[1]}`} onClick={() => p.onView(nextCamera[0])}>
          <Camera size={20} aria-hidden="true" />
        </button>
        <button className="mobile-more" aria-label="More" aria-haspopup="dialog" aria-expanded={sheet === 'more'} aria-controls={sheetId}
          onClick={event => open('more', event.currentTarget)}>
          <MoreHorizontal size={18} aria-hidden="true" /><span>More</span>
        </button>
      </div>
      <div className="mobile-transport">
        <button aria-label="Previous station" onClick={() => a.stepStation(-1)}><SkipBack /></button>
        <button aria-label={a.requested ? 'Pause radio' : 'Play radio'} onClick={a.toggle}>{a.requested ? <Pause /> : <Play />}</button>
        <button aria-label="Next station" onClick={() => a.stepStation(1)}><SkipForward /></button>
        <CastButton audio={a} params={p.castParams} />
      </div>
      {a.error && <button className="mobile-error" onClick={a.start}>Radio unavailable. Retry</button>}
    </div>
    <dialog id={sheetId} className="mobile-sheet" ref={dialog} aria-label={sheet === 'stations' ? 'Radio stations' : 'More settings'}
      onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === dialog.current) close() }}>
      <header><strong>{sheet === 'stations' ? 'Radio stations' : 'More'}</strong><button ref={closeButton} aria-label="Close sheet" onClick={close}><X size={20} /></button></header>
      {sheet === 'stations' ? <>
        {a.casting && <p role="status">Showing stations available on TV.</p>}
        {p.drive === 'retrowave' && <p>Suggested for Retrowave: Nightride FM</p>}
        <div className="mobile-stations">{a.stations.filter(canPlayCruiseStation).map(station =>
          <button key={station.id} aria-pressed={a.stationId === station.id} onClick={() => { a.selectStation(station.id); close() }}>{station.name}</button>)}</div>
      </> : <>
        <label>Camera<select value={p.view} onChange={event => p.onView(event.target.value as CameraView)}>
          {cameras.map(([view, name]) => <option key={view} value={view}>{name}</option>)}
        </select></label>
        <button onClick={p.onNight}>{p.night ? 'Switch to day' : 'Switch to night'}</button>
        <label>World<select aria-label="World" value={p.drive} onChange={event => p.onDrive(event.target.value as DriveMode)}>
          <option value="city">City</option><option value="highway">Highway</option><option value="retrowave">Retrowave</option>
        </select></label>
        <label>Volume<input aria-label="Radio volume" type="range" min="0" max="1" step=".01" value={a.volume} onChange={event => a.setVolume(Number(event.target.value))} /></label>
        <button aria-pressed={a.muted} onClick={() => a.setMuted(!a.muted)}>Mute</button>
        <label><input type="checkbox" checked={ads} onChange={event => setAds(event.target.checked)} />Show ads</label>
        <label><input type="checkbox" checked={nova} onChange={event => setNova(event.target.checked)} />Nova companion</label>
        {nova && p.companion && <label>Nova conversation<select value={p.companion.mode} onChange={event => p.companion?.onMode(event.target.value as 'off' | 'quiet' | 'occasional' | 'chatty')}>
          <option value="off">Off</option><option value="quiet">Quiet</option><option value="occasional">Occasional</option><option value="chatty">Chatty</option>
        </select></label>}
        <label><input type="checkbox" checked={hologram} onChange={event => setHologram(event.target.checked)} />Nova hologram</label>
        {document.fullscreenEnabled && <button onClick={() => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); close() }}>Fullscreen</button>}
        {p.onListen && <button onClick={() => { close(); p.onListen?.() }}>Just the radio</button>}
        <button onClick={() => { close(); p.onMenu() }}>Places &amp; settings</button>
      </>}
    </dialog>
  </>
}
