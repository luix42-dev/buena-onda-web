import test from 'node:test'
import assert from 'node:assert/strict'
import type { CastCommand, CastStatus, CastConnectionState } from '../lib/cruise/google-cast'

test('Cast sender ownership and session lifecycle', async t => {
  process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID = 'test-only-app'
  process.env.NEXT_PUBLIC_CRUISE_CAST_STATIONS = 'jolt-radio,nightride'
  let cancelled = false
  let current: typeof receiver | null = null
  let changed: (event?: { sessionState?: string }) => void = () => {}
  let listener: ((namespace: string, data: string) => void) | null = null
  let endRequests = 0
  let ended = 0
  let localResumes = 0
  let pickerHook: (() => Promise<void>) | null = null
  let pickerRequests = 0
  let contextRemovals = 0
  let messageRemovals = 0
  const sent: CastCommand[] = []
  const reported: CastStatus[] = []
  const connections: CastConnectionState[] = []
  const order: string[] = []
  const receiver = {
    addMessageListener: (_namespace: string, fn: typeof listener) => { listener = fn },
    removeMessageListener: () => { messageRemovals++; listener = null },
    sendMessage: async (_namespace: string, message: CastCommand) => {
      sent.push(message)
      if (message.type === 'volume' && message.muted === false) order.push('unmute-tv')
    },
    getCastDevice: () => ({ friendlyName: 'Test TV' }),
  }
  const context = {
    setOptions: () => {},
    getCurrentSession: () => current,
    addEventListener: (_event: string, fn: typeof changed) => { changed = fn },
    removeEventListener: () => { contextRemovals++ },
    requestSession: async () => {
      pickerRequests++
      if (cancelled) throw { code: 'cancel' }
      if (pickerHook) await pickerHook()
      current = receiver
      changed({ sessionState: 'SESSION_STARTED' })
    },
    endCurrentSession: () => { endRequests++; changed({ sessionState: 'SESSION_ENDING' }) },
  }
  const win = Object.assign(new EventTarget(), {
    cast: { framework: { CastContext: { getInstance: () => context }, CastContextEventType: { SESSION_STATE_CHANGED: 'session' } } },
    chrome: { cast: { AutoJoinPolicy: { ORIGIN_SCOPED: 'origin' } } },
  })
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
  const cast = await import('../lib/cruise/google-cast')
  await cast.loadCastSdk()
  const cleanup = cast.attachCast(s => reported.push(s), () => ended++, s => connections.push(s))
  win.addEventListener('cruise:cast-state', () => order.push('pause-local'))
  win.addEventListener('cruise:cast-ended', () => localResumes++)
  const emit = (values: Partial<CastStatus> = {}) => listener?.('', JSON.stringify({
    version: 1, type: 'state', ready: true, playing: true, requested: true, loading: false,
    station: 'jolt-radio', volume: .6, muted: true, ...values,
  }))
  const latestSync = () => sent.filter(m => m.type === 'sync').at(-1)!
  const end = () => { current = null; changed({ sessionState: 'SESSION_ENDED' }) }
  const connect = async (playing = true) => {
    await cast.requestCast({ type: 'sync', station: 'jolt-radio', playing, volume: .6, muted: false })
    const sync = latestSync()
    emit({ playing, requested: playing, ackRequestId: sync.requestId, appliedSequence: sync.sequence })
    return sync
  }

  try {
    await t.test('native picker cancellation leaves local playback and station untouched', async () => {
      cancelled = true
      assert.equal(await cast.requestCast({ type: 'sync', station: 'jolt-radio' }), false)
      assert.equal(cast.castIsRemote(), false)
      assert.equal(sent.length, 0)
      assert.equal(localResumes, 0)
      assert.equal(connections.at(-1), 'disconnected')
      cancelled = false
    })

    await t.test('ready:false and stale statuses do not complete the requested handoff', async () => {
      await cast.requestCast({ type: 'sync', station: 'jolt-radio', playing: true, volume: .6, muted: false })
      const sync = latestSync()
      assert.equal(sync.muted, true)
      assert(sync.requestId)
      emit({ ready: false, playing: false, ackRequestId: sync.requestId })
      assert.equal(connections.at(-1), 'connecting')
      emit({ ackRequestId: 'older-request' })
      emit({ ackRequestId: sync.requestId, station: 'nightride' })
      emit({ ackRequestId: sync.requestId, playing: false, requested: true, loading: true })
      emit({ ackRequestId: sync.requestId, muted: false })
      assert.equal(cast.castIsRemote(), false)
      assert.equal(order.length, 0)
      emit({ ackRequestId: sync.requestId, appliedSequence: sync.sequence })
      assert.equal(cast.castIsRemote(), true)
      assert.equal(connections.at(-1), 'connected')
      assert.deepEqual(order, ['pause-local', 'unmute-tv'])
      assert.equal(reported.at(-1)?.muted, false, 'temporary receiver mute must not overwrite saved listener mute')
      assert.equal(reported.at(-1)?.volume, .6)
      emit({ ackRequestId: sync.requestId, muted: true })
      assert.equal(reported.at(-1)?.muted, false, 'retain requested mute until TV confirms restore')
      emit({ ackRequestId: sync.requestId, muted: false })
      assert.equal(cast.castDeviceName(), 'Test TV')
    })

    await t.test('rapid station requests discard delayed labels from superseded request acknowledgements', () => {
      assert.equal(cast.sendCast({ type: 'station', station: 'nightride' }), true)
      const older = sent.at(-1)!
      assert.equal(cast.sendCast({ type: 'station', station: 'jolt-radio' }), true)
      const latest = sent.at(-1)!
      const before = reported.length
      emit({ station: 'nightride', ackRequestId: older.requestId, appliedSequence: older.sequence, muted: false })
      assert.equal(reported.length, before)
      emit({ station: 'jolt-radio', ackRequestId: latest.requestId, appliedSequence: latest.sequence, muted: false })
      assert.equal(reported.at(-1)?.station, 'jolt-radio')
      emit({ station: 'nightride', ackRequestId: older.requestId, appliedSequence: older.sequence, muted: false })
      assert.equal(reported.at(-1)?.station, 'jolt-radio')
      assert.equal(cast.sendCast({ type: 'station', station: 'not-validated' }), false)
    })

    await t.test('asynchronous disconnect clears UI once and resumes local only after TV session ends', () => {
      const beforeEnded = ended
      const beforeResumes = localResumes
      cast.disconnectCast()
      assert.equal(connections.at(-1), 'disconnecting')
      assert.equal(cast.castIsRemote(), true)
      assert.equal(ended, beforeEnded)
      assert.equal(localResumes, beforeResumes)
      assert.equal(cast.sendCast({ type: 'play' }), true, 'do not fall back to local play while TV is disconnecting')
      end()
      assert.equal(connections.at(-1), 'disconnected')
      assert.equal(cast.castIsRemote(), false)
      assert.equal(ended, beforeEnded + 1)
      assert.equal(localResumes, beforeResumes + 1)
      end()
      assert.equal(ended, beforeEnded + 1)
    })

    await t.test('joining an existing paused session preserves receiver playback and volume', () => {
      current = receiver
      changed({ sessionState: 'SESSION_RESUMED' })
      const before = sent.length
      emit({ playing: false, requested: false, muted: false, volume: .37, appliedSequence: 100000 })
      assert.equal(cast.castIsRemote(), true)
      assert.equal(reported.at(-1)?.playing, false)
      assert.equal(reported.at(-1)?.volume, .37)
      assert.equal(sent.length, before, 'rejoin must not reload or mute the receiver')
    })

    await t.test('a new handoff on an existing session still restores the requested mute and volume', async () => {
      const before = sent.length
      await cast.requestCast({ type: 'sync', station: 'jolt-radio', playing: true, volume: .48, muted: false })
      const sync = latestSync()
      emit({ ackRequestId: 'existing-session-state', muted: false, volume: .37 })
      assert.equal(sent.length, before + 1, 'old session state must not acknowledge the new handoff')
      emit({ ackRequestId: sync.requestId, volume: .48, appliedSequence: sync.sequence })
      assert.equal(sent.at(-1)?.type, 'volume')
      assert.equal(sent.at(-1)?.muted, false)
      assert.equal(sent.at(-1)?.volume, .48)
      cast.disconnectCast()
      end()
    })

    await t.test('casting while paused waits for acknowledged paused state and stays paused', async () => {
      await connect(false)
      assert.equal(cast.castIsRemote(), true)
      assert.equal(reported.at(-1)?.playing, false)
      assert.equal(sent.at(-1)?.type, 'volume')
      cast.disconnectCast()
      end()
    })

    await t.test('canceling during a pending picker prevents a late selection from starting playback', async () => {
      let resolvePicker: () => void = () => {}
      pickerHook = () => new Promise<void>(resolve => { resolvePicker = resolve })
      const beforeSync = sent.filter(m => m.type === 'sync').length
      const pending = cast.requestCast({ type: 'sync', station: 'jolt-radio', playing: true })
      cast.disconnectCast()
      resolvePicker()
      assert.equal(await pending, false)
      assert.equal(sent.filter(m => m.type === 'sync').length, beforeSync)
      assert.equal(cast.castIsRemote(), false)
      end()
      pickerHook = null
    })

    await t.test('a persistent owner retains rejoin and playback updates when the conditional player unmounts', () => {
      const beforePickers = pickerRequests
      current = receiver
      changed({ sessionState: 'SESSION_RESUMED' })
      const buttonStates: CastStatus[] = []
      const unmountButton = cast.attachCast(state => buttonStates.push(state), () => {})
      emit({ playing: false, requested: false, muted: false, volume: .29, scene: { drive: 'retrowave' } })
      assert.equal(cast.castIsRemote(), true)
      assert.equal(buttonStates.at(-1)?.volume, .29)
      const beforeContextRemovals = contextRemovals
      const beforeMessageRemovals = messageRemovals
      unmountButton()
      assert.equal(contextRemovals, beforeContextRemovals)
      assert.equal(messageRemovals, beforeMessageRemovals)
      emit({ playing: true, requested: true, muted: false, volume: .29 })
      assert.equal(reported.at(-1)?.playing, true, 'garage-level owner continues receiving receiver state')
      assert.equal(pickerRequests, beforePickers, 'observing/rejoining a session must not open a picker')
      cast.disconnectCast()
      end()
    })
    assert(endRequests > 0)
    assert(sent.every((message, index) => index === 0 || message.sequence > sent[index - 1].sequence))
  } finally {
    end()
    cleanup()
    delete (globalThis as any).window
  }
})
