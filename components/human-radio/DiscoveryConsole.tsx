'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import type { HumanRadioMetadata } from '@/lib/human-radio/metadata'
import { HUMAN_RADIO_STATIONS, STATION_DETAILS } from '@/lib/human-radio/stations'
import { canPlayCruiseStation } from '@/lib/real-miami/stations'
import { searchLinks, type Discovery } from '@/lib/human-radio/finds'
import { discoveryCard, randomStation, stationShareUrl } from '@/lib/human-radio/explore'
import { useDiscoveries } from './useDiscoveries'
import './human-radio.css'

type Audio = ReturnType<typeof useCruiseAudio>
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DiscoveryConsole({ audio, metadata, listeningOnly, onListeningOnly, presence, onPresence, onFocusRadio, credits }: {
  audio: Audio; metadata: HumanRadioMetadata | null; listeningOnly: boolean; onListeningOnly: () => void
  presence: boolean; onPresence: () => void; onFocusRadio: () => void; credits?: ReactNode
}) {
  const library = useDiscoveries({ metadata, stationName: audio.station.name, playing: audio.playing, loading: audio.loading })
  const [open, setOpen] = useState(false), [tab, setTab] = useState<'stations' | 'finds' | 'presets'>('stations')
  const [filter, setFilter] = useState('All stations'), [note, setNote] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)
  // The owned playlist has an observed upstream outage. Keep manual choice,
  // but seek/random tuning uses only the direct streams checked in this audit.
  const eligible = useMemo(() => HUMAN_RADIO_STATIONS.filter(station => canPlayCruiseStation(station) && station.playback !== 'playlist'), [])
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
  const tune = (id: string) => { if (audio.selectStation(id)) { audio.start(); setNote('Tuning in…') } }
  const surprise = () => { const id = randomStation(eligible.map(station => station.id), audio.stationId); if (id) tune(id) }
  const seek = (direction: number) => { const index = eligible.findIndex(station => station.id === audio.stationId); tune(eligible[(index + direction + eligible.length) % eligible.length].id) }
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
    const url = stationShareUrl(location.origin, stationId)
    try { if (navigator.share) await navigator.share({ title: 'Buena Onda Cruise', text, url }); else await copy(`${text}\n${url}`) }
    catch (error) { if ((error as Error).name !== 'AbortError') setNote(url) }
  }
  const favorites = library.favorites.map(id => HUMAN_RADIO_STATIONS.find(station => station.id === id)).filter((station): station is typeof HUMAN_RADIO_STATIONS[number] => !!station)

  return <div className="hr-radio">
    {open && <section id="human-radio-panel" className="hr-panel" aria-label="Discover real radio">
      <header className="hr-panel-header"><div><span className="hr-eyebrow">BUENA ONDA / HUMAN RADIO</span><h2>Turn the dial.</h2></div><button ref={closeButton} aria-label="Close discovery panel" onClick={() => setOpen(false)}>Close ×</button></header>
      <div className="hr-tuner"><button className="hr-power" onClick={audio.toggle} aria-label={audio.requested ? 'Pause radio' : 'Play radio'} aria-pressed={audio.requested}>{audio.requested ? 'Ⅱ' : '▶'}</button><div><span className="hr-eyebrow">{audio.tuning || audio.loading ? 'TUNING IN' : audio.playing ? 'LIVE / STEREO' : 'READY WHEN YOU ARE'}</span><h3>{audio.station.name}</h3><p>{details?.city} {details?.country && ` / ${details.country}`}</p></div><button aria-label="Favorite current station" aria-pressed={library.favorites.includes(audio.stationId)} onClick={() => library.toggleFavorite(audio.stationId)}>{library.favorites.includes(audio.stationId) ? '★' : '☆'}</button></div>
      <div className="hr-dial" aria-hidden="true"><span>HUMAN</span><i/><span>SELECTED</span><i/><span>INDEPENDENT</span><i/><span>LIVE</span></div>
      <div className="hr-program" aria-live="polite"><strong>{title}</strong>{show && <p>On air: {show}{metadata?.dj ? ` / ${metadata.dj}` : ''}</p>}<p>{details?.description}</p><div className="hr-actions"><button disabled={!library.canSave} aria-pressed={library.isSaved} onClick={library.toggleSave}>{library.isSaved ? 'Saved to My Finds' : metadata?.kind === 'show' ? 'Bookmark broadcast' : 'Save song'}</button>{details && <a href={details.website} target="_blank" rel="noreferrer">Visit & support station ↗</a>}</div>{metadata?.source && metadata.available && <a className="hr-source" href={metadata.source} target="_blank" rel="noreferrer">Station-published {metadata.kind === 'show' ? 'show' : 'track'} metadata ↗</a>}</div>
      <div className="hr-seek"><button onClick={() => seek(-1)}>← Previous</button><button onClick={surprise}>Surprise me</button><button onClick={() => seek(1)}>Next →</button></div>
      {audio.error && <p className="hr-error" role="alert">{audio.error} <button onClick={audio.start}>Retry station</button> Choose another station whenever you like.</p>}
      <nav className="hr-tabs" aria-label="Radio collections">{(['stations', 'presets', 'finds'] as const).map(name => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name === 'stations' ? 'Stations' : name === 'presets' ? `My presets (${library.favorites.length})` : `My Finds (${library.saved.length})`}</button>)}</nav>
      {tab === 'stations' && <div className="hr-directory"><label className="hr-filter">Explore by place or sound<select aria-label="Station category" value={filter} onChange={event => setFilter(event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><p className="hr-caption">An editorial directory. Your choices set the course.</p><ul>{HUMAN_RADIO_STATIONS.filter(station => { const detail = STATION_DETAILS[station.id]; return filter === 'All stations' || detail?.city === filter || detail?.genres.includes(filter) }).map(station => <li key={station.id}><div><strong>{station.name}</strong><small>{STATION_DETAILS[station.id]?.city} / {STATION_DETAILS[station.id]?.genres.join(' · ')}</small></div><div className="hr-station-actions">{canPlayCruiseStation(station) ? <button onClick={() => tune(station.id)} aria-pressed={audio.stationId === station.id} aria-label={`Tune ${station.name}`}>{audio.stationId === station.id ? 'Tuned' : 'Tune'}</button> : <a href={STATION_DETAILS[station.id]?.website || station.externalUrl} target="_blank" rel="noreferrer">Station site ↗</a>}<button aria-label={`Favorite ${station.name}`} aria-pressed={library.favorites.includes(station.id)} onClick={() => library.toggleFavorite(station.id)}>{library.favorites.includes(station.id) ? '★' : '☆'}</button></div></li>)}</ul><p className="hr-caption">Some stations open on their own website while direct playback is unavailable or under review.</p></div>}
      {tab === 'presets' && <div className="hr-directory"><p className="hr-caption">Your stations, in your order. Add a star in the directory.</p><ol>{favorites.map((station, index) => <li key={station.id}><strong>{station.name}</strong><div className="hr-actions">{canPlayCruiseStation(station) ? <button onClick={() => tune(station.id)}>Tune</button> : <a href={STATION_DETAILS[station.id].website} target="_blank" rel="noreferrer">Station site ↗</a>}<button disabled={index === 0} aria-label={`Move ${station.name} up`} onClick={() => library.moveFavorite(station.id, 'up')}>↑</button><button disabled={index === favorites.length - 1} aria-label={`Move ${station.name} down`} onClick={() => library.moveFavorite(station.id, 'down')}>↓</button><button aria-label={`Remove ${station.name} preset`} onClick={() => library.toggleFavorite(station.id)}>×</button></div></li>)}</ol></div>}
      {tab === 'finds' && <div className="hr-finds"><div className="hr-actions"><p className="hr-caption">Yours to keep, in this browser. No account needed.</p><button onClick={() => download(library.exportFinds(), 'buena-onda-my-finds.json', 'application/json')}>Export My Finds</button></div>{!library.saved.length && <p>When a station supplies a verified song title, save it here. Shows can be bookmarked separately.</p>}<ul>{library.saved.map(item => { const links = searchLinks(item); return <li key={item.id}><span className="hr-eyebrow">{item.kind === 'show' ? 'BROADCAST BOOKMARK' : 'TRACK DISCOVERY'}</span><h3>{[item.artist, item.title].filter(Boolean).join(' — ')}</h3><p>{item.stationName} / {new Date(item.savedAt).toLocaleDateString()}</p><div className="hr-searches"><span>Search:</span><a href={links.bandcamp} target="_blank" rel="noreferrer">Bandcamp ↗</a><a href={links.spotify} target="_blank" rel="noreferrer">Spotify ↗</a><a href={links.apple} target="_blank" rel="noreferrer">Apple Music ↗</a><a href={links.youtube} target="_blank" rel="noreferrer">YouTube ↗</a></div><div className="hr-actions"><button onClick={() => void copy([item.artist, item.title, item.stationName].filter(Boolean).join(' — '))}>Copy</button><button onClick={() => void share(item)}>Share find</button><button onClick={() => download(discoveryCard(item), 'buena-onda-discovery.svg', 'image/svg+xml')}>Save card</button><button onClick={() => library.remove(item.id)}>Remove</button></div></li> })}</ul><p className="hr-caption">Search links are searches, not confirmed track matches. Cards contain attribution and text only.</p></div>}
      <footer className="hr-options"><button onClick={onListeningOnly} aria-pressed={listeningOnly}>{listeningOnly ? 'Return to scenery' : 'Listen without 3D'}</button><button onClick={()=>{setOpen(false);onFocusRadio()}}>Focus dashboard radio</button><button onClick={() => void share()}>Share station</button><label><input type="checkbox" checked={presence} onChange={onPresence}/>Join anonymous cruiser presence</label><p>No music profiles. No personalized stations. Station audio is never interrupted by Cruise ads.</p></footer>
      <details className="hr-credits"><summary>Credits &amp; sources</summary>{credits}<p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors / ODbL</a></p><p><a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven textures / CC0</a>. Radio plays directly from its stations; support and metadata sources appear above.</p></details>
      {library.storageError && <p role="status" className="hr-error">{library.storageError}</p>}
    </section>}
    <div className="hr-deck" role="region" aria-label="Persistent radio controls">
      <button className="hr-deck-power" onClick={audio.toggle} aria-label={audio.requested ? 'Pause listening' : 'Start listening'} aria-pressed={audio.requested}>{audio.requested ? 'Ⅱ' : '▶'}</button>
      <button className="hr-now" aria-expanded={open} aria-controls="human-radio-panel" onClick={() => setOpen(value => !value)}><span className="hr-eyebrow">{audio.error ? 'SIGNAL UNAVAILABLE' : audio.loading || audio.tuning ? 'TUNING IN' : audio.playing ? 'ON AIR' : 'TURN THE DIAL'} / {audio.station.name}</span><strong>{metadata?.kind === 'track' ? title : show || 'No Algorithms. Just Frequencies.'}</strong></button>
      <button className="hr-quick-save" disabled={!library.canSave} onClick={library.toggleSave} aria-label={metadata?.kind === 'show' ? 'Bookmark current broadcast' : 'Save current song'} aria-pressed={library.isSaved}>{library.isSaved ? 'Saved ✓' : metadata?.kind === 'show' ? 'Bookmark' : 'Save song'}</button>
      <label className="hr-volume">Volume<input aria-label="Radio volume" type="range" min="0" max="1" step="0.01" value={audio.volume} onChange={event => audio.setVolume(Number(event.target.value))}/></label><button className="hr-mute" onClick={() => audio.setMuted(!audio.muted)} aria-pressed={audio.muted}>{audio.muted ? 'Unmute' : 'Mute'}</button>
      <button className="hr-open" aria-expanded={open} aria-controls="human-radio-panel" onClick={() => setOpen(value => !value)}>{open ? 'Close' : 'Tune & discover'}</button>
    </div>
    {note && <p role="status" className="hr-note">{note}</p>}
  </div>
}
