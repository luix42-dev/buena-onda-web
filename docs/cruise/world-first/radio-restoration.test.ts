import test from 'node:test'
import assert from 'node:assert/strict'
import { CRUISE_STATIONS } from '../../../lib/cruise/stations'
import { addSavedSong, currentSong, readSavedSongs, writeSavedSongs, type SongLibraryAudio } from '../../../components/cruise/world-test/saved-songs'

const audio: SongLibraryAudio = { station: CRUISE_STATIONS[0], trackTitle: 'Artist - Title - Mix', available: true, loading: false, error: null }
const timestamp = '2026-10-12T03:00:00.000Z'

test('only current owned playlist metadata is saveable; live station labels and loading are refused', () => {
  assert.deepEqual(currentSong(audio, timestamp), { label: 'Artist - Title - Mix', stationId: 'buena-onda-radio',
    stationName: 'Buena Onda Radio', metadataSource: '/api/radio/tracks', savedAt: timestamp })
  for (const station of CRUISE_STATIONS.slice(1)) assert.equal(currentSong({ ...audio, station }), null)
  for (const change of [{ loading: true }, { available: false }, { error: 'Radio unavailable' }, { trackTitle: '' }, { trackTitle: audio.station.name }])
    assert.equal(currentSong({ ...audio, ...change }), null)
})

test('local library round trips exact labels, avoids duplicates and omits unsupported data', () => {
  const song = currentSong(audio, timestamp)!
  const saved = addSavedSong([], song)
  assert.deepEqual(readSavedSongs(writeSavedSongs(saved)), saved)
  assert.deepEqual(addSavedSong(saved, { ...song, savedAt: '2026-10-12T04:00:00.000Z' }), saved)
  const corruptEntry = { ...song, stationId: 'nts-radio' }
  const extraEntry = { ...song, src: 'private-url', artist: 'invented', songId: 'invented' }
  const reloaded = readSavedSongs(JSON.stringify({ version: 1, songs: [corruptEntry, extraEntry, song] }))
  assert.deepEqual(reloaded, saved)
  assert.equal('src' in reloaded[0], false)
  assert.deepEqual(readSavedSongs(writeSavedSongs(saved.filter(entry => entry.label !== song.label))), [])
  assert.throws(() => readSavedSongs('{broken'))
  assert.throws(() => readSavedSongs('{"version":2,"songs":[]}'))
})
