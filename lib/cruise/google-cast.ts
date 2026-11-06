'use client'

import { resolveCastStations } from './cast-stations'
import type { CastPlaylistPosition, CastPlaylistTrack } from './cast-playlist'
export { receiverCastStations } from './cast-stations'

export const CAST_NAMESPACE = 'urn:x-cast:com.buenaonda.cruise.v1'
export type CastCommand = {
  version: 1
  sequence: number
  type: 'sync' | 'play' | 'pause' | 'station' | 'volume' | 'status'
  requestId?: string
  station?: string
  playing?: boolean
  volume?: number
  muted?: boolean
  scene?: Record<string, string>
  playlist?: CastPlaylistPosition
}
export type CastStatus = {
  version: 1
  type: 'state'
  station: string
  playing: boolean
  volume: number
  muted: boolean
  ready: boolean
  requested?: boolean
  loading?: boolean
  ackRequestId?: string
  errorRequestId?: string
  appliedSequence?: number
  scene?: Record<string, string>
  playlist?: CastPlaylistPosition
  track?: CastPlaylistTrack | null
  media?: { currentTime: number; readyState: number; paused: boolean }
  error?: string
}
export type CastConnectionState = 'disconnected' | 'connecting' | 'connected' | 'disconnecting'
type Command = Omit<CastCommand, 'version' | 'sequence'>
type MessageListener = (namespace: string, data: string) => void
type CastSession = {
  sendMessage: (namespace: string, message: CastCommand) => Promise<void>
  addMessageListener: (namespace: string, listener: MessageListener) => void
  removeMessageListener: (namespace: string, listener: MessageListener) => void
  getCastDevice: () => { friendlyName?: string }
}
type Observer = {
  state: (state: CastStatus) => void
  end: () => void
  connection?: (state: CastConnectionState) => void
}
type Handoff = { requestId: string; station?: string; playing: boolean; volume: number; muted: boolean; playlist?: CastPlaylistPosition }

export const castStations = resolveCastStations(process.env.NEXT_PUBLIC_CRUISE_CAST_STATIONS)
const appId = process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID || ''
const observers = new Set<Observer>()
let sdk: Promise<void> | null = null
let session: CastSession | null = null
let sessionListener: MessageListener | null = null
let removeContextListener: (() => void) | null = null
let sequence = 0
let requestNumber = 0
let requestAttempt = 0
let remote = false
let picking = false
let connection: CastConnectionState = 'disconnected'
let handoff: Handoff | null = null
let pendingStation: { station: string; requestId: string } | null = null
let pendingVolume: number | undefined
let pendingMute: boolean | undefined
const localRequests = new Set<string>()
let latestLocalRequest: string | null = null
let lastState: CastStatus | null = null
const api = () => window as unknown as Window & { cast: any; chrome: any; __onGCastApiAvailable?: (available: boolean) => void }
const requestId = () => `${Date.now().toString(36)}-${++requestNumber}`

function rememberRequest(id: string) {
  localRequests.add(id)
  latestLocalRequest = id
  if (localRequests.size > 64) localRequests.delete(localRequests.values().next().value!)
}

function setConnection(next: CastConnectionState) {
  if (next === connection) return
  connection = next
  for (const observer of observers) observer.connection?.(next)
}

function reportError(message: string) {
  window.dispatchEvent(new CustomEvent('cruise:cast-error', { detail: message }))
}

function setRemote(active: boolean) {
  if (remote === active) return
  remote = active
  window.dispatchEvent(new CustomEvent('cruise:cast-ownership', { detail: active }))
}

function notifyState(state: CastStatus) {
  lastState = state
  for (const observer of observers) observer.state(state)
}

function finishSession() {
  const hadSession = !!session || !!handoff || connection !== 'disconnected'
  const owned = remote
  if (session && sessionListener) session.removeMessageListener(CAST_NAMESPACE, sessionListener)
  session = null
  sessionListener = null
  handoff = null
  pendingStation = null
  pendingVolume = undefined
  pendingMute = undefined
  localRequests.clear()
  latestLocalRequest = null
  lastState = null
  setRemote(false)
  setConnection('disconnected')
  // Resume local audio only after the SDK confirms that the TV session ended.
  if (owned) window.dispatchEvent(new Event('cruise:cast-ended'))
  if (hadSession) for (const observer of observers) observer.end()
}

function send(current: CastSession, command: Command) {
  return current.sendMessage(CAST_NAMESPACE, { ...command, version: 1, sequence: ++sequence })
}

function validStatus(value: unknown): value is CastStatus {
  if (!value || typeof value !== 'object') return false
  const state = value as CastStatus
  return state.version === 1 && state.type === 'state' && typeof state.station === 'string'
    && typeof state.ready === 'boolean' && typeof state.playing === 'boolean'
    && typeof state.muted === 'boolean' && Number.isFinite(state.volume)
}

function receive(current: CastSession, raw: string) {
  if (current !== session || connection === 'disconnecting') return
  let state: CastStatus
  try { state = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return }
  if (!validStatus(state)) return
  // Sequence numbers belong to individual senders. A rejoined sender can start
  // at one while the receiver still reports another sender's larger sequence.
  // A failed new request can still carry the last successful acknowledgement.
  // Correlate its error independently, while continuing to discard late failures.
  const responseRequestId = state.error ? state.errorRequestId ?? state.ackRequestId : state.ackRequestId
  if (responseRequestId && localRequests.has(responseRequestId)
    && responseRequestId !== latestLocalRequest) return
  if (pendingStation && state.station !== pendingStation.station && !state.error) return
  if (state.error) {
    if (remote) window.dispatchEvent(new CustomEvent('cruise:cast-state', { detail: state }))
    notifyState(state)
    reportError(state.error)
    return
  }
  if (picking) return

  if (handoff) {
    const pending = handoff
    const playbackConfirmed = pending.playing
      ? state.playing && state.requested !== false && !state.loading
      : !state.playing && state.requested !== true
    if (!state.ready || state.ackRequestId !== pending.requestId || !playbackConfirmed
      || (pending.station && state.station !== pending.station)
      // A receiver already running during a rollout may predate playlist state.
      // Its correlated acknowledgement still supports the legacy station handoff.
      || (pending.playlist && state.playlist && state.playlist.trackId !== pending.playlist.trackId) || !state.muted) {
      notifyState(state)
      return
    }
    handoff = null
    pendingVolume = pending.volume
    pendingMute = pending.muted
    remote = true
    // Synchronous listeners stop the phone's source before the TV is unmuted.
    const transferred = { ...state, volume: pending.volume, muted: pending.muted }
    window.dispatchEvent(new CustomEvent('cruise:cast-state', { detail: transferred }))
    window.dispatchEvent(new CustomEvent('cruise:cast-ownership', { detail: true }))
    notifyState(transferred)
    setConnection('connected')
    void send(current, { type: 'volume', volume: pending.volume, muted: pending.muted }).catch(() => {
      if (session === current) reportError('TV volume could not be restored. Disconnect and retry.')
    })
    return
  }

  if (!state.ready) {
    notifyState(state)
    return
  }
  // Joining a running session adopts its state without reloading or muting it.
  const first = !remote
  remote = true
  if (pendingStation && state.ackRequestId === pendingStation.requestId) pendingStation = null
  if (pendingVolume !== undefined && Math.abs(state.volume - pendingVolume) < .001) pendingVolume = undefined
  if (pendingMute !== undefined && state.muted === pendingMute) pendingMute = undefined
  const effective = {
    ...state,
    volume: pendingVolume ?? state.volume,
    muted: pendingMute ?? state.muted,
  }
  window.dispatchEvent(new CustomEvent('cruise:cast-state', { detail: effective }))
  if (first) window.dispatchEvent(new CustomEvent('cruise:cast-ownership', { detail: true }))
  notifyState(effective)
  setConnection('connected')
}

function attachSession(current: CastSession | null) {
  if (!current) { finishSession(); return }
  if (current === session && sessionListener) return
  if (session && sessionListener) session.removeMessageListener(CAST_NAMESPACE, sessionListener)
  session = current
  sessionListener = (_namespace, data) => receive(current, data)
  current.addMessageListener(CAST_NAMESPACE, sessionListener)
  setConnection('connecting')
  void send(current, { type: 'status' }).catch(() => {
    if (session === current && !picking) reportError('TV connection could not be confirmed. Disconnect and retry.')
  })
}

export function castSupported() {
  return typeof window !== 'undefined' && window.isSecureContext && /Chrome|Chromium/.test(navigator.userAgent)
    && !/CriOS/.test(navigator.userAgent) && new URLSearchParams(window.location.search).get('receiver') !== '1'
    && !!appId && castStations.length > 0
}

export function loadCastSdk() {
  if (sdk) return sdk
  sdk = new Promise<void>((resolve, reject) => {
    const ready = (available: boolean) => {
      if (!available) { sdk = null; reject(new Error('Cast unavailable')); return }
      api().cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: appId,
        autoJoinPolicy: api().chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      })
      resolve()
    }
    if (api().cast?.framework) { ready(true); return }
    api().__onGCastApiAvailable = ready
    const script = document.createElement('script')
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'
    script.onerror = () => { sdk = null; reject(new Error('Cast SDK unavailable')) }
    document.head.appendChild(script)
  })
  return sdk
}

export function sendCast(command: Command) {
  if (!remote || !session) return false
  // Consume controls until shutdown is confirmed; falling back here would start
  // the phone while the TV may still be playing.
  if (connection === 'disconnecting') return true
  if (command.station && !castStations.includes(command.station)) return false
  const current = session
  const outgoing = { ...command }
  if (command.station) {
    outgoing.requestId = requestId()
    rememberRequest(outgoing.requestId)
    pendingStation = { station: command.station, requestId: outgoing.requestId }
  }
  if (command.volume !== undefined) pendingVolume = command.volume
  if (command.muted !== undefined) pendingMute = command.muted
  void send(current, outgoing).catch(() => {
    if (session === current) reportError('TV connection lost. Disconnect and retry.')
  })
  return true
}

export function castIsRemote() { return remote }
export function castDeviceName() { return session?.getCastDevice()?.friendlyName || 'TV' }

export function attachCast(
  onState: Observer['state'],
  onEnd: Observer['end'],
  onConnection?: Observer['connection'],
) {
  const observer = { state: onState, end: onEnd, connection: onConnection }
  observers.add(observer)
  const context = api().cast.framework.CastContext.getInstance()
  if (!removeContextListener) {
    const event = api().cast.framework.CastContextEventType.SESSION_STATE_CHANGED
    const changed = (change?: { sessionState?: string }) => {
      if (change?.sessionState === 'SESSION_ENDED' || change?.sessionState === 'SESSION_START_FAILED') {
        finishSession()
      } else if (change?.sessionState === 'SESSION_ENDING') {
        setConnection('disconnecting')
      } else {
        attachSession(context.getCurrentSession())
      }
    }
    context.addEventListener(event, changed)
    removeContextListener = () => context.removeEventListener(event, changed)
    attachSession(context.getCurrentSession())
  }
  onConnection?.(connection)
  if (lastState) onState(lastState)
  return () => {
    observers.delete(observer)
    if (observers.size === 0) {
      removeContextListener?.()
      removeContextListener = null
      if (session && sessionListener) session.removeMessageListener(CAST_NAMESPACE, sessionListener)
      sessionListener = null
    }
  }
}

export async function requestCast(initial: Command, getPlaylistPosition?: () => CastPlaylistPosition | undefined) {
  if (initial.station && !castStations.includes(initial.station)) {
    throw new Error('This station is unavailable on TV. Choose another station.')
  }
  const context = api().cast.framework.CastContext.getInstance()
  const attempt = ++requestAttempt
  picking = true
  setConnection('connecting')
  try {
    // Called directly from the tap handler; no awaited work precedes the picker.
    await context.requestSession()
  } catch (error) {
    if (attempt !== requestAttempt) return false
    picking = false
    setConnection(remote ? 'connected' : 'disconnected')
    if (String(error).toLowerCase().includes('cancel') || (error as { code?: string })?.code === 'cancel') return false
    throw error
  }
  if (attempt !== requestAttempt) {
    context.endCurrentSession(true)
    return false
  }
  const current = context.getCurrentSession() as CastSession | null
  if (!current) { picking = false; finishSession(); throw new Error('Cast session unavailable') }
  attachSession(current)
  // The listener may spend several seconds choosing a TV. Capture the actual
  // playlist position immediately before sending the handoff, not at the tap.
  const playlist = getPlaylistPosition ? getPlaylistPosition() : initial.playlist
  const pending: Handoff = {
    requestId: requestId(), station: initial.station, playing: initial.playing !== false,
    volume: initial.volume ?? .82, muted: initial.muted ?? false, playlist,
  }
  handoff = pending
  rememberRequest(pending.requestId)
  pendingStation = null
  picking = false
  try {
    await send(current, { ...initial, playlist, requestId: pending.requestId, playing: pending.playing, muted: true, type: 'sync' })
  } catch (error) {
    if (session === current) handoff = null
    throw error
  }
  return true
}

export function disconnectCast() {
  requestAttempt++
  picking = false
  handoff = null
  if (!session) { finishSession(); return }
  setConnection('disconnecting')
  // Keep the reference until SESSION_ENDED, including when the SDK ends asynchronously.
  api().cast.framework.CastContext.getInstance().endCurrentSession(true)
}
