'use client'
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { CAST_NAMESPACE, receiverCastStations, type CastCommand, type CastStatus } from '@/lib/cruise/google-cast'
import { createReceiverFrameSeed } from '@/lib/cruise/cast-receiver-seed'
import { createCastSignalQueue } from '@/lib/cruise/cast-signal-queue'
import { MIRROR_NAMESPACE, type MirrorMessage } from '@/lib/cruise/mirror-protocol'
import { useMirrorReceiver } from './useMirrorReceiver'

/** New senders stream their live drive. Legacy senders retain their existing receiver. */
export default function Receiver() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [frameUrl, setFrameUrl] = useState<string | null>(null)
  const [mirrorMode, setMirrorMode] = useState(false)
  const mirroring = useRef(false)
  const mirrorSend = useRef<(senderId: string, message: MirrorMessage) => void>(() => {})
  const resetLegacy = useRef<() => void>(() => {})
  const activateMirror = useCallback(() => {
    // Remove the old rendering/audio owner before allowing the incoming stream to play.
    mirroring.current = true
    resetLegacy.current()
    if (frame.current) frame.current.src = 'about:blank'
    setFrameUrl(null)
    setMirrorMode(true)
  }, [])
  const sendMirror = useCallback((sender: string, message: MirrorMessage) => mirrorSend.current(sender, message), [])
  const mirror = useMirrorReceiver({ send: sendMirror, onActivate: activateMirror })
  const mirrorController = useRef(mirror); mirrorController.current = mirror
  useEffect(() => {
    let context: any, systemReady = false, frameReady = false, disposed = false
    let latestState: CastStatus | null = null
    const pending: CastCommand[] = [], sequences = new Map<string, number>()
    const diagnostics = process.env.NODE_ENV === 'development'
      || new URLSearchParams(location.search).get('diagnostics') === '1'
    const seedFrame = createReceiverFrameSeed(receiverCastStations, diagnostics)
    const errors: Array<{ at: string; source: string; message: string }> = []
    let lastFrameStateAt = 0, heartbeat = 0
    let lastCommand: Partial<CastCommand> | null = null
    let observedDocument: Document | null = null
    let removeFrameDiagnostics: (() => void) | null = null
    resetLegacy.current = () => {
      pending.length = 0; latestState = null; frameReady = false
      removeFrameDiagnostics?.(); removeFrameDiagnostics = null; observedDocument = null
    }
    const recordError = (source: string, reason: unknown) => {
      if (!diagnostics) return
      const message = reason instanceof Error ? `${reason.name}: ${reason.message}\n${reason.stack || ''}` : String(reason)
      errors.push({ at: new Date().toISOString(), source, message: message.slice(0, 900) })
      if (errors.length > 12) errors.shift()
    }
    const reportError = (reason: unknown) => {
      recordError('receiver', reason)
      console.error('[Cruise Cast receiver]', reason)
    }
    const watchErrors = (target: Window, source: string) => {
      const error = (event: Event) => {
        const detail = event as ErrorEvent
        const resource = event.target as { src?: string; href?: string } | null
        recordError(source, detail.error || detail.message || `Resource failed: ${resource?.src || resource?.href || event.type}`)
      }
      const rejection = (event: PromiseRejectionEvent) => recordError(source, event.reason)
      const contextLost = () => recordError(source, 'WebGL context lost')
      target.addEventListener('error', error, true)
      target.addEventListener('unhandledrejection', rejection)
      target.addEventListener('webglcontextlost', contextLost, true)
      return () => {
        target.removeEventListener('error', error, true)
        target.removeEventListener('unhandledrejection', rejection)
        target.removeEventListener('webglcontextlost', contextLost, true)
      }
    }
    const inspectFrame = () => {
      try {
        const target = frame.current?.contentWindow
        const doc = target?.document
        if (!target || !doc) return { available: false }
        if (doc !== observedDocument) {
          removeFrameDiagnostics?.()
          observedDocument = doc
          removeFrameDiagnostics = watchErrors(target, 'scene')
        }
        const scene = doc.querySelector<HTMLElement>('.jn')
        const loading = doc.querySelector<HTMLElement>('.bl, .drive-loading, [aria-label="Drive preparation"]')
        const failure = doc.querySelector<HTMLElement>('.jn-failure, [role="alert"], nextjs-portal')
        const text = (node: HTMLElement | null, limit: number) => (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').slice(0, limit)
        const metrics = target.__jeepNight?.() ?? null
        return {
          available: true, url: target.location.pathname + target.location.search,
          documentState: doc.readyState, hidden: doc.hidden, visibility: doc.visibilityState,
          scene: scene ? { ...scene.dataset, width: scene.clientWidth, height: scene.clientHeight } : null,
          metrics,
          loading: loading ? { shown: loading.dataset.show, busy: loading.getAttribute('aria-busy'),
            progress: doc.querySelector('[aria-label="Drive preparation"]')?.getAttribute('aria-valuenow'), text: text(loading, 400) } : null,
          failure: text(failure, 600), body: text(doc.body, 700),
          canvases: Array.from(doc.querySelectorAll('canvas')).slice(0, 5).map(canvas => ({
            width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight,
          })),
        }
      } catch (error) { recordError('inspection', error); return { available: false, error: String(error).slice(0, 300) } }
    }
    const removeParentDiagnostics = diagnostics ? watchErrors(window, 'receiver') : null
    const broadcast = (state: CastStatus) => {
      if (mirroring.current || !systemReady || !context?.isSystemReady() || !context.getSenders().length) return
      try { context.sendCustomMessage(CAST_NAMESPACE, undefined, state) } catch (error) { reportError(error) }
    }
    const forward = (command: CastCommand) => {
      if (mirroring.current) return
      frame.current?.contentWindow?.postMessage({ channel: CAST_NAMESPACE, command }, location.origin)
    }
    const mirrorSignals = createCastSignalQueue({
      ready: senderId => !disposed && systemReady && !!context?.isSystemReady()
        && context.getSenders().some((sender: { id: string }) => sender.id === senderId),
      send: (senderId, message) => context.sendCustomMessage(MIRROR_NAMESPACE, senderId, message),
      onFailure: reportError,
    })
    mirrorSend.current = mirrorSignals.send
    const script = document.createElement('script')
    script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js'
    script.onerror = () => reportError('Google Cast receiver SDK failed to load')
    script.onload = () => {
      if (disposed) return
      try {
        const framework = (window as any).cast.framework
        context = framework.CastReceiverContext.getInstance()
        context.addEventListener(framework.system.EventType.READY, () => {
          systemReady = true
          mirrorSignals.flush()
          if (diagnostics) console.info('[Cruise Cast receiver] CAF ready')
          if (latestState) broadcast(latestState)
        })
        context.addEventListener(framework.system.EventType.SENDER_CONNECTED, () => {
          mirrorSignals.flush()
          if (latestState) broadcast(latestState)
        })
        context.addEventListener(framework.system.EventType.SENDER_DISCONNECTED, (event: { senderId: string }) => {
          mirrorController.current.disconnect(event.senderId)
          mirrorSignals.disconnect(event.senderId)
        })
        context.addCustomMessageListener(MIRROR_NAMESPACE, (event: { senderId: string; data: unknown }) => {
          void mirrorController.current.receive(event.senderId, event.data)
        })
        context.addCustomMessageListener(CAST_NAMESPACE, (event: any) => {
          if (mirroring.current) return
          const command = event.data as CastCommand
          if (command?.version !== 1 || !Number.isSafeInteger(command.sequence)
            || command.sequence <= (sequences.get(event.senderId) ?? -1)) return
          sequences.set(event.senderId, command.sequence)
          if (diagnostics) lastCommand = { type: command.type, sequence: command.sequence, requestId: command.requestId, station: command.station, playing: command.playing, scene: command.scene }
          if (command.station && !receiverCastStations.includes(command.station)) {
            broadcast({
              ...(latestState ?? { version: 1, type: 'state', station: '', playing: false, volume: 0, muted: true }),
              ready: false, error: 'This station is not in the Cruise catalog. Choose another station.',
              errorRequestId: command.requestId,
            })
            return
          }
          if (command.type === 'status') { if (latestState) broadcast(latestState); return }
          const initialFrameUrl = seedFrame(command)
          if (initialFrameUrl) setFrameUrl(initialFrameUrl)
          if (frameReady) forward(command)
          else pending.push(command)
        })
        context.start({
          disableIdleTimeout: true,
          customNamespaces: { [CAST_NAMESPACE]: framework.system.MessageType.JSON, [MIRROR_NAMESPACE]: framework.system.MessageType.JSON },
        })
      } catch (error) { reportError(error) }
    }
    const state = (event: MessageEvent) => {
      if (mirroring.current) return
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow
        || event.data?.channel !== CAST_NAMESPACE || event.data.state?.version !== 1
        || event.data.state?.type !== 'state') return
      latestState = event.data.state as CastStatus
      lastFrameStateAt = Date.now()
      frameReady = true
      for (const command of pending.splice(0)) forward(command)
      broadcast(latestState)
    }
    addEventListener('message', state)
    document.head.appendChild(script)
    const diagnosticTimer = diagnostics ? setInterval(() => {
      if (mirroring.current) return
      const snapshot = {
        heartbeat: ++heartbeat, at: new Date().toISOString(), systemReady, frameReady,
        receiverDocumentState: document.readyState, receiverHidden: document.hidden,
        stateAgeMs: lastFrameStateAt ? Date.now() - lastFrameStateAt : null,
        pendingCommands: pending.length, lastCommand, frame: inspectFrame(), errors: [...errors],
      }
      // Independent of the scene's timer: a stale iframe state remains stale and
      // ready:false, while the sender can distinguish it from a dead CAF channel.
      broadcast({ ...(latestState ?? { version: 1, type: 'state', station: '', playing: false,
        requested: false, loading: false, volume: 0, muted: true, ready: false }), diagnostics: snapshot } as CastStatus)
      console.info('[Cruise Cast receiver diagnostics]', JSON.stringify(snapshot))
    }, 1000) : null
    return () => {
      disposed = true
      mirrorSignals.dispose()
      mirrorSend.current = () => {}; resetLegacy.current = () => {}
      removeEventListener('message', state)
      script.remove()
      if (diagnosticTimer) clearInterval(diagnosticTimer)
      removeParentDiagnostics?.()
      removeFrameDiagnostics?.()
      if (systemReady) context?.stop()
    }
  }, [])
  return <>
    {createElement('cast-media-player', { style: { display: 'none' } })}
    {!mirrorMode && frameUrl && <iframe ref={frame} title="Buena Onda Cruise TV" src={frameUrl}
      allow="autoplay; fullscreen" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0 }} />}
    {mirrorMode && <>
      <video ref={mirror.videoRef} autoPlay playsInline aria-label="Live Cruise from your phone"
        onPlaying={mirror.onVideoPlaying} onTimeUpdate={mirror.onVideoTimeUpdate} onError={mirror.onVideoError}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
      {mirror.state !== 'playing' && <div role="status" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: '8vw', background: '#101d20', color: '#eee5d3', font: '28px/1.5 Georgia, serif', textAlign: 'center' }}>
        <div><p style={{ fontSize: 18, color: '#dba16b' }}>BUENA ONDA CRUISE</p>
          <p>{mirror.state === 'connecting' ? 'Connecting to your live drive…' : mirror.state === 'error' ? mirror.error : 'Your live drive has ended.'}</p>
        </div>
      </div>}
    </>}
  </>
}
