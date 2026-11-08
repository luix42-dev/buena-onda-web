'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseMirrorMessage, type MirrorMessage, type MirrorState, type MirrorStats } from '@/lib/cruise/mirror-protocol'
import { collectCastDiagnostic, uploadCastDiagnostic } from '@/lib/cruise/cast-diagnostics'

type Options = {
  send: (senderId: string, message: MirrorMessage) => void
  onActivate: () => void
}
type Session = {
  id: string; sender: string; offer: string; answer?: string
  pc: RTCPeerConnection; stream: MediaStream; state: MirrorState; error?: string
  remoteReady: boolean; candidates: Array<RTCIceCandidateInit | null>; candidateWork: Promise<void>
  startup?: ReturnType<typeof setTimeout>; disconnected?: ReturnType<typeof setTimeout>
  frameCallback?: number; frames?: { decoded: number; at: number }
}

/** The receiver only decodes the sender's media; it never renders another drive. */
export function useMirrorReceiver(options: Options) {
  const currentOptions = useRef(options); currentOptions.current = options
  const videoRef = useRef<HTMLVideoElement>(null)
  const session = useRef<Session | null>(null)
  const retired = useRef(new Set<string>())
  const mounted = useRef(true)
  const [state, setState] = useState<MirrorState>('ended')
  const [error, setError] = useState('')

  const current = useCallback((item: Session) => mounted.current && session.current === item, [])
  const send = useCallback((item: Session, message: MirrorMessage) => {
    if (!current(item)) return
    try { currentOptions.current.send(item.sender, message) } catch { /* CAF may already have lost this sender. */ }
  }, [current])
  const report = useCallback((item: Session, next: MirrorState, reason?: string) => {
    if (!current(item)) return
    item.state = next; item.error = reason
    setState(next); setError(reason || '')
    send(item, { version: 1, id: item.id, type: 'state', state: next, ...(reason ? { error: reason } : {}) })
  }, [current, send])
  const dispose = useCallback((item: Session) => {
    clearTimeout(item.startup); clearTimeout(item.disconnected)
    item.pc.ontrack = null; item.pc.onicecandidate = null; item.pc.onconnectionstatechange = null
    item.pc.close()
    for (const track of item.stream.getTracks()) { track.onended = null; track.stop() }
    item.candidates.length = 0
    const video = videoRef.current
    if (video?.srcObject === item.stream) {
      if (item.frameCallback !== undefined) video.cancelVideoFrameCallback?.(item.frameCallback)
      video.pause(); video.srcObject = null
    }
    retired.current.add(item.id)
    if (retired.current.size > 64) retired.current.delete(retired.current.values().next().value!)
    if (session.current === item) session.current = null
  }, [])
  const finish = useCallback((item: Session, next: 'ended' | 'error', reason?: string) => {
    if (!current(item)) return
    report(item, next, reason); dispose(item)
  }, [current, dispose, report])
  const confirmFrame = useCallback(() => {
    const item = session.current, video = videoRef.current
    if (!item || !video || !current(item) || item.state === 'playing'
      || video.paused || video.readyState < 2 || video.videoWidth <= 0) return
    clearTimeout(item.startup)
    report(item, 'playing')
  }, [current, report])
  const play = useCallback((item: Session) => {
    const video = videoRef.current
    if (!current(item) || !video) return
    if (video.srcObject !== item.stream) video.srcObject = item.stream
    video.muted = false
    if (item.frameCallback === undefined && typeof video.requestVideoFrameCallback === 'function') {
      item.frameCallback = video.requestVideoFrameCallback(() => {
        item.frameCallback = undefined
        if (current(item)) confirmFrame()
      })
    }
    void video.play().then(() => {
      if (typeof video.requestVideoFrameCallback !== 'function' && video.currentTime > 0) confirmFrame()
    }).catch(() => finish(item, 'error', 'The TV could not start the live picture and sound. Reconnect to try again.'))
  }, [confirmFrame, current, finish])
  const addCandidate = useCallback((item: Session, candidate: RTCIceCandidateInit | null) => {
    item.candidateWork = item.candidateWork.then(async () => {
      if (current(item)) await item.pc.addIceCandidate(candidate ?? undefined)
    }).catch(() => {
      if (current(item)) finish(item, 'error', 'The live connection could not be established. Reconnect to try again.')
    })
  }, [current, finish])
  const reportStats = useCallback(async (item: Session) => {
    try {
      const stats: MirrorStats = {}
      const rtc = await item.pc.getStats()
      if (!current(item)) return
      rtc.forEach(entry => {
        if (entry.type !== 'inbound-rtp' || (entry.kind !== 'video' && entry.mediaType !== 'video')) return
        for (const key of ['framesDecoded', 'framesPerSecond', 'frameWidth', 'frameHeight', 'bytesReceived', 'packetsLost'] as const) {
          if (typeof entry[key] === 'number' && Number.isFinite(entry[key])) stats[key] = entry[key]
        }
        if (stats.framesDecoded !== undefined && typeof entry.timestamp === 'number') {
          if (stats.framesPerSecond === undefined && item.frames && entry.timestamp > item.frames.at) {
            stats.framesPerSecond = Math.max(0, (stats.framesDecoded - item.frames.decoded) * 1000 / (entry.timestamp - item.frames.at))
          }
          item.frames = { decoded: stats.framesDecoded, at: entry.timestamp }
        }
      })
      const video = videoRef.current
      if (video) { stats.currentTime = video.currentTime; stats.videoWidth = video.videoWidth; stats.videoHeight = video.videoHeight }
      send(item, { version: 1, id: item.id, type: 'state', state: item.state, ...(item.error ? { error: item.error } : {}), stats })
    } catch { if (current(item)) send(item, { version: 1, id: item.id, type: 'state', state: item.state }) }
  }, [current, send])

  const receive = useCallback(async (sender: string, input: unknown) => {
    if (!mounted.current || typeof sender !== 'string' || !sender || sender.length > 256) return
    const message = parseMirrorMessage(input)
    if (!message || message.type === 'answer' || message.type === 'state') return
    const existing = session.current
    if (message.type !== 'offer') {
      if (!existing || existing.sender !== sender || existing.id !== message.id) return
      if (message.type === 'stop') finish(existing, 'ended')
      if (message.type === 'status') void reportStats(existing)
      if (message.type === 'ice') {
        if (existing.remoteReady) addCandidate(existing, message.candidate)
        else if (existing.candidates.length < 256) existing.candidates.push(message.candidate)
        else finish(existing, 'error', 'The live connection received too many candidates. Reconnect to try again.')
      }
      return
    }
    if (retired.current.has(message.id)) return
    if (existing && existing.sender !== sender) {
      try { currentOptions.current.send(sender, { version: 1, id: message.id, type: 'state', state: 'error', error: 'The TV is receiving another device. Stop that connection first.' }) } catch {}
      return
    }
    if (existing?.id === message.id) {
      if (existing.offer === message.sdp && existing.answer) send(existing, { version: 1, id: existing.id, type: 'answer', sdp: existing.answer })
      return
    }
    if (existing) finish(existing, 'ended')
    currentOptions.current.onActivate()
    let pc: RTCPeerConnection
    try { pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }) }
    catch {
      setState('error'); setError('This TV cannot receive the live picture.')
      try { currentOptions.current.send(sender, { version: 1, id: message.id, type: 'state', state: 'error', error: 'This TV cannot receive the live picture.' }) } catch {}
      return
    }
    const item: Session = { id: message.id, sender, offer: message.sdp, pc, stream: new MediaStream(), state: 'connecting', remoteReady: false, candidates: [], candidateWork: Promise.resolve() }
    session.current = item
    report(item, 'connecting')
    item.startup = setTimeout(() => finish(item, 'error', 'The TV did not receive a live picture. Keep both devices on the same Wi-Fi and reconnect.'), 30000)
    pc.onicecandidate = event => send(item, { version: 1, id: item.id, type: 'ice', candidate: event.candidate?.toJSON() ?? null })
    pc.ontrack = event => {
      if (!current(item)) return
      if (!item.stream.getTracks().some(track => track.id === event.track.id)) item.stream.addTrack(event.track)
      if (event.track.kind === 'video') event.track.onended = () => finish(item, 'ended')
      play(item)
    }
    pc.onconnectionstatechange = () => {
      if (!current(item)) return
      if (pc.connectionState === 'connected') { clearTimeout(item.disconnected); item.disconnected = undefined; play(item) }
      if (pc.connectionState === 'failed') {
        // TV-side view of the same failure (candidate types only, no addresses).
        void collectCastDiagnostic(pc, { id: item.id, side: 'receiver', reason: 'transport-failed' }).then(uploadCastDiagnostic, () => {})
        finish(item, 'error', 'The live connection could not be established. Reconnect to try again.')
      }
      if (pc.connectionState === 'disconnected' && item.disconnected === undefined) {
        item.disconnected = setTimeout(() => finish(item, 'error', 'The phone disconnected from the TV.'), 10000)
      }
      if (pc.connectionState === 'closed') finish(item, 'ended')
    }
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: message.sdp })
      if (!current(item)) return
      item.remoteReady = true
      for (const candidate of item.candidates.splice(0)) addCandidate(item, candidate)
      const answer = await pc.createAnswer()
      if (!current(item)) return
      await pc.setLocalDescription(answer)
      if (!current(item) || !pc.localDescription?.sdp) return
      item.answer = pc.localDescription.sdp
      send(item, { version: 1, id: item.id, type: 'answer', sdp: item.answer })
    } catch { finish(item, 'error', 'The TV could not connect to this live stream. Reconnect to try again.') }
  }, [addCandidate, current, finish, play, report, reportStats, send])

  const disconnect = useCallback((sender: string) => {
    const item = session.current
    if (item?.sender === sender) finish(item, 'ended')
  }, [finish])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (session.current) dispose(session.current) }
  }, [dispose])
  // The video mounts after onActivate removes the legacy scene. Tracks may arrive first.
  useEffect(() => { if (session.current) play(session.current) }, [state, play])

  return { videoRef, state, error, receive, disconnect,
    onVideoPlaying: () => {
      const item = session.current
      if (item) play(item)
    },
    onVideoTimeUpdate: () => {
      const video = videoRef.current
      if (video && typeof video.requestVideoFrameCallback !== 'function' && video.currentTime > 0) confirmFrame()
    },
    onVideoError: () => {
      const item = session.current
      if (item) finish(item, 'error', 'The TV could not decode the live picture. Reconnect to try again.')
    },
  }
}
