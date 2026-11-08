export const MIRROR_NAMESPACE = 'urn:x-cast:com.buenaonda.cruise.mirror.v1'

export type MirrorState = 'connecting' | 'playing' | 'ended' | 'error'
export type MirrorStats = {
  framesDecoded?: number
  framesPerSecond?: number
  frameWidth?: number
  frameHeight?: number
  bytesReceived?: number
  packetsLost?: number
  currentTime?: number
  videoWidth?: number
  videoHeight?: number
}
type Envelope = { version: 1; id: string }
export type MirrorMessage = Envelope & (
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit | null }
  | { type: 'stop' }
  | { type: 'status' }
  | { type: 'state'; state: MirrorState; error?: string; stats?: MirrorStats }
)

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const statKeys: readonly (keyof MirrorStats)[] = ['framesDecoded', 'framesPerSecond', 'frameWidth', 'frameHeight', 'bytesReceived', 'packetsLost', 'currentTime', 'videoWidth', 'videoHeight']

/** Both CAF peers validate bounded data before passing it to browser RTC APIs. */
export function parseMirrorMessage(input: unknown): MirrorMessage | null {
  if (typeof input === 'string') {
    if (input.length > 120000) return null
    try { input = JSON.parse(input) } catch { return null }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  if (value.version !== 1 || typeof value.id !== 'string' || value.id.length > 80 || !UUID.test(value.id)) return null
  const envelope: Envelope = { version: 1, id: value.id }
  if (value.type === 'offer' || value.type === 'answer') {
    if (typeof value.sdp !== 'string' || !value.sdp.length || value.sdp.length > 100000) return null
    return { ...envelope, type: value.type, sdp: value.sdp }
  }
  if (value.type === 'ice') {
    if (value.candidate === null) return { ...envelope, type: 'ice', candidate: null }
    if (!value.candidate || typeof value.candidate !== 'object' || Array.isArray(value.candidate)) return null
    const ice = value.candidate as Record<string, unknown>
    if (typeof ice.candidate !== 'string' || ice.candidate.length > 4096) return null
    const candidate: RTCIceCandidateInit = { candidate: ice.candidate }
    for (const key of ['sdpMid', 'usernameFragment'] as const) {
      if (ice[key] !== undefined) {
        if (ice[key] !== null && (typeof ice[key] !== 'string' || ice[key].length > 256)) return null
        candidate[key] = ice[key] as string | null
      }
    }
    if (ice.sdpMLineIndex !== undefined) {
      if (ice.sdpMLineIndex !== null && (!Number.isSafeInteger(ice.sdpMLineIndex) || (ice.sdpMLineIndex as number) < 0 || (ice.sdpMLineIndex as number) > 65535)) return null
      candidate.sdpMLineIndex = ice.sdpMLineIndex as number | null
    }
    return { ...envelope, type: 'ice', candidate }
  }
  if (value.type === 'stop' || value.type === 'status') return { ...envelope, type: value.type }
  if (value.type === 'state') {
    if (!['connecting', 'playing', 'ended', 'error'].includes(value.state as string)) return null
    if (value.error !== undefined && (typeof value.error !== 'string' || value.error.length > 1000)) return null
    let stats: MirrorStats | undefined
    if (value.stats !== undefined) {
      if (!value.stats || typeof value.stats !== 'object' || Array.isArray(value.stats)) return null
      stats = {}
      const raw = value.stats as Record<string, unknown>
      for (const key of statKeys) {
        if (raw[key] === undefined) continue
        if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) return null
        stats[key] = raw[key] as number
      }
    }
    return { ...envelope, type: 'state', state: value.state as MirrorState,
      ...(typeof value.error === 'string' ? { error: value.error } : {}), ...(stats ? { stats } : {}) }
  }
  return null
}
