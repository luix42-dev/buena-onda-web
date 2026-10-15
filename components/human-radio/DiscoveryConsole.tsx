'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import type { HumanRadioMetadata } from '@/lib/human-radio/metadata'
import { HUMAN_RADIO_STATIONS, STATION_DETAILS } from '@/lib/human-radio/stations'
import { canPlayCruiseStation } from '@/lib/real-miami/stations'
import { searchLinks, type Discovery } from '@/lib/human-radio/finds'
import { discoveryCard, randomStation, stationShareUrl, type RadioSharePath } from '@/lib/human-radio/explore'
import { searchStations } from '@/lib/human-radio/station-search'
import { useDiscoveries } from './useDiscoveries'
import { useStationMemory } from './useStationMemory'
import './human-radio.css'
import '../cruise-os/radio-os.css'

type Audio = ReturnType<typeof useCruiseAudio>
export type OsRadioPanel = 'stations' | 'presets' | 'finds' | null
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DiscoveryConsole({ audio, metadata, listeningOnly, onListeningOnly, presence, onPresence, onFocusRadio, credits, experienceMode = false, sharePath = '/cruise/human-radio', onAction, osPanel = null, onOsPanel, onOsBack, osCanFocusRadio = true }: {
  audio: Audio; metadata: HumanRadioMetadata | null; listeningOnly: boolean; onListeningOnly: () => void
  presence: boolean; onPresence: () => void; onFocusRadio: () => void; credits?: ReactNode
  experienceMode?: boolean; sharePath?: RadioSharePath; onAction?: (event: 'station_change' | 'station_save' | 'verified_song_save' | 'share') => void
  osPanel?: OsRadioPanel; onOsPanel?: (value: OsRadioPanel) => void; onOsBack?: () => void; osCanFocusRadio?: boolean
}) {
  const library = useDiscoveries({ metadata, stationName: audio.station.name, playing: audio.playing, loading: audio.loading })
  const [open, setOpen] = useState(false), [tab, setTab] = useState<'stations' | 'finds' | 'presets'>('stations')
  const [filter, setFilter] = useState('All stations'), [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)
  const osDialog = useRef<HTMLDialogElement>(null)
  const osOpener = useRef<HTMLButtonElement>(null)
  const osHeading = useRef<HTMLHeadingElement>(null), osLastPanel = useRef<OsRadioPanel>(null)
  const osMode = typeof onOsPanel === 'function', osOpen = osMode && osPanel !== null
  useEffect(() => {
    if (!osOpen) return
    const dialog = osDialog.current
    if (!dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.close()
      if (document.querySelector('dialog[open]')) return
      const oldDialog = trigger?.closest('dialog'), hiddenTrigger = oldDialog && !oldDialog.open
      const glovebox = document.querySelector<HTMLElement>('.cruise-os .os-world-tools button[aria-haspopup="dialog"]')
      const restore = trigger?.isConnected && trigger !== document.body && !hiddenTrigger ? trigger : hiddenTrigger ? glovebox || osOpener.current : osOpener.current
      restore?.focus({ preventScroll: true })
    }
  }, [osOpen])
  useEffect(() => {
    if (osOpen && osLastPanel.current !== null && osLastPanel.current !== osPanel) { osHeading.current?.focus({ preventScroll: true }); const content = osDialog.current?.querySelector('.os-radio-content'); if (content) content.scrollTop = 0 }
    osLastPanel.current = osOpen ? osPanel : null
  }, [osOpen, osPanel])
  // The owned playlist has an observed upstream outage. Keep manual choice,
  // but seek/random tuning uses only the direct streams checked in this audit.
  const eligible = useMemo(() => HUMAN_RADIO_STATIONS.filter(station => canPlayCruiseStation(station) && station.playback !== 'playlist'), [])
  const eligibleIds = useMemo(() => eligible.map(station => station.id), [eligible])
  const memory = useStationMemory(experienceMode || osMode, audio.stationId, eligibleIds)
  const results = useMemo(() => searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, experienceMode || osMode ? query : '', filter), [experienceMode, osMode, query, filter])
  const categories = useMemo(() => ['All stations', ...new Set(Object.values(STATION_DETAILS).flatMap(item => [item.city, ...item.genres]))], [])
  const details = STATION_DETAILS[audio.stationId]
  const title = metadata?.kind === 'track' && metadata.artist && metadata.title ? `${metadata.artist} — ${metadata.title}` : 'Track information unavailable'
  const show = metadata?.show
  useEffect(() => { if (!open) return; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape) }, [open])
  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus({ preventScroll: true })
    return () => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }) }
  }, [open])
  useEffect(() => { if (!note) return; const timer = setTimeout(() => setNote(''), 6000); return () => clearTimeout(timer) }, [note])
  const tune = (id: string) => { if (audio.selectStation(id)) { if(id!==audio.stationId)onAction?.('station_change'); audio.start(); setNote('Tuning in…') } }
  const favorite = (id: string) => { if(!library.favorites.includes(id))onAction?.('station_save'); library.toggleFavorite(id) }
  const save = () => { if(!library.isSaved&&library.canSave&&metadata?.kind==='track')onAction?.('verified_song_save'); library.toggleSave() }
  const surprise = () => { const id = randomStation(eligible.map(station => station.id), audio.stationId); if (id) tune(id) }
  const seek = (direction: number) => { if (!eligible.length) return; const index = eligible.findIndex(station => station.id === audio.stationId); const next = index < 0 ? (direction < 0 ? eligible.length - 1 : 0) : (index + direction + eligible.length) % eligible.length; tune(eligible[next].id) }
  const latest = useRef({ audio, seek }); latest.current = { audio, seek }
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const handlers: [MediaSessionAction, () => void][] = [['play', () => latest.current.audio.start()], ['pause', () => latest.current.audio.pause()], ['previoustrack', () => latest.current.seek(-1)], ['nexttrack', () => latest.current.seek(1)]]
    for (const [action, handler] of handlers) { try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* Optional browser capability. */ } }
    return () => { for (const [action] of handlers) { try { navigator.mediaSession.setActionHandler(action, null) } catch {} }; navigator.mediaSession.metadata = null }
  }, [])
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: metadata?.kind === 'track' ? title : show || audio.station.name, artist: metadata?.kind === 'track' ? metadata.artist || audio.station.name : audio.station.name, album: 'Buena Onda Cruise' })
      navigator.mediaSession.playbackState = audio.playing ? 'playing' : 'paused'
    } catch { /* Listening remains available without lock-screen metadata. */ }
  }, [audio.playing, audio.station.name, metadata?.kind, metadata?.artist, title, show])
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setNote('Copied') } catch { setNote(text) } }
  const share = async (item?: Discovery) => {
    const stationId = item?.stationId || audio.stationId
    const text = item ? `${[item.artist, item.title].filter(Boolean).join(' — ')} · discovered on ${item.stationName}` : `${audio.station.name} · No Algorithms. Just Frequencies.`
    const url = stationShareUrl(location.origin, stationId, sharePath)
    try { if (navigator.share) await navigator.share({ title: 'Buena Onda Cruise', text, url }); else { await navigator.clipboard.writeText(`${text}\n${url}`); setNote('Copied') }; onAction?.('share') }
    catch (error) { if ((error as Error).name !== 'AbortError') setNote(url) }
  }
  const favorites = library.favorites.map(id => HUMAN_RADIO_STATIONS.find(station => station.id === id)).filter((station): station is typeof HUMAN_RADIO_STATIONS[number] => !!station)

  if (osMode) {
    const panelName = osPanel === 'presets' ? 'Saved stations' : osPanel === 'finds' ? 'My Finds' : 'Radio'
    const verifiedSong = library.canSave && metadata?.kind === 'track'
    const broadcast = library.canSave && metadata?.kind === 'show'
    const osTitle = metadata?.kind === 'track' && metadata.artist && metadata.title ? `${metadata.artist} - ${metadata.title}` : 'Track information unavailable'
    const controls = () => <div className="os-radio-controls">
      <button type="button" onClick={audio.toggle} aria-label={audio.requested ? 'Pause listening' : 'Start listening'} aria-pressed={audio.requested}>{audio.requested ? 'Pause' : 'Play'}</button>
      <button type="button" onClick={() => seek(-1)} aria-label="Previous radio station">Previous</button>
      <button type="button" onClick={() => seek(1)} aria-label="Next radio station">Next</button>
      <label className="os-radio-volume">Volume<input aria-label="Radio volume" type="range" min="0" max="1" step="0.01" value={audio.volume} onChange={event => audio.setVolume(Number(event.target.value))}/></label>
      <button type="button" onClick={() => audio.setMuted(!audio.muted)} aria-label={audio.muted ? 'Unmute radio' : 'Mute radio'} aria-pressed={audio.muted}>{audio.muted ? 'Unmute' : 'Mute'}</button>
    </div>
    return <div className="os-radio">
      {osOpen && <dialog ref={osDialog} className="os-radio-dialog" aria-labelledby="os-radio-title" onCancel={event => { event.preventDefault(); event.stopPropagation(); onOsPanel?.(null) }}>
        <header className="os-radio-header"><div><span className="os-radio-kicker">BUENA ONDA</span><h2 ref={osHeading} tabIndex={-1} id="os-radio-title">{panelName}</h2></div><div className="os-radio-actions">{osPanel !== 'stations' && onOsBack && <button type="button" onClick={onOsBack}>Back to Glovebox</button>}<button type="button" autoFocus aria-label={`Close ${panelName}`} onClick={() => onOsPanel?.(null)}>Close</button></div></header>
        <div className="os-radio-content">
          {osPanel === 'stations' && <>
            <section className="os-radio-program" aria-label="Current station">
              <span className="os-radio-kicker">{audio.tuning || audio.loading ? 'TUNING IN' : audio.playing ? 'ON AIR' : 'READY WHEN YOU ARE'}</span>
              <h3>{audio.station.name}</h3><p>{details?.city}{details?.country ? ` / ${details.country}` : ''}</p>
              <div className="os-tuning-scale" aria-hidden="true"><span>HUMAN SELECTED</span><span>INDEPENDENT / LIVE</span></div>
              <p><strong>{osTitle}</strong></p>{show && <p>On air: {show}{metadata?.dj ? ` / ${metadata.dj}` : ''}</p>}
              <p>{details?.description}</p>
              <div className="os-radio-actions"><button type="button" aria-label="Save station" aria-pressed={library.favorites.includes(audio.stationId)} onClick={() => favorite(audio.stationId)}>{library.favorites.includes(audio.stationId) ? 'Station saved' : 'Save station'}</button>{verifiedSong && <button type="button" onClick={save} aria-label="Save current song" aria-pressed={library.isSaved}>{library.isSaved ? 'Song saved' : 'Save song'}</button>}{broadcast && <button type="button" onClick={save} aria-label="Bookmark current broadcast" aria-pressed={library.isSaved}>{library.isSaved ? 'Broadcast bookmarked' : 'Bookmark broadcast'}</button>}{details && <a href={details.website} target="_blank" rel="noreferrer">Visit &amp; support station</a>}</div>
              {metadata?.kind === 'show' && <p className="os-radio-caption">An on-air label is not a verified song. A broadcast bookmark keeps this station and label.</p>}
              {metadata?.source && metadata.available && <p className="os-radio-caption"><a href={metadata.source} target="_blank" rel="noreferrer">Source: station-published {metadata.kind === 'track' ? 'track' : 'on-air'} metadata</a></p>}
            </section>
            <section className="os-radio-directory" aria-label="Station directory">
              <div className="os-radio-search"><label htmlFor="os-station-search">Search stations</label><input id="os-station-search" type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, city or sound" autoComplete="off"/>{query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}</div>
              <label className="os-radio-filter">Explore by place or sound<select aria-label="Station category" value={filter} onChange={event => setFilter(event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
              <div className="os-radio-actions"><p className="os-radio-caption" role="status">{results.length} {results.length === 1 ? 'station' : 'stations'}</p><button type="button" onClick={surprise}>Surprise me</button></div>
              <ul className="os-radio-list">{results.map(station => <li key={station.id}><div><strong>{station.name}</strong><small>{STATION_DETAILS[station.id]?.city} / {STATION_DETAILS[station.id]?.genres.join(' / ')}</small></div><div className="os-radio-actions">{canPlayCruiseStation(station) ? <button type="button" onClick={() => tune(station.id)} aria-pressed={audio.stationId === station.id} aria-label={`Tune ${station.name}`}>{audio.stationId === station.id ? 'Tuned' : 'Tune'}</button> : <a href={STATION_DETAILS[station.id]?.website || station.externalUrl} target="_blank" rel="noreferrer">Station site</a>}<button type="button" aria-label={`Favorite ${station.name}`} aria-pressed={library.favorites.includes(station.id)} onClick={() => favorite(station.id)}>{library.favorites.includes(station.id) ? 'Saved' : 'Save'}</button></div></li>)}</ul>
              {!results.length && <p>No stations match. Try another name, city or sound, or choose All stations.</p>}
              <p className="os-radio-caption">An editorial directory, in your control. Some stations open on their own website while direct playback is unavailable or under review.</p>
            </section>
            <div className="os-radio-options"><button type="button" onClick={() => void share()}>Share station</button><button type="button" disabled={!osCanFocusRadio} onClick={()=>{onOsPanel?.(null);onFocusRadio()}}>Focus dashboard radio</button><label><input type="checkbox" checked={memory.enabled} onChange={memory.toggle}/> Remember my last station</label><p className="os-radio-caption">Your choice stays in this browser. Restoring a station never starts playback.</p></div>
          </>}
          {osPanel === 'presets' && <section aria-label="Saved station collection">
            <p className="os-radio-caption">Your stations, in your order.</p>
            {!favorites.length && <div className="os-radio-empty"><h3>Your dial, your choices.</h3><p>Save a station from the radio or the player below. It will be waiting here.</p><button type="button" onClick={() => onOsPanel?.('stations')}>Explore stations</button></div>}
            <ol className="os-radio-list">{favorites.map((station, index) => <li key={station.id}><strong>{station.name}</strong><div className="os-radio-actions">{canPlayCruiseStation(station) ? <button type="button" aria-label={`Tune ${station.name}`} onClick={() => tune(station.id)}>Tune</button> : <a href={STATION_DETAILS[station.id].website} target="_blank" rel="noreferrer">Station site</a>}<button type="button" disabled={index === 0} aria-label={`Move ${station.name} up`} onClick={() => library.moveFavorite(station.id, 'up')}>Up</button><button type="button" disabled={index === favorites.length - 1} aria-label={`Move ${station.name} down`} onClick={() => library.moveFavorite(station.id, 'down')}>Down</button><button type="button" aria-label={`Remove ${station.name} preset`} onClick={() => favorite(station.id)}>Remove</button></div></li>)}</ol>
          </section>}
          {osPanel === 'finds' && <section aria-label="My Finds collection">
            <div className="os-radio-actions"><p className="os-radio-caption">Yours to keep, in this browser. No account needed.</p><button type="button" onClick={() => download(library.exportFinds(), 'buena-onda-my-finds.json', 'application/json')}>Export My Finds</button></div>
            {!library.saved.length && <div className="os-radio-empty"><h3>Something good will find you.</h3><p>When a station supplies a verified song title, save it from the radio. Your discoveries will appear here.</p></div>}
            <ul className="os-radio-list os-radio-finds">{library.saved.map(item => { const links = searchLinks(item); return <li key={item.id}><span className="os-radio-kicker">{item.kind === 'show' ? 'BROADCAST BOOKMARK' : 'TRACK DISCOVERY'}</span><h3>{[item.artist, item.title].filter(Boolean).join(' - ')}</h3><p>{item.stationName} / {new Date(item.savedAt).toLocaleDateString()}</p><div className="os-radio-actions"><span>Search:</span><a href={links.bandcamp} target="_blank" rel="noreferrer">Bandcamp</a><a href={links.spotify} target="_blank" rel="noreferrer">Spotify</a><a href={links.apple} target="_blank" rel="noreferrer">Apple Music</a><a href={links.youtube} target="_blank" rel="noreferrer">YouTube</a></div><div className="os-radio-actions"><button type="button" onClick={() => void copy([item.artist, item.title, item.stationName].filter(Boolean).join(' - '))}>Copy</button><button type="button" onClick={() => void share(item)}>Share find</button><button type="button" onClick={() => download(discoveryCard(item), 'buena-onda-discovery.svg', 'image/svg+xml')}>Save card</button><button type="button" onClick={() => library.remove(item.id)}>Remove</button></div></li> })}</ul>
            <p className="os-radio-caption">Search links are searches, not confirmed track matches. Cards contain attribution and text only.</p>
          </section>}
          {audio.error && <p role="alert" className="os-radio-error">{audio.error} <button type="button" onClick={audio.start}>Retry station</button></p>}
          {library.storageError && <p role="status" className="os-radio-error">{library.storageError}</p>}{memory.error && <p role="status" className="os-radio-error">{memory.error}</p>}
          <details className="os-radio-credits"><summary>Credits &amp; sources</summary>{credits}<p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">(c) OpenStreetMap contributors / ODbL</a></p><p><a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven textures / CC0</a>. Radio plays directly from its stations; support and metadata sources appear in Radio.</p></details>
        </div>
        <footer className="os-radio-dialog-footer"><p className="os-radio-caption">{audio.station.name}{audio.loading || audio.tuning ? ' / Tuning in' : audio.playing ? ' / On air' : ' / Paused'}</p>{controls()}{note && <p role="status" className="os-radio-note">{note}</p>}</footer>
      </dialog>}
      <div className="os-radio-deck" role="region" aria-label="Persistent radio controls">
        <button ref={osOpener} className="os-radio-opener" type="button" aria-haspopup="dialog" aria-expanded={osOpen && osPanel === 'stations'} onClick={() => onOsPanel?.('stations')}>Radio</button>
        <div className="os-radio-status"><span>{audio.error ? 'Signal unavailable' : audio.loading || audio.tuning ? 'Tuning in' : audio.playing ? 'On air' : 'Ready when you are'}</span><strong>{audio.station.name}</strong>{(metadata?.kind==='track'||show)&&<small title={metadata?.kind==='track'?osTitle:show||undefined}>{metadata?.kind==='track'?osTitle:show}</small>}</div>
        {controls()}
        <button type="button" aria-label="Save station" aria-pressed={library.favorites.includes(audio.stationId)} onClick={() => favorite(audio.stationId)}>{library.favorites.includes(audio.stationId) ? 'Station saved' : 'Save station'}</button>
        {verifiedSong && <button type="button" onClick={save} aria-label="Save current song" aria-pressed={library.isSaved}>{library.isSaved ? 'Song saved' : 'Save song'}</button>}
      </div>
      {(library.storageError || note) && !osOpen && <p role="status" className="os-radio-note">{library.storageError || note}</p>}
    </div>
  }

  return <div className="hr-radio">
    {open && <section id="human-radio-panel" className="hr-panel" aria-label="Discover real radio">
      <header className="hr-panel-header"><div><span className="hr-eyebrow">BUENA ONDA / HUMAN RADIO</span><h2>Turn the dial.</h2></div><button ref={closeButton} aria-label="Close discovery panel" onClick={() => setOpen(false)}>Close ×</button></header>
      <div className="hr-tuner"><button className="hr-power" onClick={audio.toggle} aria-label={audio.requested ? 'Pause radio' : 'Play radio'} aria-pressed={audio.requested}>{audio.requested ? 'Ⅱ' : '▶'}</button><div><span className="hr-eyebrow">{audio.tuning || audio.loading ? 'TUNING IN' : audio.playing ? 'LIVE / STEREO' : 'READY WHEN YOU ARE'}</span><h3>{audio.station.name}</h3><p>{details?.city} {details?.country && ` / ${details.country}`}</p></div><button aria-label="Favorite current station" aria-pressed={library.favorites.includes(audio.stationId)} onClick={() => favorite(audio.stationId)}>{library.favorites.includes(audio.stationId) ? '★' : '☆'}</button></div>
      <div className="hr-dial" aria-hidden="true"><span>HUMAN</span><i/><span>SELECTED</span><i/><span>INDEPENDENT</span><i/><span>LIVE</span></div>
      <div className="hr-program" aria-live="polite"><strong>{title}</strong>{show && <p>On air: {show}{metadata?.dj ? ` / ${metadata.dj}` : ''}</p>}<p>{details?.description}</p><div className="hr-actions"><button disabled={!library.canSave} aria-pressed={library.isSaved} onClick={save}>{library.isSaved ? 'Saved to My Finds' : metadata?.kind === 'show' ? 'Bookmark broadcast' : 'Save song'}</button>{details && <a href={details.website} target="_blank" rel="noreferrer">Visit & support station ↗</a>}</div>{metadata?.source && metadata.available && <a className="hr-source" href={metadata.source} target="_blank" rel="noreferrer">Station-published {metadata.kind === 'show' ? 'show' : 'track'} metadata ↗</a>}</div>
      <div className="hr-seek"><button onClick={() => seek(-1)}>← Previous</button><button onClick={surprise}>Surprise me</button><button onClick={() => seek(1)}>Next →</button></div>
      {audio.error && <p className="hr-error" role="alert">{audio.error} <button onClick={audio.start}>Retry station</button> Choose another station whenever you like.</p>}
      <nav className="hr-tabs" aria-label="Radio collections">{(['stations', 'presets', 'finds'] as const).map(name => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name === 'stations' ? 'Stations' : name === 'presets' ? `My presets (${library.favorites.length})` : `My Finds (${library.saved.length})`}</button>)}</nav>
      {tab === 'stations' && <div className="hr-directory">{experienceMode && <div className="hr-search"><label htmlFor="hr-station-search">Search stations</label><div><input id="hr-station-search" type="search" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, city or sound" autoComplete="off"/>{query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}</div></div>}<label className="hr-filter">Explore by place or sound<select aria-label="Station category" value={filter} onChange={event => setFilter(event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>{experienceMode && <p className="hr-result-count" role="status">{results.length} {results.length === 1 ? 'station' : 'stations'}</p>}<p className="hr-caption">An editorial directory. Your choices set the course.</p><ul>{results.map(station => <li key={station.id}><div><strong>{station.name}</strong><small>{STATION_DETAILS[station.id]?.city} / {STATION_DETAILS[station.id]?.genres.join(' · ')}</small></div><div className="hr-station-actions">{canPlayCruiseStation(station) ? <button onClick={() => tune(station.id)} aria-pressed={audio.stationId === station.id} aria-label={`Tune ${station.name}`}>{audio.stationId === station.id ? 'Tuned' : 'Tune'}</button> : <a href={STATION_DETAILS[station.id]?.website || station.externalUrl} target="_blank" rel="noreferrer">Station site ↗</a>}<button aria-label={`Favorite ${station.name}`} aria-pressed={library.favorites.includes(station.id)} onClick={() => favorite(station.id)}>{library.favorites.includes(station.id) ? '★' : '☆'}</button></div></li>)}</ul>{experienceMode && !results.length && <p className="hr-empty">No stations match. Try another name, city or sound, or choose All stations.</p>}<p className="hr-caption">Some stations open on their own website while direct playback is unavailable or under review.</p></div>}
      {tab === 'presets' && <div className="hr-directory"><p className="hr-caption">Your stations, in your order. Add a star in the directory.</p><ol>{favorites.map((station, index) => <li key={station.id}><strong>{station.name}</strong><div className="hr-actions">{canPlayCruiseStation(station) ? <button onClick={() => tune(station.id)}>Tune</button> : <a href={STATION_DETAILS[station.id].website} target="_blank" rel="noreferrer">Station site ↗</a>}<button disabled={index === 0} aria-label={`Move ${station.name} up`} onClick={() => library.moveFavorite(station.id, 'up')}>↑</button><button disabled={index === favorites.length - 1} aria-label={`Move ${station.name} down`} onClick={() => library.moveFavorite(station.id, 'down')}>↓</button><button aria-label={`Remove ${station.name} preset`} onClick={() => favorite(station.id)}>×</button></div></li>)}</ol></div>}
      {tab === 'finds' && <div className="hr-finds"><div className="hr-actions"><p className="hr-caption">Yours to keep, in this browser. No account needed.</p><button onClick={() => download(library.exportFinds(), 'buena-onda-my-finds.json', 'application/json')}>Export My Finds</button></div>{!library.saved.length && <p>When a station supplies a verified song title, save it here. Shows can be bookmarked separately.</p>}<ul>{library.saved.map(item => { const links = searchLinks(item); return <li key={item.id}><span className="hr-eyebrow">{item.kind === 'show' ? 'BROADCAST BOOKMARK' : 'TRACK DISCOVERY'}</span><h3>{[item.artist, item.title].filter(Boolean).join(' — ')}</h3><p>{item.stationName} / {new Date(item.savedAt).toLocaleDateString()}</p><div className="hr-searches"><span>Search:</span><a href={links.bandcamp} target="_blank" rel="noreferrer">Bandcamp ↗</a><a href={links.spotify} target="_blank" rel="noreferrer">Spotify ↗</a><a href={links.apple} target="_blank" rel="noreferrer">Apple Music ↗</a><a href={links.youtube} target="_blank" rel="noreferrer">YouTube ↗</a></div><div className="hr-actions"><button onClick={() => void copy([item.artist, item.title, item.stationName].filter(Boolean).join(' — '))}>Copy</button><button onClick={() => void share(item)}>Share find</button><button onClick={() => download(discoveryCard(item), 'buena-onda-discovery.svg', 'image/svg+xml')}>Save card</button><button onClick={() => library.remove(item.id)}>Remove</button></div></li> })}</ul><p className="hr-caption">Search links are searches, not confirmed track matches. Cards contain attribution and text only.</p></div>}
      <footer className="hr-options"><button onClick={onListeningOnly} aria-pressed={listeningOnly}>{listeningOnly ? 'Return to scenery' : 'Listen without 3D'}</button><button onClick={()=>{setOpen(false);onFocusRadio()}}>Focus dashboard radio</button><button onClick={() => void share()}>Share station</button>{experienceMode && <label className="hr-remember"><input type="checkbox" checked={memory.enabled} onChange={memory.toggle}/>Remember my last station</label>}{experienceMode && <p className="hr-caption">Your choice stays on this browser. Restoring a station never starts playback.</p>}<label><input type="checkbox" checked={presence} onChange={onPresence}/>Join anonymous cruiser presence</label><p>No music profiles. No personalized stations. Station audio is never interrupted by Cruise ads.</p></footer>
      <details className="hr-credits"><summary>Credits &amp; sources</summary>{credits}<p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors / ODbL</a></p><p><a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven textures / CC0</a>. Radio plays directly from its stations; support and metadata sources appear above.</p></details>
      {library.storageError && <p role="status" className="hr-error">{library.storageError}</p>}
      {experienceMode && memory.error && <p role="status" className="hr-error">{memory.error}</p>}
    </section>}
    <div className="hr-deck" role="region" aria-label="Persistent radio controls">
      <button className="hr-deck-power" onClick={audio.toggle} aria-label={audio.requested ? 'Pause listening' : 'Start listening'} aria-pressed={audio.requested}>{audio.requested ? 'Ⅱ' : '▶'}</button>
      <button className="hr-now" aria-expanded={open} aria-controls="human-radio-panel" onClick={() => setOpen(value => !value)}><span className="hr-eyebrow">{audio.error ? 'SIGNAL UNAVAILABLE' : audio.loading || audio.tuning ? 'TUNING IN' : audio.playing ? 'ON AIR' : 'TURN THE DIAL'} / {audio.station.name}</span><strong>{metadata?.kind === 'track' ? title : show || 'No Algorithms. Just Frequencies.'}</strong></button>
      {experienceMode && <button className="hr-next-station" type="button" aria-label="Next radio station" onClick={() => seek(1)}>Next station</button>}
      <button className="hr-quick-save" disabled={!library.canSave} onClick={save} aria-label={metadata?.kind === 'show' ? 'Bookmark current broadcast' : 'Save current song'} aria-pressed={library.isSaved}>{library.isSaved ? 'Saved ✓' : metadata?.kind === 'show' ? 'Bookmark' : 'Save song'}</button>
      <label className="hr-volume">Volume<input aria-label="Radio volume" type="range" min="0" max="1" step="0.01" value={audio.volume} onChange={event => audio.setVolume(Number(event.target.value))}/></label><button className="hr-mute" onClick={() => audio.setMuted(!audio.muted)} aria-pressed={audio.muted}>{audio.muted ? 'Unmute' : 'Mute'}</button>
      <button className="hr-open" aria-expanded={open} aria-controls="human-radio-panel" onClick={() => setOpen(value => !value)}>{open ? 'Close' : 'Tune & discover'}</button>
    </div>
    {note && <p role="status" className="hr-note">{note}</p>}
  </div>
}
