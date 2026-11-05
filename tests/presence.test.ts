import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countPresence } from '../components/real-miami/presence/usePresence'

test('empty / null state counts zero', () => {
  assert.deepEqual(countPresence({}), { sessions: 0, visitors: 0 })
  assert.deepEqual(countPresence(null), { sessions: 0, visitors: 0 })
})

test('single tab is one session and one visitor', () => {
  assert.deepEqual(countPresence({ t1: [{ visitor: 'a' }] }), { sessions: 1, visitors: 1 })
})

test('two tabs of the same browser dedupe to one visitor', () => {
  assert.deepEqual(countPresence({ t1: [{ visitor: 'a' }], t2: [{ visitor: 'a' }] }), { sessions: 2, visitors: 1 })
})

test('different browsers are different visitors', () => {
  assert.deepEqual(
    countPresence({ t1: [{ visitor: 'a' }], t2: [{ visitor: 'b' }], t3: [{ visitor: 'b' }] }),
    { sessions: 3, visitors: 2 },
  )
})

test('missing visitor id falls back to the tab key, never merged or dropped', () => {
  assert.deepEqual(countPresence({ t1: [{}], t2: [{ visitor: '' }], t3: [{ visitor: 5 }] }), { sessions: 3, visitors: 3 })
})

test('keys with no metas are ignored; multiple metas on one key stay one session', () => {
  assert.deepEqual(
    countPresence({ t1: [], t2: undefined, t3: [{ visitor: 'a' }, { visitor: 'b' }] }),
    { sessions: 1, visitors: 2 },
  )
})
