'use client'

import { loadCastSdk, castSupported } from './google-cast'
import { MIRROR_NAMESPACE, parseMirrorMessage } from './mirror-protocol'
import { fetchCastIceServers, castPeerConfiguration } from './cast-ice'
import { collectCastDiagnostic, uploadCastDiagnostic, type CastDiagnosticReason } from './cast-diagnostics'

export type LiveCastSource = { stream: MediaStream; setLocalSilent: (silent: boolean) => void; dispose: () => void }
export type LiveCastState = { phase: 'idle' | 'connecting' | 'playing' | 'error'; device: string; error: string }
type Session = {
  sendMessage: (namespace: string, value: unknown) => Promise<void>
  addMessageListener: (namespace: string, listener: (namespace: string, value: unknown) => void) => void
  removeMessageListener: (namespace: string, listener: (namespace: string, value: unknown) => void) => void
  getCastDevice: () => { friendlyName?: string }
  getSessionId?: () => string; getSessionState?: () => string
}
type CastContext = {
  requestSession: () => Promise<void>; getCurrentSession: () => Session | null
  endCurrentSession: (stop: boolean) => void
  addEventListener: (name: string, fn: (event: { sessionState: string; session?: Session }) => void) => void
}
type Provider = () => Promise<LiveCastSource>
type Attempt = {
  id: string; context: CastContext; provider: Provider; cancelled: boolean
  session: Session | null; peer: RTCPeerConnection | null; source: LiveCastSource | null
  listener?: (namespace: string, value: unknown) => void
  timeout?: ReturnType<typeof setTimeout>; disconnected?: ReturnType<typeof setTimeout>
  removeSourceErrors?: () => void; cancelWait: () => void
  wake?: WakeLockSentinel; requestingWake?: boolean
}
let provider: Provider | null = null
let active: Attempt | null = null, context: CastContext | null = null
let state: LiveCastState = { phase: 'idle', device: '', error: '' }
const listeners = new Set<(value: LiveCastState) => void>()
const cancelled = Symbol('cancelled')
function report(value: LiveCastState) {
  state = value
  for (const listener of listeners) { try { listener(value) } catch { /* UI observers do not own the session. */ } }
}
const isCurrent = (attempt: Attempt) => active === attempt && !attempt.cancelled
function sameSession(a: Session | null | undefined, b: Session | null | undefined) {
  if (!a || !b) return false
  if (a === b) return true
  const id = a.getSessionId?.()
  return !!id && id === b.getSessionId?.()
}
function release(source: LiveCastSource) {
  try { source.setLocalSilent(false) } catch {}
  try { source.dispose() } catch {}
}
function endOwnedSession(attempt: Attempt, session: Session) {
  // A cancelled picker resolving late must not end a newer connection or picker.
  if (active && active !== attempt) return
  if (sameSession(attempt.context.getCurrentSession(), session)) {
    try { attempt.context.endCurrentSession(true) } catch {}
  }
}
function keepScreenAwake(attempt: Attempt) {
  if (!isCurrent(attempt) || state.phase !== 'playing' || attempt.wake || attempt.requestingWake
    || typeof navigator === 'undefined' || !navigator.wakeLock
    || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return
  attempt.requestingWake = true
  try {
    void navigator.wakeLock.request('screen').then(lock => {
      attempt.requestingWake = false
      if (!isCurrent(attempt) || state.phase !== 'playing') { void lock.release().catch(() => {}); return }
      attempt.wake = lock
      lock.addEventListener('release', () => { if (attempt.wake === lock) attempt.wake = undefined })
    }).catch(() => { attempt.requestingWake = false })
  } catch { attempt.requestingWake = false }
}
function finish(attempt: Attempt, error = '', endSession = true) {
  if (!isCurrent(attempt)) return
  active = null; attempt.cancelled = true; attempt.cancelWait()
  clearTimeout(attempt.timeout); clearTimeout(attempt.disconnected)
  attempt.removeSourceErrors?.()
  if (attempt.wake) { void attempt.wake.release().catch(() => {}); attempt.wake = undefined }
  const session = attempt.session
  if (session && attempt.listener) {
    try { session.removeMessageListener(MIRROR_NAMESPACE, attempt.listener) } catch {}
  }
  if (session && endSession) {
    try { void session.sendMessage(MIRROR_NAMESPACE, { version: 1, id: attempt.id, type: 'stop' }).catch(() => {}) } catch {}
  }
  if (attempt.peer) {
    attempt.peer.onicecandidate = null; attempt.peer.onconnectionstatechange = null
    try { attempt.peer.close() } catch {}
  }
  const source = attempt.source; attempt.source = null
  if (source) release(source)
  // End before reporting: a UI observer may immediately start a new attempt.
  if (session && endSession) endOwnedSession(attempt, session)
  report({ phase: error ? 'error' : 'idle', device: '', error })
}
export const readLiveCast = () => state
export function observeLiveCast(listener: (value: LiveCastState) => void) {
  listeners.add(listener); listener(state); return () => { listeners.delete(listener) }
}
export function registerLiveCastSource(create: Provider) {
  provider = create
  return () => { if (provider === create) { stopLiveCast(); provider = null } }
}
export function liveCastSupported() {
  return castSupported() && typeof RTCPeerConnection !== 'undefined' && typeof HTMLCanvasElement !== 'undefined'
    && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}
export async function prepareLiveCast() {
  if (!liveCastSupported()) return false
  await loadCastSdk()
  if (!context) {
    const api = window as unknown as { cast: { framework: { CastContext: { getInstance: () => CastContext }; CastContextEventType: { SESSION_STATE_CHANGED: string } } } }
    context = api.cast.framework.CastContext.getInstance()
    context.addEventListener(api.cast.framework.CastContextEventType.SESSION_STATE_CHANGED, event => {
      if (event.sessionState !== 'SESSION_ENDED' && event.sessionState !== 'SESSION_START_FAILED') return
      const attempt = active
      // Picker rejection owns pending attempts. Late SDK events cannot cancel a
      // newer picker or erase an error after its old session has been cleaned up.
      if (!attempt?.session) return
      const related = event.session ? sameSession(event.session, attempt.session)
        : attempt.session.getSessionState?.() === event.sessionState
      if (related) finish(attempt, event.sessionState === 'SESSION_START_FAILED' ? 'The TV could not start the connection. Try again.' : '', false)
    })
  }
  return true
}
export function stopLiveCast() {
  if (active) finish(active)
  else if (state.phase !== 'idle') report({ phase: 'idle', device: '', error: '' })
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Could not connect to the TV. Try again.'
function pickerCancelled(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'cancel') return true
  return /cancel|NotAllowedError/i.test(String(error))
}
function settled<T>(promise: Promise<T>): Promise<{ value: T | null; error: unknown }> {
  return promise.then(value => ({ value, error: null }), error => ({ value: null, error }))
}

/** Called directly from the tap: the SDK picker must retain the user gesture. */
export async function startLiveCast() {
  if (!context || !provider) throw new Error('Cast is still getting ready. Please try again.')
  if (active) return
  let cancelWait = () => {}
  const stopped = new Promise<typeof cancelled>(resolve => { cancelWait = () => resolve(cancelled) })
  const attempt: Attempt = { id: crypto.randomUUID(), context, provider, cancelled: false,
    session: null, peer: null, source: null, cancelWait }
  active = attempt
  const onSourceError = (event: Event) => {
    if (!isCurrent(attempt)) return
    const detail = (event as CustomEvent<{ message?: string }>).detail
    void collectCastDiagnostic(attempt.peer, { id: attempt.id, side: 'sender', reason: 'capture-failed' }).then(uploadCastDiagnostic, () => {})
    finish(attempt, typeof detail?.message === 'string' ? detail.message : 'The phone could not keep sending the live drive. Try casting again.')
  }
  window.addEventListener('cruise:mirror-audio-error', onSourceError)
  window.addEventListener('cruise:mirror-video-error', onSourceError)
  const onVisible = () => keepScreenAwake(attempt)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
  attempt.removeSourceErrors = () => {
    window.removeEventListener('cruise:mirror-audio-error', onSourceError)
    window.removeEventListener('cruise:mirror-video-error', onSourceError)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
  }
  report({ phase: 'connecting', device: '', error: '' })
  if (!isCurrent(attempt)) return

  // Start both inside the gesture and handle rejections immediately. Cancellation
  // and capture errors never wait for the other promise to finish.
  let selection: Promise<{ value: Session | null; error: unknown }>
  try {
    selection = settled(attempt.context.requestSession().then(() => {
      const selected = attempt.context.getCurrentSession()
      if (isCurrent(attempt)) attempt.session = selected
      if (!isCurrent(attempt) && selected) endOwnedSession(attempt, selected)
      return selected
    }))
  } catch (error) { finish(attempt, pickerCancelled(error) ? '' : errorMessage(error)); return }
  let captured: Promise<{ value: LiveCastSource | null; error: unknown }>
  try {
    captured = settled(attempt.provider()).then(result => {
      if (result.value) {
        if (isCurrent(attempt)) attempt.source = result.value
        else if (active?.source !== result.value) release(result.value)
      } else if (isCurrent(attempt)) {
        void collectCastDiagnostic(null, { id: attempt.id, side: 'sender', reason: 'capture-failed' }).then(uploadCastDiagnostic, () => {})
        finish(attempt, errorMessage(result.error))
      }
      return result
    })
  } catch (error) { finish(attempt, errorMessage(error)); return }
  const iceServers = fetchCastIceServers()
  try {
    const selected = await Promise.race([selection, stopped])
    if (selected === cancelled || !isCurrent(attempt)) return
    if (selected.error) {
      if (!pickerCancelled(selected.error)) void collectCastDiagnostic(null, { id: attempt.id, side: 'sender', reason: 'picker-failed' }).then(uploadCastDiagnostic, () => {})
      finish(attempt, pickerCancelled(selected.error) ? '' : errorMessage(selected.error)); return
    }
    attempt.session = selected.value
    if (!attempt.session) throw new Error('The TV did not connect.')
    const result = await Promise.race([captured, stopped])
    if (result === cancelled || !isCurrent(attempt)) return
    if (result.error || !result.value) throw result.error || new Error('Could not capture the drive.')
    const source = result.value, session = attempt.session
    const servers = await Promise.race([iceServers, stopped])
    if (servers === cancelled || !isCurrent(attempt)) return
    const peer = new RTCPeerConnection(castPeerConfiguration(servers))
    attempt.peer = peer
    let sentCandidates = 0, receivedCandidates = 0, reported = false, connectedReported = false
    const startedAt = Date.now()
    const diagnose = async (reason: CastDiagnosticReason) => {
      if (reported) return
      reported = true
      try {
        uploadCastDiagnostic(await collectCastDiagnostic(peer, { id: attempt.id, side: 'sender', reason,
          counters: { sentCandidates, receivedCandidates, elapsedMs: Date.now() - startedAt } }))
      } catch { /* Diagnostics never affect the cast. */ }
    }
    const fail = (reason: CastDiagnosticReason, message: string) => {
      if (!isCurrent(attempt)) return
      // collectCastDiagnostic reads states and starts getStats synchronously, before finish() closes the peer.
      void diagnose(reason)
      finish(attempt, message)
    }
    const queuedRemote: Array<RTCIceCandidateInit | null> = [], queuedLocal: Array<RTCIceCandidateInit | null> = []
    let offerSent = false, signalWork = Promise.resolve(), messageWork = Promise.resolve()
    const send = (message: object) => session.sendMessage(MIRROR_NAMESPACE, { version: 1, id: attempt.id, ...message })
    const sendCandidate = (candidate: RTCIceCandidateInit | null) => {
      signalWork = signalWork.then(async () => {
        if (isCurrent(attempt)) { await send({ type: 'ice', candidate }); if (candidate) sentCandidates++ }
      }).catch(() => fail('signal-failed', 'The live connection could not be established. Try casting again.'))
    }
    const listener = (_namespace: string, data: unknown) => {
      messageWork = messageWork.then(async () => {
        if (!isCurrent(attempt)) return
        const message = parseMirrorMessage(data)
        if (!message || message.id !== attempt.id) return
        if (message.type === 'answer') {
          if (peer.remoteDescription) return
          await peer.setRemoteDescription({ type: 'answer', sdp: message.sdp })
          if (!isCurrent(attempt)) return
          for (const candidate of queuedRemote.splice(0)) {
            if (!isCurrent(attempt)) return
            await peer.addIceCandidate(candidate ?? undefined)
          }
        } else if (message.type === 'ice') {
          if (message.candidate) receivedCandidates++
          if (peer.remoteDescription) await peer.addIceCandidate(message.candidate ?? undefined)
          else if (queuedRemote.length < 256) queuedRemote.push(message.candidate)
          else finish(attempt, 'The TV sent too many connection candidates. Try casting again.')
        } else if (message.type === 'state' && message.state === 'playing') {
          if (!peer.remoteDescription) return
          clearTimeout(attempt.timeout); source.setLocalSilent(true)
          if (isCurrent(attempt)) { report({ phase: 'playing', device: session.getCastDevice().friendlyName || 'TV', error: '' }); keepScreenAwake(attempt) }
        } else if (message.type === 'state' && message.state === 'error') fail('transport-failed', message.error || 'The TV could not play the live drive.')
        else if (message.type === 'state' && message.state === 'ended') finish(attempt)
      }).catch(() => { if (isCurrent(attempt)) finish(attempt, 'The live TV connection was interrupted. Try casting again.') })
    }
    attempt.listener = listener
    attempt.timeout = setTimeout(() => fail('startup-timeout', 'The TV did not start the live drive. Try casting again.'), 30000)
    session.addMessageListener(MIRROR_NAMESPACE, listener)
    peer.onicecandidate = event => {
      if (!isCurrent(attempt)) return
      const candidate = event.candidate?.toJSON() ?? null
      // The receiver binds ICE to an offer ID; candidates sent first are dropped.
      if (offerSent) sendCandidate(candidate)
      else if (queuedLocal.length < 256) queuedLocal.push(candidate)
      else finish(attempt, 'Too many live connection candidates. Try casting again.')
    }
    peer.onconnectionstatechange = () => {
      if (!isCurrent(attempt)) return
      if (peer.connectionState === 'connected') {
        clearTimeout(attempt.disconnected); attempt.disconnected = undefined
        if (!connectedReported) {
          connectedReported = true
          void collectCastDiagnostic(peer, { id: attempt.id, side: 'sender', reason: 'connected',
            counters: { sentCandidates, receivedCandidates, elapsedMs: Date.now() - startedAt } }).then(uploadCastDiagnostic, () => {})
        }
      } else if (peer.connectionState === 'disconnected' && attempt.disconnected === undefined) {
        attempt.disconnected = setTimeout(() => fail('disconnected', 'The TV connection dropped. Your drive is still here.'), 10000)
      } else if (peer.connectionState === 'failed' || peer.connectionState === 'closed') fail('transport-failed', 'The TV connection dropped. Your drive is still here.')
    }
    for (const track of source.stream.getTracks()) {
      const sender = peer.addTrack(track, source.stream)
      if (track.kind === 'video') {
        track.contentHint = 'motion'
        const parameters = sender.getParameters()
        parameters.encodings = [{ ...parameters.encodings?.[0], maxBitrate: 4_000_000, maxFramerate: 30 }]
        void sender.setParameters(parameters).catch(() => {})
      }
    }
    const offer = await peer.createOffer()
    if (!isCurrent(attempt)) return
    await peer.setLocalDescription(offer)
    if (!isCurrent(attempt)) return
    const sdp = peer.localDescription?.sdp || offer.sdp
    if (!sdp) throw new Error('The phone could not prepare the live stream.')
    await send({ type: 'offer', sdp })
    if (!isCurrent(attempt)) return
    offerSent = true
    for (const candidate of queuedLocal.splice(0)) sendCandidate(candidate)
  } catch (error) { if (isCurrent(attempt)) finish(attempt, errorMessage(error)) }
}
