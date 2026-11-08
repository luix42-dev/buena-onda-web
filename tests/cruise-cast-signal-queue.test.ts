import test from 'node:test'
import assert from 'node:assert/strict'
import { createCastSignalQueue } from '../lib/cruise/cast-signal-queue'
import type { MirrorMessage } from '../lib/cruise/mirror-protocol'

const id = '11111111-1111-4111-8111-111111111111', nextId = '22222222-2222-4222-8222-222222222222'
const connecting = (value = id): MirrorMessage => ({ version: 1, id: value, type: 'state', state: 'connecting' })
const answer = (value = id): MirrorMessage => ({ version: 1, id: value, type: 'answer', sdp: 'v=0\r\n' })
const ice = (value = id): MirrorMessage => ({ version: 1, id: value, type: 'ice', candidate: null })

test('an early offer keeps connecting, answer, and ICE until CAF and sender are ready, exactly once', () => {
  let systemReady = false, senderConnected = false
  const delivered: MirrorMessage[] = []
  const queue = createCastSignalQueue({ ready: () => systemReady && senderConnected,
    send: (_sender, message) => { delivered.push(message) }, onFailure: assert.fail })
  queue.send('pixel', connecting()); queue.send('pixel', answer()); queue.send('pixel', ice())
  assert.deepEqual(delivered, [])
  systemReady = true; queue.flush()
  assert.deepEqual(delivered, [], 'READY alone cannot send before a sender connects')
  senderConnected = true; queue.flush(); queue.flush()
  assert.deepEqual((delivered as MirrorMessage[]).map(message => message.type), ['state', 'answer', 'ice'])
  queue.dispose()
})

test('a temporary CAF send failure retries without overtaking or duplicating messages', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const delivered: string[] = []
  let attempts = 0
  const queue = createCastSignalQueue({ ready: () => true,
    send: (_sender, message) => { if (attempts++ < 2) throw new Error('Channel starting'); delivered.push(message.type) },
    onFailure: assert.fail })
  queue.send('pixel', connecting()); queue.send('pixel', answer()); queue.send('pixel', ice())
  t.mock.timers.tick(150); assert.deepEqual(delivered, [])
  t.mock.timers.tick(300)
  assert.deepEqual(delivered, ['state', 'answer', 'ice'])
  queue.flush(); t.mock.timers.tick(2000)
  assert.equal(attempts, 5)
  queue.dispose()
})

test('replacing or disconnecting a session removes its queued signals and retry work', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let ready = false
  const delivered: Array<{ sender: string; message: MirrorMessage }> = []
  const queue = createCastSignalQueue({ ready: () => ready,
    send: (sender, message) => { delivered.push({ sender, message }) }, onFailure: assert.fail })
  queue.send('pixel', connecting()); queue.send('pixel', answer())
  queue.send('pixel', connecting(nextId)); queue.send('pixel', answer(nextId))
  queue.send('pixel', ice()) // A late signal from the replaced peer.
  ready = true; queue.flush()
  assert.deepEqual(delivered.map(item => item.message.id), [nextId, nextId])
  ready = false; queue.send('pixel', ice(nextId)); queue.disconnect('pixel')
  ready = true; queue.flush(); t.mock.timers.tick(2000)
  assert.equal(delivered.length, 2)
  queue.dispose(); queue.send('pixel', connecting()); queue.flush()
  assert.equal(delivered.length, 2)
})

test('rejecting another sender preserves the active owner and its answer', () => {
  let ready = false
  const delivered: string[] = []
  const queue = createCastSignalQueue({ ready: () => ready,
    send: (sender, message) => { delivered.push(`${sender}:${message.type}`) }, onFailure: assert.fail })
  queue.send('pixel', connecting())
  queue.send('other', { version: 1, id: nextId, type: 'state', state: 'error', error: 'TV busy' })
  queue.send('pixel', answer())
  ready = true; queue.flush()
  assert.deepEqual(delivered, ['pixel:state', 'other:state', 'pixel:answer'])
  queue.dispose()
})

test('permanent send failures and unavailable channels have bounded work and storage', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const errors: string[] = []
  let attempts = 0, ready = true
  const queue = createCastSignalQueue({ ready: () => ready,
    send: () => { attempts++; throw new Error('Closed channel') }, onFailure: reason => { errors.push(reason) } })
  queue.send('pixel', connecting()); queue.send('pixel', answer())
  t.mock.timers.tick(150); t.mock.timers.tick(300); t.mock.timers.tick(600); t.mock.timers.tick(10000)
  assert.equal(attempts, 4); assert.equal(errors.length, 1)
  queue.send('pixel', ice()); queue.flush()
  assert.equal(attempts, 4, 'failed sessions cannot queue more work')
  ready = false; queue.send('pixel', connecting(nextId))
  for (let index = 0; index < 300; index++) queue.send('pixel', ice(nextId))
  assert.equal(errors.length, 2)
  ready = true; queue.flush()
  assert.equal(attempts, 4, 'overflow retires the scope and removes pending messages')
  queue.dispose()
})
