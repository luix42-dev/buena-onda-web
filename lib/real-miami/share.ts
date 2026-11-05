import landmarkRegistry from '../../public/real-miami/miami/landmarks.json'

/** Shareable drive links: /cruise?station=<id>&at=<landmark kind | route metres>&time=sunset|night&cam=driver|chase|director
 * Stable and account-free. Unknown values are ignored, never guessed. */
export type SharedView = 'driver' | 'chase' | 'director' | 'low' | 'hood' | 'wheel' | 'wheelClose'
const SHARED_VIEWS: readonly string[] = ['driver', 'chase', 'director', 'low', 'hood', 'wheel', 'wheelClose']
export type SharedDrive = { station?: string; startMeters?: number; at?: string; time?: 'sunset' | 'night'; cam?: SharedView }

const LEAD_IN = 60 // start a little before a shared landmark so it arrives on screen

export function readShared(search: string): SharedDrive {
  const q = new URLSearchParams(search), out: SharedDrive = {}
  const station = q.get('station'); if (station && /^[a-z0-9-]{1,48}$/.test(station)) out.station = station
  const time = q.get('time'); if (time === 'sunset' || time === 'night') out.time = time
  const cam = q.get('cam'); if (cam && SHARED_VIEWS.includes(cam)) out.cam = cam as SharedView
  const at = q.get('at')
  if (at) {
    const landmark = landmarkRegistry.landmarks.find(l => l.kind === at)
    const length = landmarkRegistry.routeLength
    if (landmark?.encounter) { out.at = at; out.startMeters = ((landmark.encounter.routeMeters - LEAD_IN) % length + length) % length }
    else if (/^\d{1,5}(\.\d+)?$/.test(at)) { const m = Number(at); if (m >= 0 && m < length) { out.at = at; out.startMeters = m } }
  }
  return out
}

export function shareUrl(origin: string, drive: { station: string; at: string; time: 'sunset' | 'night'; cam: SharedView }) {
  const q = new URLSearchParams({ station: drive.station, at: drive.at, time: drive.time, cam: drive.cam })
  return `${origin}/cruise?${q.toString()}`
}
