import assert from 'node:assert/strict'
import test from 'node:test'
import { HUMAN_RADIO_STATIONS, STATION_DETAILS } from '../lib/human-radio/stations'
import { MIAMI_CRUISE_STATIONS, canPlayCruiseStation } from '../lib/real-miami/stations'
import { readFileSync } from 'node:fs'
import { veridianPlaylistMetadata, isFreshHumanRadioTrack } from '../lib/human-radio/metadata'

test('human radio reuses the established catalog without changing successful builds', () => {
  assert.deepEqual(HUMAN_RADIO_STATIONS.slice(0, MIAMI_CRUISE_STATIONS.length).map(s => s.id), MIAMI_CRUISE_STATIONS.map(s => s.id))
  assert.equal(MIAMI_CRUISE_STATIONS.find(s => s.id === 'kiosk-radio')?.enabled, false)
  assert.equal(canPlayCruiseStation(HUMAN_RADIO_STATIONS.find(s => s.id === 'kiosk-radio')!), false)
  for (const original of MIAMI_CRUISE_STATIONS.filter(s => s.id !== 'kiosk-radio')) {
    assert.deepEqual(HUMAN_RADIO_STATIONS.find(s => s.id === original.id), original)
  }
})

test('unverified candidates cannot become playable from a public website URL', () => {
  const additions = HUMAN_RADIO_STATIONS.slice(MIAMI_CRUISE_STATIONS.length)
  assert.equal(additions.length, 11)
  for (const station of additions.filter(station => station.id !== 'veridian-club')) {
    assert.equal(station.source, null)
    assert.equal(station.rightsStatus, 'external-only')
    assert.equal(canPlayCruiseStation(station), false)
    assert.equal(new URL(station.externalUrl!).protocol, 'https:')
  }
})

test('Veridian Club uses verified official-player tracks in Cruise', () => {
  const station = HUMAN_RADIO_STATIONS.find(item => item.id === 'veridian-club')!
  assert.equal(canPlayCruiseStation(station), true)
  assert.equal(station.playback, 'playlist')
  const tracks = JSON.parse(readFileSync('public/cruise/radio/veridian-tracks.json', 'utf8')) as {src:string;title:string;artist:string}[]
  assert.equal(tracks.length, 85)
  assert.ok(tracks.every(track => track.src.startsWith('https://veridian.club/player/') && track.title && track.artist))
  assert.equal(new Set(tracks.map(track => track.src)).size, tracks.length)
  const metadata = veridianPlaylistMetadata(tracks[0])
  assert.ok(isFreshHumanRadioTrack(metadata))
  assert.equal(veridianPlaylistMetadata({...tracks[0],src:'https://example.com/song.mp3'}), null)
})

test('each unique station has editorial attribution and explicit permission limitations', () => {
  assert.equal(new Set(HUMAN_RADIO_STATIONS.map(s => s.id)).size, HUMAN_RADIO_STATIONS.length)
  for (const station of HUMAN_RADIO_STATIONS) {
    const details = STATION_DETAILS[station.id]
    assert.ok(details?.city && details.country && details.description && details.website && details.permissionNote)
    assert.ok(details.genres.length > 0)
    if (canPlayCruiseStation(station) && station.playback !== 'playlist') assert.equal(new URL(station.source!).protocol, 'https:')
  }
})
