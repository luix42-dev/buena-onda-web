'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Copy, ExternalLink, MapPin, X } from 'lucide-react'
import { CRUISE_PLACES, cruisePlacePath, getCruisePlace, placeCampaign, type CruisePlace } from '@/lib/cruise/campaigns'
import { trackCruiseEvent } from '@/lib/cruise/analytics'
import './places.css'

const statusLabel = { house: 'Buena Onda house', demo: 'Fictional demo', sponsored: 'Sponsored' }
const payload = (place: CruisePlace) => ({ place_id: place.id, placement_id: place.placementId, campaign_id: place.campaignId, status: place.status })

export default function PlaceDiscovery({ garage, ready, initialPlaceId, nearbyPlaceId, onStart, onOpenChange }: {
  garage: boolean; ready: boolean; initialPlaceId?: string; nearbyPlaceId: string | null
  onStart: () => void; onOpenChange: (open: boolean) => void
}) {
  const [view, setView] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [share, setShare] = useState('')
  const [fallback, setFallback] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const opened = useRef<string | null>(null)
  const deepLinkOpened = useRef(false)
  const place = getCruisePlace(view)
  const nearby = getCruisePlace(nearbyPlaceId)
  const open = useCallback((id: string) => {
    if (!dialog.current?.open) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setShare(''); setFallback(''); setView(id)
    const item = getCruisePlace(id)
    if (item && opened.current !== id) { trackCruiseEvent('cruise_place_open', payload(item)); opened.current = id }
    if (!item) opened.current = null
  }, [])
  const close = useCallback(() => { setView(null); opened.current = null; setShare(''); setFallback('') }, [])
  useEffect(() => {
    if (initialPlaceId && !deepLinkOpened.current && getCruisePlace(initialPlaceId)) {
      deepLinkOpened.current = true; open(initialPlaceId)
    }
  }, [initialPlaceId, open])
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    onOpenChange(view !== null)
    if (view !== null) {
      if (!node.open) node.showModal()
      node.querySelector<HTMLElement>('[data-place-focus]')?.focus()
    } else if (node.open) {
      node.close()
      const target = returnFocus.current
      if (target?.isConnected && target !== document.body) target.focus()
      else trigger.current?.focus()
    }
  }, [view, onOpenChange])
  async function copy(item: CruisePlace) {
    const url = new URL(cruisePlacePath(item), window.location.origin).href
    try {
      await navigator.clipboard.writeText(url)
      trackCruiseEvent('cruise_place_share', payload(item)); setShare('Link copied.'); setFallback('')
    } catch { setShare('Select and copy this link:'); setFallback(url) }
  }
  const campaign = place ? placeCampaign(place) : null
  return <>
    <button ref={trigger} className="place-directory-trigger" onClick={() => open('directory')} aria-haspopup="dialog"><MapPin size={15}/> Along the Route</button>
    {!garage && nearby && dismissed !== nearby.id && <div className="place-nearby" aria-label={`Nearby: ${nearby.name}`}>
      <button onClick={() => open(nearby.id)}><MapPin size={15}/><span><small>{nearby.name}</small>Explore this place</span></button>
      <button aria-label={`Dismiss ${nearby.name}`} onClick={() => setDismissed(nearby.id)}><X size={16}/></button>
    </div>}
    <dialog ref={dialog} className="place-dialog" aria-labelledby="place-dialog-title" onCancel={event => { event.preventDefault(); close() }} onClose={close} onKeyDown={event => event.stopPropagation()} onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div className="place-dialog-content">
        <div className="place-dialog-top">{place ? <button onClick={() => open('directory')} aria-label="Back to Along the Route"><ArrowLeft size={17}/> All places</button> : <span>MIAMI / CRUISE</span>}<button data-place-focus aria-label="Close places" onClick={close}><X size={20}/></button></div>
        {place ? <>
          <img className="place-card-image" src={place.image} alt="" width={600} height={300}/>
          <div className="place-card-copy"><span className={`place-status is-${place.status}`}>{statusLabel[place.status]}</span><h2 id="place-dialog-title">{place.name}</h2><p className="place-address">{place.address}</p><p>{place.description}</p>
            <div className="place-card-actions">{campaign?.destination && <a href={campaign.destination} target="_blank" rel="noopener noreferrer" onClick={() => trackCruiseEvent('cruise_place_outbound', payload(place))}>Explore {campaign.name}<ExternalLink size={15}/><span className="place-sr-only"> (opens a new tab)</span></a>}<button onClick={() => void copy(place)}><Copy size={15}/> Copy link</button></div>
            <p className="place-share-status" role="status">{share}</p>{fallback && <input className="place-share-url" aria-label="Place link to copy" readOnly value={fallback} onFocus={event => event.target.select()} onClick={event => event.currentTarget.select()}/>}
            <button className="place-drive-action" disabled={garage && !ready} onClick={() => { close(); if (garage) onStart() }}>{garage ? 'Start this drive' : 'Resume drive'}<ArrowRight size={17}/></button>
          </div>
        </> : <div className="place-directory"><h2 id="place-dialog-title">Along the Route</h2><p>A few places worth taking the long way for.</p><ul>{CRUISE_PLACES.map(item => <li key={item.id}><button onClick={() => open(item.id)}><img src={item.image} alt="" width={100} height={74}/><span><strong>{item.name}</strong><small>{statusLabel[item.status]}</small></span><ArrowRight size={17}/></button></li>)}</ul></div>}
      </div>
    </dialog>
  </>
}
