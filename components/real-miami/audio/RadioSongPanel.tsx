'use client'
import type { useRadioLibrary } from './useRadioLibrary'

export default function RadioSongPanel({ library, tune }: { library: ReturnType<typeof useRadioLibrary>; tune: (id: string) => boolean }) {
  const info = library.nowPlaying
  return <div className="jn-song-library">
    <div className="jn-song-save"><span>{info.available ? info.kind === 'show' ? 'ON AIR / SHOW' : 'NOW PLAYING / TRACK' : 'Station does not provide track information'}</span><button aria-label={library.isSaved ? 'Remove current bookmark' : info.kind === 'show' ? 'Save current show' : 'Save current song'} disabled={!library.canSave} aria-pressed={library.isSaved} onClick={library.toggleSave}>{library.isSaved ? 'Saved' : info.kind === 'show' ? 'Save show' : 'Save song'}</button></div>
    <details><summary>Saved songs &amp; shows ({library.saved.length})</summary><p className="jn-library-note">Bookmarks in this browser. Tuning returns to the live station.</p>
      {library.saved.length === 0 && <p>Save a song when its title appears on the radio.</p>}
      <ul>{library.saved.map(item => <li key={item.id}><div><strong>{[item.artist, item.title].filter(Boolean).join(' - ')}</strong><small>{item.stationName} / {item.kind === 'show' ? 'Show' : 'Song'} / {new Date(item.savedAt).toLocaleDateString()}</small></div><div className="jn-saved-actions"><button onClick={() => tune(item.stationId)} aria-label={`Tune to ${item.stationName} for ${item.title}`}>Tune station</button><a href={`https://open.spotify.com/search/${encodeURIComponent([item.artist, item.title].filter(Boolean).join(' '))}`} target="_blank" rel="noreferrer">Find {item.kind === 'show' ? 'show' : 'song'}</a><button onClick={() => library.remove(item.id)} aria-label={`Remove saved ${item.title}`}>Remove</button></div></li>)}</ul>
    </details>
    {library.storageError && <p role="status">{library.storageError}</p>}
  </div>
}
