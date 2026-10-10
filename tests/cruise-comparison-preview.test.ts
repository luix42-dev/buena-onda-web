import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

test('comparison deployment permits scene/radio reads but blocks writes and other APIs', async () => {
  const saved = process.env.CRUISE_COMPARISON_PREVIEW
  process.env.CRUISE_COMPARISON_PREVIEW = '1'
  try {
    for (const path of ['/cruise', '/cruise/miami-test', '/cruise/miami-test/nightdrive', '/api/radio/tracks']) {
      assert.equal((await middleware(new NextRequest(`https://preview.example${path}`))).headers.get('x-middleware-next'), '1')
    }
    for (const path of ['/api/radio/tracks', '/api/cruise/plots/visit', '/api/cruise/plots/claim', '/studio/auth/start', '/cruise']) {
      assert.equal((await middleware(new NextRequest(`https://preview.example${path}`, { method: 'POST' }))).status, 403)
    }
    for (const path of ['/api/cron/reconcile-checkouts', '/api/admin/cruise/tracks']) {
      assert.equal((await middleware(new NextRequest(`https://preview.example${path}`))).status, 403)
    }
    // A failed read preserves the client's local geometry seed; an empty successful
    // result would remove structural billboard records required by Miami's scene.
    assert.equal((await middleware(new NextRequest('https://preview.example/api/cruise/plots'))).status, 403)
    assert.equal((await middleware(new NextRequest('https://preview.example/studio'))).status, 404)
  } finally {
    if (saved === undefined) delete process.env.CRUISE_COMPARISON_PREVIEW
    else process.env.CRUISE_COMPARISON_PREVIEW = saved
  }
})
