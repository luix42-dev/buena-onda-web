'use client'

import { useEffect, useState } from 'react'
import { MIAMI_CRUISE_STATIONS } from '@/lib/cruise/stations'
import { addSavedSong, currentSong, readSavedSongs, SONG_LIBRARY_KEY, writeSavedSongs,
  type SavedSong, type SongLibraryAudio } from './saved-songs'

export default function SongLibrary({ audio }: { audio: SongLibraryAudio }) {
  const [songs, setSongs] = useState<SavedSong[]>([])
  const [ready, setReady] = useState(false), [open, setOpen] = useState(false), [message, setMessage] = useState('')
  const song = currentSong(audio)
  const saved = !!song && songs.some(entry => entry.label === song.label)
  const official = MIAMI_CRUISE_STATIONS.find(station => station.id === audio.station.id)?.externalUrl

  useEffect(() => {
    const load = () => {
      try { setSongs(readSavedSongs(localStorage.getItem(SONG_LIBRARY_KEY))); setMessage('') }
      catch { setMessage('Saved songs could not be read on this browser.') }
      setReady(true)
    }
    const changed = (event: StorageEvent) => { if (event.key === SONG_LIBRARY_KEY || event.key === null) load() }
    load()
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])

  const save = () => {
    const current = currentSong(audio)
    if (!current || !ready) return
    try {
      // Re-read at the gesture so another tab's recent saves are retained.
      const next = addSavedSong(readSavedSongs(localStorage.getItem(SONG_LIBRARY_KEY)), current)
      localStorage.setItem(SONG_LIBRARY_KEY, writeSavedSongs(next))
      setSongs(next); setMessage('Song saved on this browser.')
    } catch (error) {
      setMessage(error instanceof Error && error.message.startsWith('Your library is full')
        ? error.message : 'This browser could not save the song.')
    }
  }
  const remove = (label: string) => {
    try {
      const next = readSavedSongs(localStorage.getItem(SONG_LIBRARY_KEY)).filter(entry => entry.label !== label)
      localStorage.setItem(SONG_LIBRARY_KEY, writeSavedSongs(next))
      setSongs(next); setMessage('Song removed.')
    } catch { setMessage('This browser could not remove the song.') }
  }

  return <section className="world-song-library" aria-label="Song library">
    <div className="world-song-current">
      <span>{song ? song.label : 'Track information unavailable'}</span>
      <button type="button" disabled={!ready || !song || saved} onClick={save}>{saved ? 'Saved' : 'Save song'}</button>
      <button type="button" aria-expanded={open} aria-controls="world-saved-songs" onClick={() => setOpen(value => !value)}>Saved songs ({songs.length})</button>
      {official && <a href={official} target="_blank" rel="noopener noreferrer">Listen on {audio.station.name}<span className="place-sr-only"> (opens a new tab)</span></a>}
    </div>
    {message && <p role="status">{message}</p>}
    {open && <div id="world-saved-songs">
      <p>Saved on this browser.</p>
      {songs.length ? <ul>{songs.map(entry => <li key={entry.label}>
        <span>{entry.label}<small>{entry.stationName}</small></span>
        <button type="button" aria-label={`Remove ${entry.label} from saved songs`} onClick={() => remove(entry.label)}>Remove</button>
      </li>)}</ul> : <p>No saved songs yet. Save a Buena Onda song while its track information is available.</p>}
    </div>}
  </section>
}
