import test from 'node:test'
import assert from 'node:assert/strict'

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

test('live casting owns its capture, signaling order, and asynchronous attempts', async t => {
  const saved = new Map(['window', 'navigator', 'RTCPeerConnection', 'HTMLCanvasElement'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  const oldApp = process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID
  process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID = 'test-live-app'
  let sdkEvent: (event: { sessionState: string; session?: FakeSession }) => void = () => {}
  let current: FakeSession | null = null, selected: FakeSession
  let picker: (() => Promise<void>) | null = null
  let offerGate: ReturnType<typeof deferred<void>> | null = null
  const peers: FakePeer[] = []
  class FakeSession {
    messages: any[] = []
    listener: ((namespace: string, data: unknown) => void) | null = null
    constructor(readonly id: string) {}
    getSessionId() { return this.id }
    getCastDevice() { return { friendlyName: this.id } }
    addMessageListener(_n: string, fn: typeof this.listener) { this.listener = fn }
    removeMessageListener() { this.listener = null }
    async sendMessage(_n: string, value: any) { this.messages.push(value); if (value.type === 'offer' && offerGate) await offerGate.promise }
    emit(value: object) { this.listener?.('', { version: 1, id: this.messages.find(m => m.type === 'offer')?.id, ...value }) }
  }
  class FakePeer {
    connectionState = 'new'
    remoteDescription: any = null
    localDescription: any = null
    onicecandidate: ((event: any) => void) | null = null
    onconnectionstatechange: (() => void) | null = null
    ice: unknown[] = []
    closed = false
    constructor() { peers.push(this) }
    addTrack() { return { getParameters: () => ({}), setParameters: async () => {} } }
    async createOffer() { return { type: 'offer', sdp: 'v=0\r\no=offer' } }
    async setLocalDescription(value: unknown) {
      this.localDescription = value
      this.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: 'local-candidate', sdpMid: '0' }) } })
      this.onicecandidate?.({ candidate: null })
    }
    async setRemoteDescription(value: unknown) { this.remoteDescription = value }
    async addIceCandidate(value: unknown) { this.ice.push(value) }
    close() { this.closed = true; this.connectionState = 'closed'; this.onconnectionstatechange?.() }
    change(value: string) { this.connectionState = value; this.onconnectionstatechange?.() }
  }
  selected = new FakeSession('first')
  const context = {
    setOptions: () => {}, getCurrentSession: () => current,
    addEventListener: (_name: string, fn: typeof sdkEvent) => { sdkEvent = fn },
    requestSession: async () => { if (picker) await picker(); else current = selected },
    endCurrentSession: () => { const ended = current; current = null; sdkEvent({ sessionState: 'SESSION_ENDED', session: ended || undefined }) },
  }
  const win = Object.assign(new EventTarget(), {
    isSecureContext: true, location: { search: '' },
    cast: { framework: { CastContext: { getInstance: () => context }, CastContextEventType: { SESSION_STATE_CHANGED: 'session' } } },
    chrome: { cast: { AutoJoinPolicy: { ORIGIN_SCOPED: 'origin' } } },
  })
  for (const [key, value] of Object.entries({ window: win, navigator: { userAgent: 'Chrome Android' }, RTCPeerConnection: FakePeer, HTMLCanvasElement: class { captureStream() {} } })) {
    Object.defineProperty(globalThis, key, { configurable: true, value })
  }
  const cast = await import('../lib/cruise/live-cast')
  const makeSource = () => {
    const calls = { disposed: 0, silent: [] as boolean[] }
    return { calls, stream: { getTracks: () => [{ kind: 'video', contentHint: '' }] } as unknown as MediaStream,
      setLocalSilent: (value: boolean) => { calls.silent.push(value) }, dispose: () => { calls.disposed++ } }
  }
  try {
    assert.equal(await cast.prepareLiveCast(), true)
    await t.test('offer precedes all local ICE, including synchronous candidates; null remote ICE is retained', async () => {
      const source = makeSource(); const unregister = cast.registerLiveCastSource(async () => source)
      selected = new FakeSession('ordered'); offerGate = deferred<void>()
      const start = cast.startLiveCast(); await flush()
      assert.deepEqual(selected.messages.map(m => m.type), ['offer'])
      offerGate.resolve(); await start; await flush(); offerGate = null
      assert.deepEqual(selected.messages.map(m => m.type), ['offer', 'ice', 'ice'])
      assert.equal(selected.messages[2].candidate, null)
      selected.emit({ type: 'ice', candidate: null }); selected.emit({ type: 'answer', sdp: 'v=0\r\no=answer' })
      selected.emit({ type: 'state', state: 'playing' }); await flush()
      assert.equal(cast.readLiveCast().phase, 'playing')
      assert.deepEqual(peers.at(-1)!.ice, [undefined])
      assert.deepEqual(source.calls.silent, [true])
      cast.stopLiveCast(); assert.equal(source.calls.disposed, 1); assert.deepEqual(source.calls.silent, [true, false])
      unregister()
    })
    await t.test('picker cancellation returns promptly, then disposes a late capture once', async () => {
      const capture = deferred<ReturnType<typeof makeSource>>(), source = makeSource()
      const unregister = cast.registerLiveCastSource(() => capture.promise)
      picker = async () => { throw { code: 'cancel' } }
      await cast.startLiveCast(); assert.equal(cast.readLiveCast().phase, 'idle')
      capture.resolve(source); await flush(); assert.equal(source.calls.disposed, 1)
      picker = null; unregister()
    })
    await t.test('capture errors before capture resolves end only their attempt and keep the error', async () => {
      const capture = deferred<ReturnType<typeof makeSource>>(), source = makeSource()
      const unregister = cast.registerLiveCastSource(() => capture.promise)
      selected = new FakeSession('audio-failure')
      const start = cast.startLiveCast(); await flush()
      win.dispatchEvent(new CustomEvent('cruise:mirror-audio-error', { detail: { message: 'Station capture failed' } }))
      await start
      assert.equal(cast.readLiveCast().error, 'Station capture failed')
      sdkEvent({ sessionState: 'SESSION_ENDED', session: selected })
      assert.equal(cast.readLiveCast().error, 'Station capture failed')
      capture.resolve(source); await flush(); assert.equal(source.calls.disposed, 1)
      unregister()
    })
    await t.test('a stopped picker and unrelated SDK terminal events cannot stop a later cast', async () => {
      const first = new FakeSession('stopped-picker'), gate = deferred<void>()
      const firstSource = makeSource(); let source = firstSource
      const unregister = cast.registerLiveCastSource(async () => source)
      picker = async () => { await gate.promise; current = first }
      const oldStart = cast.startLiveCast(); await flush(); cast.stopLiveCast(); await oldStart
      selected = new FakeSession('new-cast'); picker = null; source = makeSource()
      await cast.startLiveCast(); const newPeer = peers.at(-1)!
      sdkEvent({ sessionState: 'SESSION_ENDED', session: first })
      gate.resolve(); await flush()
      assert.equal(cast.readLiveCast().phase, 'connecting'); assert.equal(newPeer.closed, false)
      assert.equal(source.calls.disposed, 0); assert.equal(firstSource.calls.disposed, 1)
      current = selected; unregister(); assert.equal(source.calls.disposed, 1)
    })
    await t.test('a late wake lock is released and a playing cast reacquires it on return', async () => {
      const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
      const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
      Object.defineProperty(globalThis, 'document', { configurable: true, value: doc })
      const locks: Array<EventTarget & { released: boolean; release: () => Promise<void> }> = []
      const makeLock = () => {
        const lock = Object.assign(new EventTarget(), { released: false, release: async () => {
          lock.released = true; lock.dispatchEvent(new Event('release'))
        } })
        locks.push(lock); return lock
      }
      let gate: ReturnType<typeof deferred<ReturnType<typeof makeLock>>> | null = deferred()
      let requests = 0
      ;(navigator as any).wakeLock = { request: () => { requests++; return gate ? gate.promise : Promise.resolve(makeLock()) } }
      const unregister = cast.registerLiveCastSource(async () => makeSource())
      try {
        selected = new FakeSession('pending-wake'); await cast.startLiveCast()
        selected.emit({ type: 'answer', sdp: 'v=0\r\no=answer' }); selected.emit({ type: 'state', state: 'playing' }); await flush()
        assert.equal(requests, 1)
        cast.stopLiveCast(); gate.resolve(makeLock()); await flush()
        assert.equal(locks[0].released, true)
        gate = null; selected = new FakeSession('reacquire-wake'); await cast.startLiveCast()
        selected.emit({ type: 'answer', sdp: 'v=0\r\no=answer' }); selected.emit({ type: 'state', state: 'playing' }); await flush()
        assert.equal(requests, 2)
        doc.visibilityState = 'hidden'; await locks[1].release()
        doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange')); await flush()
        assert.equal(requests, 3)
        cast.stopLiveCast(); assert.equal(locks[2].released, true)
      } finally {
        unregister(); delete (navigator as any).wakeLock
        if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument); else delete (globalThis as any).document
      }
    })
    await t.test('temporary disconnection gets ten seconds and reconnect cancels its timer', async () => {
      t.mock.timers.enable({ apis: ['setTimeout'] })
      const source = makeSource(), unregister = cast.registerLiveCastSource(async () => source)
      try {
        selected = new FakeSession('grace'); await cast.startLiveCast(); await flush()
        selected.emit({ type: 'answer', sdp: 'v=0\r\no=answer' }); selected.emit({ type: 'state', state: 'playing' }); await flush()
        const peer = peers.at(-1)!
        peer.change('disconnected'); t.mock.timers.tick(9000); assert.equal(cast.readLiveCast().phase, 'playing')
        peer.change('connected'); t.mock.timers.tick(11000); assert.equal(cast.readLiveCast().phase, 'playing')
        peer.change('disconnected'); t.mock.timers.tick(10000); assert.equal(cast.readLiveCast().phase, 'error')
        assert.equal(source.calls.disposed, 1)
        assert.equal(source.calls.silent.at(-1), false)
      } finally { unregister(); t.mock.timers.reset() }
    })
  } finally {
    cast.stopLiveCast()
    if (oldApp === undefined) delete process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID; else process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID = oldApp
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]
    }
  }
})
