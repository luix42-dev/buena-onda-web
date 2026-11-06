import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createStudioSession, STUDIO_COOKIE, STUDIO_SESSION_SECONDS } from '../lib/studio-auth'

test('standalone Studio server-page guard stops private reads without middleware', async () => {
  const headersModule = require('next/headers')
  const navigationPath = require.resolve('next/navigation')
  const navigationModule = require('next/navigation')
  const savedPassword = process.env.STUDIO_PASSWORD
  let token: string | undefined
  let privateReads = 0
  const redirected = new Error('TEST navigation redirect')
  const cookiesMock = mock.method(headersModule, 'cookies', async () => ({
    get: (name: string) => name === STUDIO_COOKIE && token ? { name, value: token } : undefined,
  }))
  // Next navigation exports getters. Replace the cached adapter before loading
  // the real guard; production auth/session verification itself stays intact.
  require.cache[navigationPath]!.exports = {
    ...navigationModule,
    redirect: (destination: string) => {
      assert.equal(destination, '/studio/login')
      throw redirected
    },
  }
  try {
    const { requireStudioPage } = require('../lib/supabase/studio') as typeof import('../lib/supabase/studio')
    const renderPrivatePage = async () => { await requireStudioPage(); privateReads++; return 'private data' }
    process.env.STUDIO_PASSWORD = 'server-page-fixture-password'
    const valid = await createStudioSession()
    const expired = await createStudioSession(Date.now() - (STUDIO_SESSION_SECONDS + 1) * 1000)
    for (const invalid of [undefined, process.env.STUDIO_PASSWORD, `${valid}tampered`, expired]) {
      token = invalid
      await assert.rejects(renderPrivatePage(), error => error === redirected)
      assert.equal(privateReads, 0)
    }
    token = valid
    delete process.env.STUDIO_PASSWORD
    await assert.rejects(renderPrivatePage(), error => error === redirected)
    assert.equal(privateReads, 0)
    process.env.STUDIO_PASSWORD = 'server-page-fixture-password'
    assert.equal(await renderPrivatePage(), 'private data')
    assert.equal(privateReads, 1)
  } finally {
    cookiesMock.mock.restore()
    require.cache[navigationPath]!.exports = navigationModule
    delete require.cache[require.resolve('../lib/supabase/studio')]
    if (savedPassword === undefined) delete process.env.STUDIO_PASSWORD
    else process.env.STUDIO_PASSWORD = savedPassword
  }
})
