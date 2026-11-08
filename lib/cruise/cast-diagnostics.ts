export type CastDiagnosticReason = 'connected' | 'transport-failed' | 'startup-timeout' | 'disconnected' | 'signal-failed'
const reasons = ['connected', 'transport-failed', 'startup-timeout', 'disconnected', 'signal-failed'] as const
const states = ['new', 'connecting', 'connected', 'disconnected', 'failed', 'closed', 'checking', 'completed', 'gathering', 'complete', 'stable', 'have-local-offer', 'have-remote-offer', 'have-local-pranswer', 'have-remote-pranswer', 'unknown']
const counterKeys = ['localHost', 'localSrflx', 'localRelay', 'remoteHost', 'remoteSrflx', 'remoteRelay', 'localMdns', 'remoteMdns', 'localIpv6', 'remoteIpv6', 'udp', 'tcp', 'pairs', 'succeeded', 'failed', 'requests', 'responses', 'sentCandidates', 'receivedCandidates', 'elapsedMs'] as const
export type CastDiagnostic = {
  version: 1; id: string; side: 'sender' | 'receiver'; reason: CastDiagnosticReason
  connection: string; ice: string; gathering: string; signaling: string; dtls: string
  localDescription: boolean; remoteDescription: boolean; hidden: boolean
  platform: 'android' | 'ios' | 'desktop' | 'unknown'; chromeMajor: number
  counters: Partial<Record<typeof counterKeys[number], number>>
}

/** Reconstruct the small allowlist: never forward SDP, IPs, URLs, ICE credentials or raw UA. */
export function parseCastDiagnostic(input: unknown): CastDiagnostic | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  if (value.version !== 1 || typeof value.id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.id)
    || !['sender', 'receiver'].includes(String(value.side)) || !reasons.includes(value.reason as CastDiagnosticReason)) return null
  const output = { version: 1, id: value.id, side: value.side, reason: value.reason } as CastDiagnostic
  for (const key of ['connection', 'ice', 'gathering', 'signaling', 'dtls'] as const) {
    if (typeof value[key] !== 'string' || !states.includes(value[key])) return null
    output[key] = value[key]
  }
  for (const key of ['localDescription', 'remoteDescription', 'hidden'] as const) {
    if (typeof value[key] !== 'boolean') return null
    output[key] = value[key]
  }
  if (!['android', 'ios', 'desktop', 'unknown'].includes(String(value.platform))
    || !Number.isInteger(value.chromeMajor) || (value.chromeMajor as number) < 0 || (value.chromeMajor as number) > 1000) return null
  output.platform = value.platform as CastDiagnostic['platform']; output.chromeMajor = value.chromeMajor as number
  output.counters = {}
  const counters = value.counters as Record<string, unknown> | undefined
  if (counters && typeof counters === 'object') for (const key of counterKeys) {
    const number = counters[key]
    if (number === undefined) continue
    if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 1e9) return null
    output.counters[key] = Math.floor(number)
  }
  return output
}

export async function collectCastDiagnostic(pc: RTCPeerConnection, values: Pick<CastDiagnostic, 'id' | 'side' | 'reason'> & { counters?: CastDiagnostic['counters'] }): Promise<CastDiagnostic> {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const result: CastDiagnostic = {
    version: 1, ...values, counters: { ...values.counters },
    connection: pc.connectionState, ice: pc.iceConnectionState, gathering: pc.iceGatheringState,
    signaling: pc.signalingState, dtls: 'unknown', localDescription: !!pc.localDescription,
    remoteDescription: !!pc.remoteDescription, hidden: typeof document !== 'undefined' && document.hidden,
    platform: /Android/i.test(ua) ? 'android' : /iPhone|iPad/i.test(ua) ? 'ios' : ua ? 'desktop' : 'unknown',
    chromeMajor: Number(/(?:Chrome|Chromium)\/(\d+)/.exec(ua)?.[1] || 0),
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const stats = await Promise.race([pc.getStats(), new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 300) })])
    const add = (key: typeof counterKeys[number], amount = 1) => { result.counters[key] = (result.counters[key] || 0) + amount }
    stats?.forEach(entry => {
      if (entry.type === 'transport' && states.includes(entry.dtlsState)) result.dtls = entry.dtlsState
      if (entry.type === 'local-candidate' || entry.type === 'remote-candidate') {
        const local = entry.type === 'local-candidate'
        if (entry.candidateType === 'host') add(local ? 'localHost' : 'remoteHost')
        if (entry.candidateType === 'srflx') add(local ? 'localSrflx' : 'remoteSrflx')
        if (entry.candidateType === 'relay') add(local ? 'localRelay' : 'remoteRelay')
        const address = String(entry.address || entry.ip || '')
        if (address.endsWith('.local')) add(local ? 'localMdns' : 'remoteMdns')
        if (address.includes(':')) add(local ? 'localIpv6' : 'remoteIpv6')
        if (entry.protocol === 'udp' || entry.protocol === 'tcp') add(entry.protocol)
      }
      if (entry.type === 'candidate-pair') {
        add('pairs'); if (entry.state === 'succeeded' || entry.state === 'failed') add(entry.state)
        if (Number.isFinite(entry.requestsSent)) add('requests', Math.max(0, entry.requestsSent))
        if (Number.isFinite(entry.responsesReceived)) add('responses', Math.max(0, entry.responsesReceived))
      }
    })
  } catch { /* Preserve the connection state when the browser has already closed its stats provider. */ }
  finally { clearTimeout(timer) }
  return result
}

export function uploadCastDiagnostic(value: CastDiagnostic) {
  const safe = parseCastDiagnostic(value)
  if (!safe || typeof fetch === 'undefined') return
  // Existing server logs only; no analytics account, database, or persistent device identifier.
  void fetch('/api/cruise/cast-diagnostics', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(safe), keepalive: true, credentials: 'same-origin' }).catch(() => {})
}
